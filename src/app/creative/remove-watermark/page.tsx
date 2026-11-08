"use client";

import * as React from "react";
import Link from "next/link";
import {
  Eraser,
  Upload,
  Download,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Paintbrush,
  CheckCircle2,
  Circle,
  Square,
  Undo2,
  Stamp,
  Target,
  Video,
} from "lucide-react";
import { Button } from "@/design-system/primitives/button";
import { Slider } from "@/design-system/primitives/slider";
import { Card } from "@/design-system/primitives/card";
import { inpaintCanvasRegion } from "@/lib/image/imageProcessing";

type ToolMode = "brush" | "clone" | "circle_stamp" | "box";

export default function RemoveWatermarkPage() {
  const [imageSrc, setImageSrc] = React.useState<string | null>(null);
  const [brushSize, setBrushSize] = React.useState(32);
  const [toolMode, setToolMode] = React.useState<ToolMode>("brush");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [hasInpainted, setHasInpainted] = React.useState(false);
  const [history, setHistory] = React.useState<ImageData[]>([]);

  // Clone Stamp Source state
  const [cloneSource, setCloneSource] = React.useState<{ x: number; y: number } | null>(null);
  const [isPickingSource, setIsPickingSource] = React.useState(false);
  const cloneDragStart = React.useRef<{ x: number; y: number } | null>(null);

  // Cursor circle state
  const [cursor, setCursor] = React.useState<{
    x: number;
    y: number;
    visible: boolean;
    scale: number;
  }>({
    x: 0,
    y: 0,
    visible: false,
    scale: 1,
  });

  const mainCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const originalCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const isPainting = React.useRef(false);
  const lastPoint = React.useRef<{ x: number; y: number } | null>(null);
  const boxStartPoint = React.useRef<{ x: number; y: number } | null>(null);

  // Load image onto canvases
  React.useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const w = Math.min(img.width, 1000);
      const h = (img.height / img.width) * w;

      [mainCanvasRef.current, maskCanvasRef.current, originalCanvasRef.current].forEach((c) => {
        if (c) {
          c.width = w;
          c.height = h;
        }
      });

      const mCtx = mainCanvasRef.current?.getContext("2d");
      mCtx?.drawImage(img, 0, 0, w, h);

      const oCtx = originalCanvasRef.current?.getContext("2d");
      oCtx?.drawImage(img, 0, 0, w, h);

      const maskCtx = maskCanvasRef.current?.getContext("2d");
      maskCtx?.clearRect(0, 0, w, h);
      setHistory([]);
      setCloneSource(null);
    };
  }, [imageSrc]);

  // Keyboard shortcuts [ and ] to adjust circle brush size, Alt for clone pick
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "[") {
        setBrushSize((prev) => Math.max(8, prev - 4));
      } else if (e.key === "]") {
        setBrushSize((prev) => Math.min(100, prev + 4));
      } else if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        handleUndo();
      } else if (e.altKey && toolMode === "clone") {
        setIsPickingSource(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.altKey && isPickingSource) {
        setIsPickingSource(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [history, toolMode, isPickingSource]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setImageSrc(URL.createObjectURL(f));
      setHasInpainted(false);
      setHistory([]);
    }
  };

  // Helper to get exact canvas coordinates scaled to displayed size
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    return {
      canvasX: screenX * scaleX,
      canvasY: screenY * scaleY,
      screenX,
      screenY,
      scaleX,
    };
  };

  // Save current state for Undo (both mask and main canvas)
  const saveSnapshot = () => {
    const main = mainCanvasRef.current;
    if (!main) return;
    const ctx = main.getContext("2d");
    if (!ctx) return;
    try {
      const snap = ctx.getImageData(0, 0, main.width, main.height);
      setHistory((prev) => [...prev.slice(-15), snap]);
    } catch {
      // ignore
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const main = mainCanvasRef.current;
    if (!main) return;
    const ctx = main.getContext("2d");
    if (!ctx) return;

    const prevHistory = [...history];
    const previousSnapshot = prevHistory.pop();
    if (previousSnapshot) {
      ctx.putImageData(previousSnapshot, 0, 0);
      setHistory(prevHistory);
    }
    // Also clear mask
    const mask = maskCanvasRef.current;
    const mCtx = mask?.getContext("2d");
    mCtx?.clearRect(0, 0, mask?.width || 0, mask?.height || 0);
  };

  // Clone Stamp logic with feathered radial alpha blending (Photoshop-grade seamless blending)
  const applyCloneStamp = (targetX: number, targetY: number) => {
    if (!cloneSource || !cloneDragStart.current) return;
    const main = mainCanvasRef.current;
    if (!main) return;
    const ctx = main.getContext("2d");
    if (!ctx) return;

    const offsetX = targetX - cloneDragStart.current.x;
    const offsetY = targetY - cloneDragStart.current.y;
    const srcX = cloneSource.x + offsetX;
    const srcY = cloneSource.y + offsetY;

    const radius = brushSize / 2;

    // Use a temporary scratch canvas to apply feathered radial blending
    const scratch = document.createElement("canvas");
    scratch.width = brushSize;
    scratch.height = brushSize;
    const sCtx = scratch.getContext("2d");
    if (!sCtx) return;

    // 1. Draw sampled region from main canvas
    sCtx.drawImage(
      main,
      srcX - radius,
      srcY - radius,
      brushSize,
      brushSize,
      0,
      0,
      brushSize,
      brushSize
    );

    // 2. Feather the border: 100% solid core with ultra-smooth radial falloff
    sCtx.globalCompositeOperation = "destination-in";
    const grad = sCtx.createRadialGradient(radius, radius, radius * 0.3, radius, radius, radius);
    grad.addColorStop(0, "rgba(0, 0, 0, 1.0)");
    grad.addColorStop(0.7, "rgba(0, 0, 0, 0.75)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0.0)");
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, brushSize, brushSize);

    // 3. Stamp smoothly onto main canvas
    ctx.drawImage(scratch, targetX - radius, targetY - radius);
  };

  // Mouse Move - Update circle cursor position & paint
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    if (!coords) return;

    setCursor({
      x: coords.screenX,
      y: coords.screenY,
      visible: true,
      scale: coords.scaleX,
    });

    if (!isPainting.current) return;

    if (toolMode === "clone") {
      applyCloneStamp(coords.canvasX, coords.canvasY);
      return;
    }

    const mask = maskCanvasRef.current;
    if (!mask) return;
    const ctx = mask.getContext("2d");
    if (!ctx) return;

    if (toolMode === "brush") {
      ctx.fillStyle = "rgba(251, 107, 106, 0.75)";
      ctx.strokeStyle = "rgba(251, 107, 106, 0.75)";
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (lastPoint.current) {
        ctx.beginPath();
        ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
        ctx.lineTo(coords.canvasX, coords.canvasY);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(coords.canvasX, coords.canvasY, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      lastPoint.current = { x: coords.canvasX, y: coords.canvasY };
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    if (!coords) return;

    // If picking clone source (or Alt key held)
    if (toolMode === "clone" && (isPickingSource || e.altKey)) {
      setCloneSource({ x: coords.canvasX, y: coords.canvasY });
      setIsPickingSource(false);
      return;
    }

    saveSnapshot();
    isPainting.current = true;

    if (toolMode === "clone") {
      if (!cloneSource) {
        // Auto pick current point as source if none set
        setCloneSource({ x: coords.canvasX, y: coords.canvasY });
        return;
      }
      cloneDragStart.current = { x: coords.canvasX, y: coords.canvasY };
      applyCloneStamp(coords.canvasX, coords.canvasY);
      return;
    }

    const mask = maskCanvasRef.current;
    if (!mask) return;
    const ctx = mask.getContext("2d");
    if (!ctx) return;

    if (toolMode === "brush") {
      lastPoint.current = { x: coords.canvasX, y: coords.canvasY };
      ctx.fillStyle = "rgba(251, 107, 106, 0.75)";
      ctx.beginPath();
      ctx.arc(coords.canvasX, coords.canvasY, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (toolMode === "circle_stamp") {
      ctx.fillStyle = "rgba(251, 107, 106, 0.75)";
      ctx.beginPath();
      ctx.arc(coords.canvasX, coords.canvasY, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (toolMode === "box") {
      boxStartPoint.current = { x: coords.canvasX, y: coords.canvasY };
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (toolMode === "box" && boxStartPoint.current && isPainting.current) {
      const coords = getCanvasCoords(e);
      if (coords) {
        const mask = maskCanvasRef.current;
        const ctx = mask?.getContext("2d");
        if (ctx) {
          const x = Math.min(boxStartPoint.current.x, coords.canvasX);
          const y = Math.min(boxStartPoint.current.y, coords.canvasY);
          const w = Math.abs(coords.canvasX - boxStartPoint.current.x);
          const h = Math.abs(coords.canvasY - boxStartPoint.current.y);
          ctx.fillStyle = "rgba(251, 107, 106, 0.75)";
          ctx.fillRect(x, y, w, h);
        }
      }
      boxStartPoint.current = null;
    }

    isPainting.current = false;
    lastPoint.current = null;
    cloneDragStart.current = null;
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    if (coords) {
      setCursor({
        x: coords.screenX,
        y: coords.screenY,
        visible: true,
        scale: coords.scaleX,
      });
    }
  };

  const handleMouseLeave = () => {
    setCursor((prev) => ({ ...prev, visible: false }));
    isPainting.current = false;
    lastPoint.current = null;
    boxStartPoint.current = null;
    cloneDragStart.current = null;
  };

  const handleClearMask = () => {
    const mask = maskCanvasRef.current;
    if (mask) {
      const ctx = mask.getContext("2d");
      ctx?.clearRect(0, 0, mask.width, mask.height);
    }
  };

  const handleResetToOriginal = () => {
    const main = mainCanvasRef.current;
    const orig = originalCanvasRef.current;
    if (main && orig) {
      saveSnapshot();
      const mCtx = main.getContext("2d");
      mCtx?.drawImage(orig, 0, 0);
      handleClearMask();
      setHasInpainted(false);
    }
  };

  const handleInpaint = async () => {
    const mainCanvas = mainCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!mainCanvas || !maskCanvas) return;

    saveSnapshot();
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 60));

    const resultCanvas = inpaintCanvasRegion(mainCanvas, maskCanvas);
    const mCtx = mainCanvas.getContext("2d");
    mCtx?.drawImage(resultCanvas, 0, 0);

    const maskCtx = maskCanvas.getContext("2d");
    maskCtx?.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

    setIsProcessing(false);
    setHasInpainted(true);
  };

  const handleExport = () => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `edito_clean_${Date.now()}.png`;
    a.click();
  };

  // Calculate actual pixel size of brush circle displayed on user's screen
  const screenBrushDiameter = Math.max(10, cursor.scale > 0 ? brushSize / cursor.scale : brushSize);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#e5e7eb] dark:border-[#27272a]">
        <div>
          <div className="flex items-center gap-2">
            <Eraser className="h-5 w-5 text-[#fb6b6a]" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-[#f4f4f5]">
              AI Watermark & Object Remover
            </h1>
          </div>
          <p className="text-xs text-[#6b7280] dark:text-[#a1a1aa] mt-0.5">
            Auto Erase with 36-ray directional inpainting, or use <strong>Clone Stamp</strong> to duplicate pristine texture seamlessly.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/creative/remove-video-watermark">
            <Button variant="outline" size="sm" className="h-8 text-xs px-3">
              <Video className="h-3.5 w-3.5 mr-1 text-[#fb6b6a]" />
              Video Watermark Remover
            </Button>
          </Link>

          {imageSrc && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToOriginal}
                className="h-8 text-xs px-3"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset Original
              </Button>
              <Button onClick={handleExport} className="h-8 text-xs px-3 bg-[#fb6b6a] hover:bg-[#e05655] text-white">
                <Download className="h-3 w-3 mr-1" />
                Export Clean Image
              </Button>
            </>
          )}
        </div>
      </div>

      {!imageSrc ? (
        <Card className="max-w-xl mx-auto p-8 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215]">
          <label className="flex flex-col items-center justify-center p-8 rounded-[6px] border border-dashed border-[#d1d5db] dark:border-[#3f3f46] hover:border-[#fb6b6a] dark:hover:border-[#fb6b6a] bg-[#fbfbfb] dark:bg-[#18181c] cursor-pointer transition-colors text-center">
            <Eraser className="h-8 w-8 text-[#fb6b6a] mb-2" />
            <span className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
              Select an image with a watermark to erase
            </span>
            <span className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa] mt-1">
              Supports JPG, PNG, WebP (Zero uploads — runs 100% in your browser)
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Canvas Workspace */}
          <div className="lg:col-span-8">
            <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] flex flex-col items-center justify-center min-h-[460px] overflow-hidden">
              {/* Outer checkerboard container with padding */}
              <div className="canvas-checkerboard p-2 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a]">
                {/* Inner Stage: Zero padding so mainCanvas and maskCanvas are 100% identical */}
                <div
                  ref={containerRef}
                  className="relative inline-block overflow-hidden rounded-[4px] select-none"
                >
                  {/* Clean Base Canvas */}
                  <canvas
                    ref={mainCanvasRef}
                    className="block max-w-full h-auto rounded-[4px]"
                  />

                  {/* Mask Overlay Canvas - Exact 1:1 overlay */}
                  <canvas
                    ref={maskCanvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    className="absolute top-0 left-0 w-full h-full cursor-none block touch-none z-10"
                  />

                  {/* Hidden canvas holding original pristine image */}
                  <canvas ref={originalCanvasRef} className="hidden" />

                  {/* DYNAMIC CIRCLE BRUSH CURSOR OVERLAY */}
                  {cursor.visible && (
                    <div
                      className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
                        isPickingSource
                          ? "border-[#3b82f6] bg-[rgba(59,130,246,0.3)]"
                          : toolMode === "clone"
                          ? "border-[#10b981] bg-[rgba(16,185,129,0.25)]"
                          : "border-[#fb6b6a] bg-[rgba(251,107,106,0.3)]"
                      } shadow-[0_0_0_1.5px_rgba(255,255,255,0.95),0_0_12px_rgba(0,0,0,0.7)] transition-[width,height] duration-75 ease-out z-30`}
                      style={{
                        left: cursor.x,
                        top: cursor.y,
                        width: `${screenBrushDiameter}px`,
                        height: `${screenBrushDiameter}px`,
                      }}
                    >
                      {/* Center Crosshair Target Dot */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_2px_#000]" />
                    </div>
                  )}

                  {/* Clone Source Indicator (shows where we are cloning from) */}
                  {toolMode === "clone" && cloneSource && (
                    <div
                      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-[#10b981] bg-[rgba(16,185,129,0.3)] shadow-[0_0_4px_#000] z-20 flex items-center justify-center text-[8px] text-white font-bold"
                      style={{
                        left: cursor.scale > 0 ? cloneSource.x / cursor.scale : cloneSource.x,
                        top: cursor.scale > 0 ? cloneSource.y / cursor.scale : cloneSource.y,
                      }}
                    >
                      +
                    </div>
                  )}
                </div>
              </div>

              {/* Status Bar */}
              <div className="flex items-center justify-between w-full mt-3 px-2 text-[11px] text-[#6b7280] dark:text-[#a1a1aa] font-mono">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${hasInpainted ? "bg-[#10b981]" : "bg-[#fb6b6a]"}`} />
                  {toolMode === "clone"
                    ? cloneSource
                      ? "Clone Stamp Active: Drag to copy texture"
                      : "Click on clean saree/wood to set source"
                    : hasInpainted
                    ? "Inpainted & Smoothed"
                    : "Brush over watermark"}
                </span>
                <span>[ smaller | ] larger | Ctrl+Z undo</span>
              </div>
            </Card>
          </div>

          {/* Right Toolbar & Controls */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] space-y-4">
              <div className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5] pb-2 border-b border-[#e5e7eb] dark:border-[#27272a] flex items-center justify-between">
                <span>Tool Selection</span>
                <span className="text-[10px] text-[#fb6b6a] font-mono bg-[rgba(251,107,106,0.1)] px-1.5 py-0.5 rounded font-bold">
                  {toolMode.toUpperCase()}
                </span>
              </div>

              {/* Tool Mode Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-[#6b7280] dark:text-[#a1a1aa]">
                  Mode
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    size="sm"
                    variant={toolMode === "brush" ? "default" : "outline"}
                    onClick={() => {
                      setToolMode("brush");
                      setIsPickingSource(false);
                    }}
                    className={`h-8 text-xs ${toolMode === "brush" ? "bg-[#fb6b6a] hover:bg-[#e05655] text-white" : ""}`}
                  >
                    <Paintbrush className="h-3 w-3 mr-1" />
                    AI Erase Brush
                  </Button>
                  <Button
                    size="sm"
                    variant={toolMode === "clone" ? "default" : "outline"}
                    onClick={() => {
                      setToolMode("clone");
                      setIsPickingSource(true);
                    }}
                    className={`h-8 text-xs ${toolMode === "clone" ? "bg-[#10b981] hover:bg-[#059669] text-white" : ""}`}
                  >
                    <Stamp className="h-3 w-3 mr-1" />
                    Clone Stamp
                  </Button>
                  <Button
                    size="sm"
                    variant={toolMode === "circle_stamp" ? "default" : "outline"}
                    onClick={() => {
                      setToolMode("circle_stamp");
                      setIsPickingSource(false);
                    }}
                    className={`h-8 text-xs ${toolMode === "circle_stamp" ? "bg-[#fb6b6a] hover:bg-[#e05655] text-white" : ""}`}
                  >
                    <Circle className="h-3 w-3 mr-1" />
                    Circle Mask
                  </Button>
                  <Button
                    size="sm"
                    variant={toolMode === "box" ? "default" : "outline"}
                    onClick={() => {
                      setToolMode("box");
                      setIsPickingSource(false);
                    }}
                    className={`h-8 text-xs ${toolMode === "box" ? "bg-[#fb6b6a] hover:bg-[#e05655] text-white" : ""}`}
                  >
                    <Square className="h-3 w-3 mr-1" />
                    Box Mask
                  </Button>
                </div>
              </div>

              {/* Clone Stamp Controls */}
              {toolMode === "clone" && (
                <div className="p-2.5 rounded-[6px] border border-[#10b981]/30 bg-[#f0fdf4] dark:bg-[#062c19]/30 text-xs space-y-2">
                  <div className="flex items-center justify-between text-[#047857] dark:text-[#34d399] font-semibold text-[11px]">
                    <span>Photoshop-Style Clone Stamp</span>
                    {cloneSource && <span>Source Set ✓</span>}
                  </div>
                  <p className="text-[10px] text-[#065f46] dark:text-[#a7f3d0] leading-tight">
                    Clean saree ya wood par click karke pattern uthayein, phir watermark par ghumayein. Asli texture 100% copy ho jaega!
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsPickingSource(true)}
                    className="w-full h-7 text-[11px] border-[#10b981] text-[#047857] hover:bg-[#10b981] hover:text-white"
                  >
                    <Target className="h-3 w-3 mr-1" />
                    {isPickingSource ? "Click on Photo to Pick Source..." : "Pick New Source Point"}
                  </Button>
                </div>
              )}

              {/* Circle / Brush Size Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-[#6b7280] dark:text-[#a1a1aa]">
                  <span>Brush Diameter</span>
                  <span className="font-mono text-[#fb6b6a] font-bold">{brushSize}px</span>
                </div>
                <Slider
                  value={[brushSize]}
                  min={8}
                  max={90}
                  step={2}
                  onValueChange={(v) => setBrushSize(v[0])}
                />

                {/* Quick Presets */}
                <div className="flex items-center justify-between gap-1 pt-1">
                  {[16, 28, 42, 64].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setBrushSize(sz)}
                      className={`text-[10px] px-2 py-0.5 rounded border ${
                        brushSize === sz
                          ? "border-[#fb6b6a] bg-[rgba(251,107,106,0.15)] text-[#fb6b6a] font-bold"
                          : "border-[#e5e7eb] dark:border-[#27272a] text-[#71717a] hover:border-[#fb6b6a]"
                      }`}
                    >
                      {sz}px
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons: Undo, Clear */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#e5e7eb] dark:border-[#27272a]">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleUndo}
                  disabled={history.length === 0}
                  className="h-8 text-xs"
                >
                  <Undo2 className="h-3 w-3 mr-1" />
                  Undo ({history.length})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClearMask}
                  className="h-8 text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Clear Mask
                </Button>
              </div>

              {/* Erase Watermark Button */}
              {toolMode !== "clone" && (
                <Button
                  size="sm"
                  onClick={handleInpaint}
                  disabled={isProcessing}
                  className="w-full h-9 text-xs font-semibold bg-[#fb6b6a] hover:bg-[#e05655] text-white shadow-sm"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  {isProcessing ? "Erasing Smoothly..." : "Erase Selected Watermark"}
                </Button>
              )}

              <div className="p-2.5 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] text-[11px] text-[#6b7280] dark:text-[#a1a1aa] leading-normal space-y-2">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 text-[#10b981] shrink-0 mt-0.5" />
                  <span>
                    <strong>Seamless Texture Match:</strong> Auto-erase background color aur boundary sharp rakhta hai. Saree ki gold zari embroidery ya lakdi ki reflection highlight ko 100% invisible karne ke liye <strong>Clone Stamp</strong> use karein!
                  </span>
                </div>
                {toolMode !== "clone" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setToolMode("clone");
                      setIsPickingSource(true);
                    }}
                    className="w-full h-7 text-[11px] border-[#10b981] text-[#047857] dark:text-[#34d399] hover:bg-[#10b981] hover:text-white"
                  >
                    <Stamp className="h-3 w-3 mr-1" />
                    Switch to Clone Stamp Tool
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
