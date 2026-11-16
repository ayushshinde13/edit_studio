"use client";

import * as React from "react";
import {
  Sparkles,
  Download,
  Plus,
  X,
  Images,
  CheckCircle2,
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

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const addInputRef = React.useRef<HTMLInputElement | null>(null);
  const initialInputRef = React.useRef<HTMLInputElement | null>(null);

  const activeImage = images.find((img) => img.id === activeId) ?? null;

  // ── Load image onto canvas ──────────────────────────────────────────────
  const drawToCanvas = React.useCallback((src: string, processed: HTMLCanvasElement | null, bg: string) => {
    if (processed) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = processed.width;
      canvas.height = processed.height;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (bg !== "transparent") {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(processed, 0, 0);
    } else {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
    }
  }, []);

  // ── Switch active image ─────────────────────────────────────────────────
  const selectImage = React.useCallback((item: ImageItem, bg: string) => {
    setActiveId(item.id);
    drawToCanvas(item.src, item.processedCanvas, bg);
  }, [drawToCanvas]);

  // ── Handle file(s) added ────────────────────────────────────────────────
  const addFiles = React.useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newItems: ImageItem[] = Array.from(files).map((f) => ({
      id: `img_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      src: URL.createObjectURL(f),
      name: f.name,
      processedCanvas: null,
    }));

    setImages((prev) => {
      const updated = [...prev, ...newItems];
      return updated;
    });

    // Auto-select the first newly added image
    const first = newItems[0];
    setActiveId(first.id);
    drawToCanvas(first.src, null, bgColor);
  }, [bgColor, drawToCanvas]);

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
        drawToCanvas(next.src, next.processedCanvas, bgColor);
      } else if (remaining.length === 0) {
        setActiveId(null);
      }
      return remaining;
    });
  };

  // ── Extract Foreground ──────────────────────────────────────────────────
  const handleRemoveBg = async () => {
    if (!activeImage) return;
    setIsProcessing(true);

    const img = new Image();
    img.src = activeImage.src;
    await new Promise((r) => { img.onload = r; });

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const ctx = tempCanvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);

    const cutout = removeBackgroundCanvas(tempCanvas, tolerance);

    // Save processed canvas back to the image item
    setImages((prev) =>
      prev.map((item) =>
        item.id === activeImage.id ? { ...item, processedCanvas: cutout } : item
      )
    );
    drawToCanvas(activeImage.src, cutout, bgColor);
    setIsProcessing(false);
  };

  // ── Re-render when bg color changes ────────────────────────────────────
  React.useEffect(() => {
    if (activeImage) {
      drawToCanvas(activeImage.src, activeImage.processedCanvas, bgColor);
    }
  }, [bgColor]);

  // ── Export current canvas ───────────────────────────────────────────────
  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `edito_cutout_${Date.now()}.png`;
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
            Automatic background extraction. Upload multiple photos — process each individually.
          </p>
        </div>

        {hasImages && (
          <Button onClick={handleExport} className="h-8 text-xs px-3">
            <Download className="h-3 w-3 mr-1" />
            Export PNG
          </Button>
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
            <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] flex flex-col items-center justify-center min-h-[440px] overflow-hidden">
              <div className="canvas-checkerboard p-2 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a]">
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
                    {/* Thumbnail */}
                    <img
                      src={item.src}
                      alt={item.name}
                      className="h-16 w-16 object-cover rounded-[4px]"
                    />

                    {/* Processed badge */}
                    {item.processedCanvas && (
                      <div className="absolute top-0.5 right-0.5 h-4 w-4 bg-[#10b981] rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}

                    {/* Remove button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); removeImage(item.id); }}
                      className="absolute -top-1.5 -left-1.5 h-4 w-4 bg-[#ef4444] text-white rounded-full hidden group-hover:flex items-center justify-center shadow"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}

                {/* ── + Add More button ── */}
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
              <div className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5] pb-2 border-b border-[#e5e7eb] dark:border-[#27272a]">
                Background Controls
                {activeImage && (
                  <span className="ml-2 font-normal text-[#6b7280] dark:text-[#a1a1aa] truncate max-w-[120px] inline-block align-bottom">
                    — {activeImage.name}
                  </span>
                )}
              </div>

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

              <Button
                onClick={handleRemoveBg}
                disabled={isProcessing || !activeImage}
                className="w-full h-8 text-xs font-semibold"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                {isProcessing ? "Processing..." : "Extract Foreground"}
              </Button>

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
                    <span className="text-[#111827] dark:text-[#f4f4f5] font-semibold">{images.length}</span>
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
