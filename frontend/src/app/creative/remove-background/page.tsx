"use client";

import * as React from "react";
import {
  Sparkles,
  Download,
  Plus,
  X,
  Images,
  CheckCircle2,
  RotateCcw,
  Eye,
} from "lucide-react";
import { Button } from "@/design-system/primitives/button";
import { Slider } from "@/design-system/primitives/slider";
import { Card } from "@/design-system/primitives/card";
import { Label } from "@/components/ui/label";
import { removeBackgroundCanvas } from "@/lib/image/imageProcessing";

interface ImageItem {
  id: string;
  src: string;
  name: string;
  processedCanvas: HTMLCanvasElement | null;
}

export default function BackgroundRemoverPage() {
  const [images, setImages] = React.useState<ImageItem[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [tolerance, setTolerance] = React.useState(35);
  const [bgColor, setBgColor] = React.useState<string>("transparent");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [showOriginal, setShowOriginal] = React.useState(false);

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const addInputRef = React.useRef<HTMLInputElement | null>(null);
  const initialInputRef = React.useRef<HTMLInputElement | null>(null);

  const activeImage = images.find((img) => img.id === activeId) ?? null;

  // ── Render composite onto preview canvas ─────────────────────────────────
  const drawToCanvas = React.useCallback(
    (src: string, processed: HTMLCanvasElement | null, bg: string, forceOriginal = false) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (forceOriginal || !processed) {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext("2d")!;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
      } else {
        canvas.width = processed.width;
        canvas.height = processed.height;
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (bg !== "transparent") {
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(processed, 0, 0);
      }
    },
    []
  );

  // ── Switch active image ─────────────────────────────────────────────────
  const selectImage = React.useCallback(
    (item: ImageItem, bg: string) => {
      setActiveId(item.id);
      drawToCanvas(item.src, item.processedCanvas, bg, showOriginal);
    },
    [drawToCanvas, showOriginal]
  );

  // ── Handle file(s) added ────────────────────────────────────────────────
  const addFiles = React.useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const newItems: ImageItem[] = Array.from(files).map((f) => ({
        id: `img_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        src: URL.createObjectURL(f),
        name: f.name,
        processedCanvas: null,
      }));

      setImages((prev) => [...prev, ...newItems]);

      const first = newItems[0];
      setActiveId(first.id);
      drawToCanvas(first.src, null, bgColor, false);
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
        drawToCanvas(next.src, next.processedCanvas, bgColor, false);
      } else if (remaining.length === 0) {
        setActiveId(null);
      }
      return remaining;
    });
  };

  // ── Run Background Removal ──────────────────────────────────────────────
  const handleRemoveBg = React.useCallback(async () => {
    if (!activeImage) return;
    setIsProcessing(true);

    // Short yield so UI reflects processing state
    await new Promise((r) => setTimeout(r, 30));

    try {
      const img = new Image();
      img.src = activeImage.src;
      await new Promise<void>((resolve, reject) => {
        if (img.complete && img.naturalWidth > 0) {
          resolve();
          return;
        }
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
      });

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = img.naturalWidth || img.width;
      tempCanvas.height = img.naturalHeight || img.height;
      const ctx = tempCanvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      // Execute edge-bounded flood fill cutout
      const cutout = removeBackgroundCanvas(tempCanvas, tolerance);

      setImages((prev) =>
        prev.map((item) =>
          item.id === activeImage.id ? { ...item, processedCanvas: cutout } : item
        )
      );

      drawToCanvas(activeImage.src, cutout, bgColor, false);
    } catch (err) {
      console.error("Background removal error:", err);
    } finally {
      setIsProcessing(false);
    }
  }, [activeImage, tolerance, bgColor, drawToCanvas]);

  // ── Re-render on backdrop or original view toggle ───────────────────────
  React.useEffect(() => {
    if (activeImage) {
      drawToCanvas(activeImage.src, activeImage.processedCanvas, bgColor, showOriginal);
    }
  }, [bgColor, showOriginal, drawToCanvas, activeImage]);

  // ── Export Cutout ───────────────────────────────────────────────────────
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
              AI Background Remover & Transparent PNG
            </h1>
          </div>
          <p className="text-xs text-[#6b7280] dark:text-[#a1a1aa] mt-0.5">
            Automatic object boundary isolation. 100% in-browser, zero server uploads.
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
              Export PNG
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
              Supports JPG, PNG, WebP · Select multiple at once
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
              <div className="canvas-checkerboard p-2 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] max-h-[70vh] overflow-auto">
                <canvas ref={canvasRef} className="max-w-full rounded-[4px]" />
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
                <span>Background Controls</span>
                {activeImage && (
                  <span className="font-normal text-[11px] text-[#6b7280] dark:text-[#a1a1aa] truncate max-w-[130px]">
                    {activeImage.name}
                  </span>
                )}
              </div>

              {/* Sensitivity & Tolerance */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-[#6b7280] dark:text-[#a1a1aa]">
                  <span>Cutout Tolerance</span>
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

              {/* Primary Remove Button */}
              <Button
                onClick={handleRemoveBg}
                disabled={isProcessing || !activeImage}
                className="w-full h-9 text-xs font-semibold bg-[#fb6b6a] hover:bg-[#e05655] text-white shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                {isProcessing ? "Removing Background..." : "Remove Background"}
              </Button>

              {/* ── Replace Canvas Backdrop ── */}
              <div className="pt-2 border-t border-[#e5e7eb] dark:border-[#27272a] space-y-1.5">
                <Label className="text-xs text-[#6b7280] dark:text-[#a1a1aa]">
                  Replace Canvas Backdrop
                </Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: "None", val: "transparent" },
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
