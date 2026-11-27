"use client";

import * as React from "react";
import {
  Sparkles,
  Download,
  Plus,
  X,
  Images,
  CheckCircle2,
  Paintbrush,
  Eraser,
  RotateCcw,
  Eye,
  Sliders,
  Layers,
  Wand2,
  Brush,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/design-system/primitives/button";
import { Slider } from "@/design-system/primitives/slider";
import { Card } from "@/design-system/primitives/card";
import { Label } from "@/components/ui/label";
import {
  removeBackgroundAdvanced,
  type RemoveBackgroundOptions,
  type SegmentationResult,
} from "@/lib/image/backgroundRemoval";

interface ImageItem {
  id: string;
  src: string;
  name: string;
  originalCanvas: HTMLCanvasElement | null;
  processedCanvas: HTMLCanvasElement | null;
  maskCanvas: HTMLCanvasElement | null;
}

export default function BackgroundRemoverPage() {
  const [images, setImages] = React.useState<ImageItem[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  // Advanced Algorithm Controls
  const [mode, setMode] = React.useState<"auto" | "studio" | "graphic">("auto");
  const [tolerance, setTolerance] = React.useState(35);
  const [feather, setFeather] = React.useState(2);
  const [removeShadows, setRemoveShadows] = React.useState(true);
  const [bgColor, setBgColor] = React.useState<string>("transparent");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [showOriginal, setShowOriginal] = React.useState(false);

  // Interactive Refine Brush
  const [brushTool, setBrushTool] = React.useState<"none" | "restore" | "erase">("none");
  const [brushSize, setBrushSize] = React.useState(25);
  const [isPainting, setIsPainting] = React.useState(false);

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const addInputRef = React.useRef<HTMLInputElement | null>(null);
  const initialInputRef = React.useRef<HTMLInputElement | null>(null);

  const activeImage = images.find((img) => img.id === activeId) ?? null;

  // ── Render composite onto preview canvas ─────────────────────────────────
  const drawToCanvas = React.useCallback(
    (
      imgSource: string | HTMLCanvasElement | null,
      processed: HTMLCanvasElement | null,
      bg: string,
      forceOriginal = false
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (forceOriginal) {
        // Render raw original image
        if (imgSource instanceof HTMLCanvasElement) {
          canvas.width = imgSource.width;
          canvas.height = imgSource.height;
          const ctx = canvas.getContext("2d")!;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(imgSource, 0, 0);
        } else if (typeof imgSource === "string") {
          const img = new Image();
          img.src = imgSource;
          img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d")!;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
          };
        }
        return;
      }

      if (processed) {
        canvas.width = processed.width;
        canvas.height = processed.height;
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (bg !== "transparent") {
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(processed, 0, 0);
      } else if (imgSource) {
        if (imgSource instanceof HTMLCanvasElement) {
          canvas.width = imgSource.width;
          canvas.height = imgSource.height;
          const ctx = canvas.getContext("2d")!;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(imgSource, 0, 0);
        } else {
          const img = new Image();
          img.src = imgSource;
          img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d")!;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
          };
        }
      }
    },
    []
  );

  // ── Switch active image ─────────────────────────────────────────────────
  const selectImage = React.useCallback(
    (item: ImageItem, bg: string) => {
      setActiveId(item.id);
      setBrushTool("none");
      drawToCanvas(item.originalCanvas ?? item.src, item.processedCanvas, bg, showOriginal);
    },
    [drawToCanvas, showOriginal]
  );

  // ── Handle file(s) added ────────────────────────────────────────────────
  const addFiles = React.useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const loadedItems: ImageItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const src = URL.createObjectURL(f);

        // Pre-create original canvas
        const img = new Image();
        img.src = src;
        await new Promise((res) => {
          img.onload = res;
        });

        const origCanvas = document.createElement("canvas");
        origCanvas.width = img.width;
        origCanvas.height = img.height;
        const oCtx = origCanvas.getContext("2d")!;
        oCtx.drawImage(img, 0, 0);

        loadedItems.push({
          id: `img_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          src,
          name: f.name,
          originalCanvas: origCanvas,
          processedCanvas: null,
          maskCanvas: null,
        });
      }

      setImages((prev) => [...prev, ...loadedItems]);

      // Auto-select first added
      const first = loadedItems[0];
      setActiveId(first.id);
      drawToCanvas(first.originalCanvas, null, bgColor, false);
    },
    [bgColor, drawToCanvas]
  );

  const handleInitialUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    e.target.value = "";
  };

  const handleAddMore = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    e.target.value = "";
  };

  // ── Remove image from queue ─────────────────────────────────────────────
  const removeImage = (id: string) => {
    setImages((prev) => {
      const remaining = prev.filter((img) => img.id !== id);
      if (activeId === id && remaining.length > 0) {
        const next = remaining[0];
        setActiveId(next.id);
        drawToCanvas(next.originalCanvas ?? next.src, next.processedCanvas, bgColor, false);
      } else if (remaining.length === 0) {
        setActiveId(null);
      }
      return remaining;
    });
  };

  // ── Run Intelligent Foreground Extraction ──────────────────────────────
  const handleRemoveBg = React.useCallback(async () => {
    if (!activeImage || !activeImage.originalCanvas) return;
    setIsProcessing(true);

    // Yield to allow UI spinner
    await new Promise((r) => setTimeout(r, 40));

    try {
      const options: RemoveBackgroundOptions = {
        tolerance,
        mode,
        feather,
        removeShadows,
      };

      const result: SegmentationResult = removeBackgroundAdvanced(
        activeImage.originalCanvas,
        options
      );

      // Save processed canvas & mask back to image item
      setImages((prev) =>
        prev.map((item) =>
          item.id === activeImage.id
            ? {
                ...item,
                processedCanvas: result.cutoutCanvas,
                maskCanvas: result.maskCanvas,
              }
            : item
        )
      );

      drawToCanvas(activeImage.originalCanvas, result.cutoutCanvas, bgColor, false);
    } catch (err) {
      console.error("Background removal error:", err);
    } finally {
      setIsProcessing(false);
    }
  }, [activeImage, tolerance, mode, feather, removeShadows, bgColor, drawToCanvas]);

  // ── Interactive Brush Touch-Up ──────────────────────────────────────────
  const applyBrushStroke = React.useCallback(
    (clientX: number, clientY: number) => {
      if (
        brushTool === "none" ||
        !activeImage ||
        !activeImage.originalCanvas ||
        !activeImage.maskCanvas ||
        !activeImage.processedCanvas
      )
        return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;
      const rad = brushSize * Math.max(scaleX, scaleY);

      const maskCanvas = activeImage.maskCanvas;
      const mCtx = maskCanvas.getContext("2d")!;

      // Restore = paint white (keep foreground)
      // Erase = paint transparent black (cutout background)
      if (brushTool === "restore") {
        mCtx.globalCompositeOperation = "source-over";
        mCtx.fillStyle = "rgba(255, 255, 255, 1.0)";
      } else {
        mCtx.globalCompositeOperation = "source-over";
        mCtx.fillStyle = "rgba(0, 0, 0, 1.0)";
      }

      mCtx.beginPath();
      mCtx.arc(x, y, rad, 0, Math.PI * 2);
      mCtx.fill();

      // Re-composite processedCanvas: originalCanvas masked by maskCanvas
      const pCanvas = activeImage.processedCanvas;
      const pCtx = pCanvas.getContext("2d")!;
      pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
      pCtx.drawImage(activeImage.originalCanvas, 0, 0);

      // Read updated mask and apply alpha to processedCanvas
      const mData = mCtx.getImageData(0, 0, pCanvas.width, pCanvas.height).data;
      const pImgData = pCtx.getImageData(0, 0, pCanvas.width, pCanvas.height);
      const pData = pImgData.data;

      for (let i = 0; i < pData.length; i += 4) {
        // Red channel of mask represents alpha
        const maskAlpha = mData[i];
        pData[i + 3] = maskAlpha;
      }
      pCtx.putImageData(pImgData, 0, 0);

      // Redraw to screen
      drawToCanvas(activeImage.originalCanvas, pCanvas, bgColor, false);
    },
    [brushTool, activeImage, brushSize, bgColor, drawToCanvas]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (brushTool === "none") return;
    setIsPainting(true);
    applyBrushStroke(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPainting || brushTool === "none") return;
    applyBrushStroke(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    setIsPainting(false);
  };

  // Reset to original cutout
  const handleResetMask = () => {
    if (activeImage && activeImage.originalCanvas) {
      handleRemoveBg();
    }
  };

  // ── Re-render when bg color changes ────────────────────────────────────
  React.useEffect(() => {
    if (activeImage) {
      drawToCanvas(
        activeImage.originalCanvas ?? activeImage.src,
        activeImage.processedCanvas,
        bgColor,
        showOriginal
      );
    }
  }, [bgColor, showOriginal, drawToCanvas, activeImage]);

  // ── Export current canvas ───────────────────────────────────────────────
  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `edito_${activeImage?.name?.replace(/\.[^/.]+$/, "") || "cutout"}_nobg.png`;
    a.click();
  };

  const hasImages = images.length > 0;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#e5e7eb] dark:border-[#27272a]">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#fb6b6a]" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-[#f4f4f5]">
              AI Background Remover & Object Isolation
            </h1>
          </div>
          <p className="text-xs text-[#6b7280] dark:text-[#a1a1aa] mt-0.5">
            Automatic object boundary detection, perimeter palette matting, and fine touch-up brushes. 100% local in your browser.
          </p>
        </div>

        {hasImages && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs select-none"
              onMouseDown={() => setShowOriginal(true)}
              onMouseUp={() => setShowOriginal(false)}
              onTouchStart={() => setShowOriginal(true)}
              onTouchEnd={() => setShowOriginal(false)}
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              Hold: Original
            </Button>
            <Button onClick={handleExport} className="h-8 text-xs px-3">
              <Download className="h-3.5 w-3.5 mr-1" />
              Export Transparent PNG
            </Button>
          </div>
        )}
      </div>

      {/* ── Empty state ── */}
      {!hasImages ? (
        <Card className="max-w-xl mx-auto p-8 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215]">
          <label className="flex flex-col items-center justify-center p-8 rounded-[6px] border border-dashed border-[#d1d5db] dark:border-[#3f3f46] hover:border-[#fb6b6a] dark:hover:border-[#fb6b6a] bg-[#fbfbfb] dark:bg-[#18181c] cursor-pointer transition-colors text-center">
            <Images className="h-9 w-9 text-[#fb6b6a] mb-2" />
            <span className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
              Select one or more photos
            </span>
            <span className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa] mt-1">
              Supports JPG, PNG, WebP · High-resolution object detection
            </span>
            <input
              ref={initialInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleInitialUpload}
              className="hidden"
            />
          </label>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* ── Left: Canvas preview ── */}
          <div className="lg:col-span-8 space-y-3">
            <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] flex flex-col items-center justify-center min-h-[460px] overflow-hidden relative">
              {/* Brush active notice */}
              {brushTool !== "none" && (
                <div className="absolute top-3 left-3 z-10 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded text-[11px] text-white flex items-center gap-1.5 shadow">
                  <Brush className="h-3 w-3 text-[#fb6b6a]" />
                  <span>
                    {brushTool === "restore" ? "Restore (Keep) Brush" : "Erase (Cutout) Brush"} Active: Paint on canvas to refine
                  </span>
                </div>
              )}

              {/* Processing overlay */}
              {isProcessing && (
                <div className="absolute inset-0 z-20 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center text-white gap-2">
                  <div className="h-7 w-7 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-xs font-medium">Detecting object boundaries & contours...</span>
                </div>
              )}

              <div className="canvas-checkerboard p-2 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] max-h-[70vh] overflow-auto">
                <canvas
                  ref={canvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className={`max-w-full rounded-[4px] touch-none ${
                    brushTool === "restore"
                      ? "cursor-crosshair"
                      : brushTool === "erase"
                      ? "cursor-crosshair"
                      : "cursor-default"
                  }`}
                />
              </div>
            </Card>

            {/* ── Image Queue Strip ── */}
            <Card className="p-3 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215]">
              <div className="flex items-center gap-2 mb-2">
                <Images className="h-3.5 w-3.5 text-[#fb6b6a]" />
                <span className="text-[11px] font-semibold text-[#111827] dark:text-[#f4f4f5]">
                  Image Queue
                </span>
                <span className="text-[10px] font-mono text-[#6b7280] dark:text-[#a1a1aa]">
                  {images.length} photo{images.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {images.map((item) => (
                  <div
                    key={item.id}
                    className={`relative flex-shrink-0 group cursor-pointer rounded-[6px] border-2 transition-all ${
                      activeId === item.id
                        ? "border-[#fb6b6a] shadow-[0_0_0_2px_#fb6b6a33]"
                        : "border-[#e5e7eb] dark:border-[#27272a] hover:border-[#fb6b6a]/60"
                    }`}
                    onClick={() => selectImage(item, bgColor)}
                  >
                    <img
                      src={item.src}
                      alt={item.name}
                      className="h-16 w-16 object-cover rounded-[4px]"
                    />

                    {item.processedCanvas && (
                      <div className="absolute top-0.5 right-0.5 h-4 w-4 bg-[#10b981] rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(item.id);
                      }}
                      className="absolute -top-1.5 -left-1.5 h-4 w-4 bg-[#ef4444] text-white rounded-full hidden group-hover:flex items-center justify-center shadow"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}

                <label className="flex-shrink-0 h-16 w-16 rounded-[6px] border-2 border-dashed border-[#d1d5db] dark:border-[#3f3f46] hover:border-[#fb6b6a] dark:hover:border-[#fb6b6a] bg-[#fbfbfb] dark:bg-[#18181c] flex flex-col items-center justify-center cursor-pointer transition-colors gap-0.5">
                  <Plus className="h-5 w-5 text-[#fb6b6a]" />
                  <span className="text-[9px] font-mono text-[#6b7280] dark:text-[#a1a1aa]">Add</span>
                  <input
                    ref={addInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleAddMore}
                    className="hidden"
                  />
                </label>
              </div>
            </Card>
          </div>

          {/* ── Right: Controls ── */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] space-y-4">
              <div className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5] pb-2 border-b border-[#e5e7eb] dark:border-[#27272a] flex items-center justify-between">
                <span>Object Detection Engine</span>
                {activeImage && (
                  <span className="font-normal text-[11px] text-[#6b7280] dark:text-[#a1a1aa] truncate max-w-[130px]">
                    {activeImage.name}
                  </span>
                )}
              </div>

              {/* Mode Selection */}
              <div className="space-y-1.5">
                <Label className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa]">Detection Mode</Label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: "auto", label: "Smart Subject", desc: "People & Products" },
                    { id: "studio", label: "Studio", desc: "Even Backdrop" },
                    { id: "graphic", label: "Graphic", desc: "Logos & Art" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id as any)}
                      className={`py-1.5 px-2 rounded-[4px] border text-left flex flex-col transition-all ${
                        mode === m.id
                          ? "border-[#fb6b6a] bg-[#fb6b6a]/10 text-[#fb6b6a]"
                          : "border-[#e5e7eb] dark:border-[#27272a] text-[#4b5563] dark:text-[#a1a1aa]"
                      }`}
                    >
                      <span className="text-[11px] font-semibold leading-tight">{m.label}</span>
                      <span className="text-[9px] opacity-75 leading-tight">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sensitivity & Tolerance */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-[#6b7280] dark:text-[#a1a1aa]">
                  <span>Subject Boundary Sensitivity</span>
                  <span className="font-mono text-[#fb6b6a]">{tolerance}</span>
                </div>
                <Slider
                  value={[tolerance]}
                  min={10}
                  max={80}
                  step={1}
                  onValueChange={(v) => setTolerance(v[0])}
                />
              </div>

              {/* Edge Feathering */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-[#6b7280] dark:text-[#a1a1aa]">
                  <span>Edge Feather (Softness)</span>
                  <span className="font-mono text-[#fb6b6a]">{feather}px</span>
                </div>
                <Slider
                  value={[feather]}
                  min={0}
                  max={5}
                  step={1}
                  onValueChange={(v) => setFeather(v[0])}
                />
              </div>

              {/* Cast Shadows Option */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-[#374151] dark:text-[#d1d5db]">
                  Remove Cast Shadows
                </span>
                <input
                  type="checkbox"
                  checked={removeShadows}
                  onChange={(e) => setRemoveShadows(e.target.checked)}
                  className="rounded border-[#d1d5db] text-[#fb6b6a] focus:ring-[#fb6b6a] cursor-pointer"
                />
              </div>

              {/* Primary Extract Button */}
              <Button
                onClick={handleRemoveBg}
                disabled={isProcessing || !activeImage}
                className="w-full h-9 text-xs font-semibold"
              >
                <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                {isProcessing ? "Analyzing Contours..." : "Extract Object & Remove Background"}
              </Button>

              {/* ── Precision Touch-Up Brushes ── */}
              {activeImage?.processedCanvas && (
                <div className="pt-3 border-t border-[#e5e7eb] dark:border-[#27272a] space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5] flex items-center gap-1">
                      <Paintbrush className="h-3.5 w-3.5 text-[#fb6b6a]" />
                      Touch-Up Brushes
                    </Label>
                    <button
                      onClick={handleResetMask}
                      className="text-[10px] text-[#6b7280] hover:text-[#fb6b6a] flex items-center gap-0.5"
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                      Reset Edits
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <Button
                      variant={brushTool === "none" ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-[10px] px-1"
                      onClick={() => setBrushTool("none")}
                    >
                      View
                    </Button>
                    <Button
                      variant={brushTool === "restore" ? "default" : "outline"}
                      size="sm"
                      className={`h-7 text-[10px] px-1 ${
                        brushTool === "restore" ? "bg-[#10b981] hover:bg-[#059669] text-white" : ""
                      }`}
                      onClick={() => setBrushTool("restore")}
                    >
                      <Paintbrush className="h-3 w-3 mr-1 text-[#10b981]" />
                      Restore
                    </Button>
                    <Button
                      variant={brushTool === "erase" ? "default" : "outline"}
                      size="sm"
                      className={`h-7 text-[10px] px-1 ${
                        brushTool === "erase" ? "bg-[#ef4444] hover:bg-[#dc2626] text-white" : ""
                      }`}
                      onClick={() => setBrushTool("erase")}
                    >
                      <Eraser className="h-3 w-3 mr-1 text-[#ef4444]" />
                      Erase
                    </Button>
                  </div>

                  {brushTool !== "none" && (
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[11px] text-[#6b7280] dark:text-[#a1a1aa]">
                        <span>Brush Size</span>
                        <span className="font-mono">{brushSize}px</span>
                      </div>
                      <Slider
                        value={[brushSize]}
                        min={5}
                        max={80}
                        step={1}
                        onValueChange={(v) => setBrushSize(v[0])}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ── Replace Canvas Backdrop ── */}
              <div className="pt-2 border-t border-[#e5e7eb] dark:border-[#27272a] space-y-1.5">
                <Label className="text-xs text-[#6b7280] dark:text-[#a1a1aa]">
                  Replace Canvas Backdrop
                </Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: "Transparent", val: "transparent" },
                    { label: "White", val: "#ffffff" },
                    { label: "Dark", val: "#09090b" },
                    { label: "Coral", val: "#fb6b6a" },
                    { label: "Sky", val: "#38bdf8" },
                    { label: "Green", val: "#10b981" },
                    { label: "Yellow", val: "#f59e0b" },
                    { label: "Grey", val: "#71717a" },
                  ].map((color) => (
                    <button
                      key={color.val}
                      onClick={() => setBgColor(color.val)}
                      className={`h-7 rounded-[4px] border text-[10px] font-mono transition-all ${
                        bgColor === color.val
                          ? "border-[#fb6b6a] ring-1 ring-[#fb6b6a]"
                          : "border-[#e5e7eb] dark:border-[#27272a]"
                      }`}
                      style={{
                        backgroundColor: color.val === "transparent" ? "transparent" : color.val,
                        color: color.val === "#ffffff" ? "#000000" : "#ffffff",
                      }}
                    >
                      {color.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick stats */}
              {images.length > 0 && (
                <div className="pt-2 border-t border-[#e5e7eb] dark:border-[#27272a]">
                  <div className="flex justify-between text-[10px] font-mono text-[#6b7280] dark:text-[#a1a1aa]">
                    <span>Total images</span>
                    <span className="text-[#111827] dark:text-[#f4f4f5] font-semibold">
                      {images.length}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-[#6b7280] dark:text-[#a1a1aa] mt-1">
                    <span>Processed</span>
                    <span className="text-[#10b981] font-semibold">
                      {images.filter((i) => i.processedCanvas).length} / {images.length}
                    </span>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
