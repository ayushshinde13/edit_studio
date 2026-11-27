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
  Bot,
  Zap,
  MousePointerClick,
} from "lucide-react";
import { Button } from "@/design-system/primitives/button";
import { Slider } from "@/design-system/primitives/slider";
import { Card } from "@/design-system/primitives/card";
import { Label } from "@/components/ui/label";
import {
  removeBackgroundAdvanced,
  type RemoveBackgroundOptions,
  type SegmentationResult,
  perceptualDistSq,
} from "@/lib/image/backgroundRemoval";

interface ImageItem {
  id: string;
  src: string;
  name: string;
  originalCanvas: HTMLCanvasElement | null;
  processedCanvas: HTMLCanvasElement | null;
  maskCanvas: HTMLCanvasElement | null;
  engineUsed?: "ai" | "local";
}

export default function BackgroundRemoverPage() {
  const [images, setImages] = React.useState<ImageItem[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  // Advanced Algorithm Controls
  const [mode, setMode] = React.useState<"ai" | "auto" | "studio" | "graphic">("ai");
  const [tolerance, setTolerance] = React.useState(35);
  const [feather, setFeather] = React.useState(2);
  const [removeShadows, setRemoveShadows] = React.useState(true);
  const [bgColor, setBgColor] = React.useState<string>("transparent");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [progressText, setProgressText] = React.useState("Processing...");
  const [progressPercent, setProgressPercent] = React.useState<number | null>(null);
  const [showOriginal, setShowOriginal] = React.useState(false);

  // Interactive Tools: none | restore | erase | magic-wand
  const [activeTool, setActiveTool] = React.useState<"none" | "restore" | "erase" | "wand">("none");
  const [brushSize, setBrushSize] = React.useState(25);
  const [isPainting, setIsPainting] = React.useState(false);

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const addInputRef = React.useRef<HTMLInputElement | null>(null);
  const initialInputRef = React.useRef<HTMLInputElement | null>(null);

  const activeImage = images.find((img) => img.id === activeId) ?? null;

  // Helper to safely load HTMLImageElement
  const loadImage = React.useCallback(async (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      if (img.complete && img.naturalWidth > 0) {
        resolve(img);
        return;
      }
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }, []);

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
        if (imgSource instanceof HTMLCanvasElement) {
          canvas.width = imgSource.width;
          canvas.height = imgSource.height;
          const ctx = canvas.getContext("2d")!;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(imgSource, 0, 0);
        } else if (typeof imgSource === "string") {
          loadImage(imgSource).then((img) => {
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d")!;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
          });
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
          loadImage(imgSource).then((img) => {
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d")!;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
          });
        }
      }
    },
    [loadImage]
  );

  // ── Switch active image ─────────────────────────────────────────────────
  const selectImage = React.useCallback(
    (item: ImageItem, bg: string) => {
      setActiveId(item.id);
      setActiveTool("none");
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

        try {
          const img = await loadImage(src);
          const origCanvas = document.createElement("canvas");
          origCanvas.width = img.naturalWidth || img.width;
          origCanvas.height = img.naturalHeight || img.height;
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
        } catch {
          loadedItems.push({
            id: `img_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            src,
            name: f.name,
            originalCanvas: null,
            processedCanvas: null,
            maskCanvas: null,
          });
        }
      }

      setImages((prev) => [...prev, ...loadedItems]);

      const first = loadedItems[0];
      setActiveId(first.id);
      drawToCanvas(first.originalCanvas ?? first.src, null, bgColor, false);
    },
    [bgColor, drawToCanvas, loadImage]
  );

  const handleInitialUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    e.target.value = "";
  };

  const handleAddMore = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    e.target.value = "";
  };

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
    if (!activeImage) return;
    setIsProcessing(true);
    setProgressText("Preparing image canvas...");
    setProgressPercent(10);

    try {
      // Ensure original canvas exists
      let origCanvas = activeImage.originalCanvas;
      if (!origCanvas) {
        const img = await loadImage(activeImage.src);
        origCanvas = document.createElement("canvas");
        origCanvas.width = img.naturalWidth || img.width;
        origCanvas.height = img.naturalHeight || img.height;
        const oCtx = origCanvas.getContext("2d")!;
        oCtx.drawImage(img, 0, 0);
      }

      const options: RemoveBackgroundOptions = {
        tolerance,
        mode,
        feather,
        removeShadows,
        onProgress: (status, pct) => {
          setProgressText(status);
          if (pct !== undefined) setProgressPercent(pct);
        },
      };

      const result: SegmentationResult = await removeBackgroundAdvanced(
        origCanvas,
        options
      );

      // Save processed canvas & mask back to image item
      setImages((prev) =>
        prev.map((item) =>
          item.id === activeImage.id
            ? {
                ...item,
                originalCanvas: origCanvas,
                processedCanvas: result.cutoutCanvas,
                maskCanvas: result.maskCanvas,
                engineUsed: result.engineUsed,
              }
            : item
        )
      );

      drawToCanvas(origCanvas, result.cutoutCanvas, bgColor, false);
    } catch (err) {
      console.error("Background removal error:", err);
      setProgressText("An error occurred during removal.");
    } finally {
      setIsProcessing(false);
      setProgressPercent(null);
    }
  }, [activeImage, tolerance, mode, feather, removeShadows, bgColor, drawToCanvas, loadImage]);

  // ── Magic Wand (Click to Erase Background Area) ──────────────────────────
  const applyMagicWand = React.useCallback(
    (clientX: number, clientY: number) => {
      if (!activeImage || !activeImage.originalCanvas) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const startX = Math.floor((clientX - rect.left) * scaleX);
      const startY = Math.floor((clientY - rect.top) * scaleY);

      const w = canvas.width;
      const h = canvas.height;
      if (startX < 0 || startX >= w || startY < 0 || startY >= h) return;

      const origCanvas = activeImage.originalCanvas;
      const oCtx = origCanvas.getContext("2d", { willReadFrequently: true })!;
      const origData = oCtx.getImageData(0, 0, w, h);
      const origPixels = origData.data;

      // Sample clicked color
      const seedIdx = (startY * w + startX) * 4;
      const targetR = origPixels[seedIdx];
      const targetG = origPixels[seedIdx + 1];
      const targetB = origPixels[seedIdx + 2];

      // Get or create mask canvas
      let maskCanvas = activeImage.maskCanvas;
      if (!maskCanvas) {
        maskCanvas = document.createElement("canvas");
        maskCanvas.width = w;
        maskCanvas.height = h;
        const mCtx = maskCanvas.getContext("2d")!;
        mCtx.fillStyle = "white";
        mCtx.fillRect(0, 0, w, h);
      }

      const mCtx = maskCanvas.getContext("2d", { willReadFrequently: true })!;
      const mImgData = mCtx.getImageData(0, 0, w, h);
      const mData = mImgData.data;

      // Threshold based on sensitivity
      const tolSq = Math.pow(tolerance * 2.2, 2);

      // Connected flood erase
      const visited = new Uint8Array(w * h);
      const queue = new Int32Array(w * h);
      let qHead = 0;
      let qTail = 0;

      const startPos = startY * w + startX;
      queue[qTail++] = startPos;
      visited[startPos] = 1;

      while (qHead < qTail) {
        const curr = queue[qHead++];
        const cx = curr % w;
        const cy = Math.floor(curr / w);
        const p = curr * 4;

        // Erase in mask
        mData[p] = 0;
        mData[p + 1] = 0;
        mData[p + 2] = 0;

        const neighbors = [
          cx > 0 ? curr - 1 : -1,
          cx < w - 1 ? curr + 1 : -1,
          cy > 0 ? curr - w : -1,
          cy < h - 1 ? curr + w : -1,
        ];

        for (let n = 0; n < 4; n++) {
          const next = neighbors[n];
          if (next === -1 || visited[next] === 1) continue;

          const nP = next * 4;
          const r = origPixels[nP];
          const g = origPixels[nP + 1];
          const b = origPixels[nP + 2];

          if (perceptualDistSq(r, g, b, targetR, targetG, targetB) < tolSq) {
            visited[next] = 1;
            queue[qTail++] = next;
          }
        }
      }

      mCtx.putImageData(mImgData, 0, 0);

      // Re-composite processedCanvas
      let pCanvas = activeImage.processedCanvas;
      if (!pCanvas) {
        pCanvas = document.createElement("canvas");
        pCanvas.width = w;
        pCanvas.height = h;
      }
      const pCtx = pCanvas.getContext("2d")!;
      pCtx.clearRect(0, 0, w, h);
      pCtx.drawImage(origCanvas, 0, 0);

      const pImgData = pCtx.getImageData(0, 0, w, h);
      const pData = pImgData.data;
      for (let i = 0; i < pData.length; i += 4) {
        pData[i + 3] = mData[i];
      }
      pCtx.putImageData(pImgData, 0, 0);

      setImages((prev) =>
        prev.map((item) =>
          item.id === activeImage.id
            ? { ...item, maskCanvas, processedCanvas: pCanvas }
            : item
        )
      );

      drawToCanvas(origCanvas, pCanvas, bgColor, false);
    },
    [activeImage, tolerance, bgColor, drawToCanvas]
  );

  // ── Precision Brush Strokes ─────────────────────────────────────────────
  const applyBrushStroke = React.useCallback(
    (clientX: number, clientY: number) => {
      if (
        (activeTool !== "restore" && activeTool !== "erase") ||
        !activeImage ||
        !activeImage.originalCanvas
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

      const w = canvas.width;
      const h = canvas.height;

      let maskCanvas = activeImage.maskCanvas;
      if (!maskCanvas) {
        maskCanvas = document.createElement("canvas");
        maskCanvas.width = w;
        maskCanvas.height = h;
        const mCtx = maskCanvas.getContext("2d")!;
        mCtx.fillStyle = "white";
        mCtx.fillRect(0, 0, w, h);
      }

      const mCtx = maskCanvas.getContext("2d")!;
      mCtx.fillStyle = activeTool === "restore" ? "rgba(255,255,255,1)" : "rgba(0,0,0,1)";
      mCtx.beginPath();
      mCtx.arc(x, y, rad, 0, Math.PI * 2);
      mCtx.fill();

      let pCanvas = activeImage.processedCanvas;
      if (!pCanvas) {
        pCanvas = document.createElement("canvas");
        pCanvas.width = w;
        pCanvas.height = h;
      }
      const pCtx = pCanvas.getContext("2d")!;
      pCtx.clearRect(0, 0, w, h);
      pCtx.drawImage(activeImage.originalCanvas, 0, 0);

      const mData = mCtx.getImageData(0, 0, w, h).data;
      const pImgData = pCtx.getImageData(0, 0, w, h);
      const pData = pImgData.data;

      for (let i = 0; i < pData.length; i += 4) {
        pData[i + 3] = mData[i];
      }
      pCtx.putImageData(pImgData, 0, 0);

      drawToCanvas(activeImage.originalCanvas, pCanvas, bgColor, false);
    },
    [activeTool, activeImage, brushSize, bgColor, drawToCanvas]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool === "wand") {
      applyMagicWand(e.clientX, e.clientY);
      return;
    }
    if (activeTool === "restore" || activeTool === "erase") {
      setIsPainting(true);
      applyBrushStroke(e.clientX, e.clientY);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPainting || (activeTool !== "restore" && activeTool !== "erase")) return;
    applyBrushStroke(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    setIsPainting(false);
  };

  const handleResetMask = () => {
    if (activeImage) {
      handleRemoveBg();
    }
  };

  // ── Re-render on backdrop change ────────────────────────────────────────
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

  // ── Export cutout ───────────────────────────────────────────────────────
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
            Neural AI object segmentation and precision matting. Zero server uploads — 100% private in browser.
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
              Supports JPG, PNG, WebP · Isolates any subject (food, people, products, pets)
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
              {/* Active Tool Badge */}
              {activeTool !== "none" && (
                <div className="absolute top-3 left-3 z-10 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full text-[11px] text-white flex items-center gap-1.5 shadow">
                  {activeTool === "wand" ? (
                    <MousePointerClick className="h-3.5 w-3.5 text-[#fb6b6a]" />
                  ) : (
                    <Brush className="h-3.5 w-3.5 text-[#fb6b6a]" />
                  )}
                  <span>
                    {activeTool === "wand"
                      ? "Magic Wand: Click any background area to erase it"
                      : activeTool === "restore"
                      ? "Restore Brush: Paint over subject to restore"
                      : "Erase Brush: Paint over background to erase"}
                  </span>
                </div>
              )}

              {/* Processing Spinner & Status */}
              {isProcessing && (
                <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white gap-3 p-6 text-center">
                  <div className="h-8 w-8 border-3 border-white/20 border-t-[#fb6b6a] rounded-full animate-spin" />
                  <span className="text-xs font-semibold tracking-wide">{progressText}</span>
                  {progressPercent !== null && (
                    <div className="w-48 bg-white/20 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#fb6b6a] h-full transition-all duration-200"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="canvas-checkerboard p-2 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] max-h-[70vh] overflow-auto">
                <canvas
                  ref={canvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className={`max-w-full rounded-[4px] touch-none ${
                    activeTool === "wand"
                      ? "cursor-crosshair"
                      : activeTool === "restore" || activeTool === "erase"
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
                <span>Object Segmentation Engine</span>
                {activeImage && (
                  <span className="font-normal text-[11px] text-[#6b7280] dark:text-[#a1a1aa] truncate max-w-[130px]">
                    {activeImage.name}
                  </span>
                )}
              </div>

              {/* Engine Mode Tabs */}
              <div className="space-y-1.5">
                <Label className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa]">Detection Mode</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "ai", label: "AI Neural (Best)", icon: Bot, desc: "Pizza, Products & People" },
                    { id: "auto", label: "Smart Subject", icon: Zap, desc: "Fast Local Vision" },
                    { id: "studio", label: "Studio Backdrop", icon: Layers, desc: "Clean / Solid" },
                    { id: "graphic", label: "Graphic & Logo", icon: Sliders, desc: "Sharp Edges" },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setMode(m.id as any)}
                        className={`p-2 rounded-[5px] border text-left flex flex-col transition-all ${
                          mode === m.id
                            ? "border-[#fb6b6a] bg-[#fb6b6a]/10 text-[#fb6b6a]"
                            : "border-[#e5e7eb] dark:border-[#27272a] text-[#4b5563] dark:text-[#a1a1aa] hover:border-[#fb6b6a]/40"
                        }`}
                      >
                        <div className="flex items-center gap-1 font-semibold text-[11px]">
                          <Icon className="h-3 w-3" />
                          <span>{m.label}</span>
                        </div>
                        <span className="text-[9px] opacity-75 mt-0.5">{m.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Primary Extract Button */}
              <Button
                onClick={handleRemoveBg}
                disabled={isProcessing || !activeImage}
                className="w-full h-10 text-xs font-semibold bg-[#fb6b6a] hover:bg-[#e05655] text-white shadow-sm"
              >
                <Wand2 className="h-4 w-4 mr-1.5" />
                {isProcessing ? "Processing Cutout..." : "Extract Object & Remove Background"}
              </Button>

              {/* Fine Tuning Controls */}
              <div className="space-y-3 pt-2 border-t border-[#e5e7eb] dark:border-[#27272a]">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[#6b7280] dark:text-[#a1a1aa]">
                    <span>Sensitivity / Tolerance</span>
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

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[#6b7280] dark:text-[#a1a1aa]">
                    <span>Edge Softness (Feather)</span>
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
              </div>

              {/* ── Precision Touch-Up Tools ── */}
              <div className="pt-3 border-t border-[#e5e7eb] dark:border-[#27272a] space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5] flex items-center gap-1">
                    <Paintbrush className="h-3.5 w-3.5 text-[#fb6b6a]" />
                    Interactive Touch-Up
                  </Label>
                  {activeImage?.processedCanvas && (
                    <button
                      onClick={handleResetMask}
                      className="text-[10px] text-[#6b7280] hover:text-[#fb6b6a] flex items-center gap-0.5"
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                      Re-run
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-1">
                  <Button
                    variant={activeTool === "none" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-[10px] px-1"
                    onClick={() => setActiveTool("none")}
                  >
                    View
                  </Button>
                  <Button
                    variant={activeTool === "wand" ? "default" : "outline"}
                    size="sm"
                    className={`h-7 text-[10px] px-1 ${
                      activeTool === "wand" ? "bg-[#3b82f6] hover:bg-[#2563eb] text-white" : ""
                    }`}
                    onClick={() => setActiveTool("wand")}
                  >
                    <MousePointerClick className="h-3 w-3 mr-0.5" />
                    Wand
                  </Button>
                  <Button
                    variant={activeTool === "restore" ? "default" : "outline"}
                    size="sm"
                    className={`h-7 text-[10px] px-1 ${
                      activeTool === "restore" ? "bg-[#10b981] hover:bg-[#059669] text-white" : ""
                    }`}
                    onClick={() => setActiveTool("restore")}
                  >
                    <Paintbrush className="h-3 w-3 mr-0.5" />
                    Keep
                  </Button>
                  <Button
                    variant={activeTool === "erase" ? "default" : "outline"}
                    size="sm"
                    className={`h-7 text-[10px] px-1 ${
                      activeTool === "erase" ? "bg-[#ef4444] hover:bg-[#dc2626] text-white" : ""
                    }`}
                    onClick={() => setActiveTool("erase")}
                  >
                    <Eraser className="h-3 w-3 mr-0.5" />
                    Erase
                  </Button>
                </div>

                {(activeTool === "restore" || activeTool === "erase") && (
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
