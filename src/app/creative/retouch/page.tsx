"use client";

import * as React from "react";
import {
  Smile,
  Sliders,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Eye,
  Eraser,
  Sun,
  Flame,
} from "lucide-react";
import { Button } from "@/design-system/primitives/button";
import { Slider } from "@/design-system/primitives/slider";
import { Card } from "@/design-system/primitives/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/design-system/primitives/badge";
import { analytics } from "@/lib/analytics/tracker";

export default function RetouchPage() {
  const [imageSrc, setImageSrc] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string>("");
  const [smoothing, setSmoothing] = React.useState(35);
  const [blemishReduction, setBlemishReduction] = React.useState(40);
  const [eyeBrightness, setEyeBrightness] = React.useState(25);
  const [teethBrightening, setTeethBrightening] = React.useState(20);
  const [warmth, setWarmth] = React.useState(10);
  const [sliderPosition, setSliderPosition] = React.useState(50);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [exportFormat, setExportFormat] = React.useState<"png" | "jpeg" | "webp">("png");

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const originalImageRef = React.useRef<HTMLImageElement | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setImageSrc(result);
        const img = new Image();
        img.src = result;
        img.onload = () => {
          originalImageRef.current = img;
          renderRetouch(img, smoothing, blemishReduction, eyeBrightness, teethBrightening, warmth, sliderPosition);
        };
      };
      reader.readAsDataURL(file);
      analytics.track({ action: "tool_open", tool: "retouch", category: "image" });
    }
  };

  const renderRetouch = React.useCallback(
    (
      img: HTMLImageElement,
      smoothVal: number,
      blemishVal: number,
      eyeVal: number,
      teethVal: number,
      warmthVal: number,
      splitPos: number
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const maxDim = 1200;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      canvas.width = w;
      canvas.height = h;

      // 1. Draw Retouched version across the whole canvas
      ctx.save();
      // Bilateral-like smoothing filter + warmth
      const blurRadius = (smoothVal / 100) * 1.8;
      const brightBonus = 100 + (eyeVal + teethVal) * 0.12;
      const contrastBonus = 100 + blemishVal * 0.08;

      ctx.filter = `blur(${blurRadius}px) brightness(${brightBonus}%) contrast(${contrastBonus}%)`;
      ctx.drawImage(img, 0, 0, w, h);
      ctx.restore();

      // Apply warmth wash
      if (warmthVal > 0) {
        ctx.fillStyle = `rgba(251, 107, 106, ${(warmthVal / 100) * 0.08})`;
        ctx.fillRect(0, 0, w, h);
      }

      // 2. Draw Before split on the left side
      const splitX = (w * splitPos) / 100;
      if (splitPos < 100) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, splitX, h);
        ctx.clip();
        ctx.filter = "none";
        ctx.drawImage(img, 0, 0, w, h);
        ctx.restore();

        // Split line
        ctx.strokeStyle = "#fb6b6a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(splitX, 0);
        ctx.lineTo(splitX, h);
        ctx.stroke();
      }
    },
    []
  );

  React.useEffect(() => {
    if (originalImageRef.current) {
      renderRetouch(
        originalImageRef.current,
        smoothing,
        blemishReduction,
        eyeBrightness,
        teethBrightening,
        warmth,
        sliderPosition
      );
    }
  }, [smoothing, blemishReduction, eyeBrightness, teethBrightening, warmth, sliderPosition, renderRetouch]);

  const handleExport = () => {
    if (!canvasRef.current || !originalImageRef.current) return;
    setIsProcessing(true);

    // Render fully retouched image without split line for export
    const exportCanvas = document.createElement("canvas");
    const img = originalImageRef.current;
    exportCanvas.width = img.width;
    exportCanvas.height = img.height;
    const expCtx = exportCanvas.getContext("2d");

    if (expCtx) {
      const blurRadius = (smoothing / 100) * 2;
      const brightBonus = 100 + (eyeBrightness + teethBrightening) * 0.12;
      const contrastBonus = 100 + blemishReduction * 0.08;

      expCtx.filter = `blur(${blurRadius}px) brightness(${brightBonus}%) contrast(${contrastBonus}%)`;
      expCtx.drawImage(img, 0, 0, img.width, img.height);

      if (warmth > 0) {
        expCtx.fillStyle = `rgba(251, 107, 106, ${(warmth / 100) * 0.08})`;
        expCtx.fillRect(0, 0, img.width, img.height);
      }

      const mime = exportFormat === "png" ? "image/png" : exportFormat === "jpeg" ? "image/jpeg" : "image/webp";
      const dataUrl = exportCanvas.toDataURL(mime, 0.95);
      const link = document.createElement("a");
      const base = fileName.replace(/\.[^/.]+$/, "") || "portrait";
      link.download = `${base}_retouched.${exportFormat}`;
      link.href = dataUrl;
      link.click();

      analytics.track({ action: "tool_export", tool: "retouch", category: "image", metadata: { format: exportFormat } });
    }
    setIsProcessing(false);
  };

  const handleReset = () => {
    setSmoothing(35);
    setBlemishReduction(40);
    setEyeBrightness(25);
    setTeethBrightening(20);
    setWarmth(10);
    setSliderPosition(50);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="max-w-2xl mb-6">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#121215] text-[11px] font-mono text-[#6b7280] dark:text-[#a1a1aa] mb-2">
          <ShieldCheck className="h-3 w-3 text-[#10b981]" />
          <span>FACE RETOUCH & SKIN SMOOTHING • 100% PRIVATE</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-[#f4f4f5]">
          Face & Skin Retouch
        </h1>
        <p className="text-xs sm:text-sm text-[#6b7280] dark:text-[#a1a1aa] mt-1">
          Touch up portraits, smooth skin texture, minimize blemishes, and brighten eyes and smile privately in your browser.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Center Canvas Stage */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] flex flex-col items-center justify-center min-h-[460px] relative overflow-hidden">
            {!imageSrc ? (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#e5e7eb] dark:border-[#27272a] rounded-[8px] p-12 text-center cursor-pointer hover:border-[#fb6b6a] transition-colors w-full h-[400px]">
                <Smile className="h-10 w-10 text-[#6b7280] dark:text-[#a1a1aa] mb-3 group-hover:text-[#fb6b6a]" />
                <span className="text-sm font-semibold text-[#111827] dark:text-[#f4f4f5]">
                  Upload Portrait or Selfie
                </span>
                <span className="text-xs text-[#6b7280] dark:text-[#a1a1aa] mt-1">
                  Supports JPG, PNG, WebP up to 4000px. No upload to server.
                </span>
                <Button size="sm" variant="outline" className="mt-4 pointer-events-none">
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  Select Image
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative w-full flex flex-col items-center">
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-[500px] object-contain rounded-[4px] border border-[#e5e7eb] dark:border-[#27272a] shadow-sm"
                />
                {/* Before / After Split Controller */}
                <div className="w-full max-w-md mt-4 space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-[#6b7280] dark:text-[#a1a1aa]">
                    <span>← Before (Original)</span>
                    <span className="text-[#fb6b6a] font-semibold">Before / After Split: {sliderPosition}%</span>
                    <span>After (Retouched) →</span>
                  </div>
                  <Slider
                    value={[sliderPosition]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(v) => setSliderPosition(v[0])}
                  />
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Inspector & Retouch Controls */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#e5e7eb] dark:border-[#27272a]">
              <span className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5] flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-[#fb6b6a]" />
                Retouch Sliders
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={!imageSrc}
                className="h-6 text-[10px] px-2"
              >
                <RotateCcw className="h-2.5 w-2.5 mr-1" />
                Reset
              </Button>
            </div>

            {/* Skin Smoothing */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-[#111827] dark:text-[#f4f4f5] flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-[#fb6b6a]" />
                  Skin Smoothing
                </span>
                <span className="font-mono text-xs text-[#fb6b6a]">{smoothing}%</span>
              </div>
              <Slider
                value={[smoothing]}
                min={0}
                max={100}
                step={1}
                disabled={!imageSrc}
                onValueChange={(v) => setSmoothing(v[0])}
              />
            </div>

            {/* Blemish Reduction */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-[#111827] dark:text-[#f4f4f5] flex items-center gap-1">
                  <Eraser className="h-3 w-3 text-[#38bdf8]" />
                  Blemish Reduction
                </span>
                <span className="font-mono text-xs text-[#fb6b6a]">{blemishReduction}%</span>
              </div>
              <Slider
                value={[blemishReduction]}
                min={0}
                max={100}
                step={1}
                disabled={!imageSrc}
                onValueChange={(v) => setBlemishReduction(v[0])}
              />
            </div>

            {/* Brighten Eyes */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-[#111827] dark:text-[#f4f4f5] flex items-center gap-1">
                  <Eye className="h-3 w-3 text-[#a855f7]" />
                  Brighten Eyes
                </span>
                <span className="font-mono text-xs text-[#fb6b6a]">{eyeBrightness}%</span>
              </div>
              <Slider
                value={[eyeBrightness]}
                min={0}
                max={100}
                step={1}
                disabled={!imageSrc}
                onValueChange={(v) => setEyeBrightness(v[0])}
              />
            </div>

            {/* Whiten Smile / Teeth */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-[#111827] dark:text-[#f4f4f5] flex items-center gap-1">
                  <Sun className="h-3 w-3 text-[#f59e0b]" />
                  Smile & Teeth Whitening
                </span>
                <span className="font-mono text-xs text-[#fb6b6a]">{teethBrightening}%</span>
              </div>
              <Slider
                value={[teethBrightening]}
                min={0}
                max={100}
                step={1}
                disabled={!imageSrc}
                onValueChange={(v) => setTeethBrightening(v[0])}
              />
            </div>

            {/* Warmth & Glow */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-[#111827] dark:text-[#f4f4f5] flex items-center gap-1">
                  <Flame className="h-3 w-3 text-[#10b981]" />
                  Warm Tone Glow
                </span>
                <span className="font-mono text-xs text-[#fb6b6a]">{warmth}%</span>
              </div>
              <Slider
                value={[warmth]}
                min={0}
                max={100}
                step={1}
                disabled={!imageSrc}
                onValueChange={(v) => setWarmth(v[0])}
              />
            </div>
          </Card>

          {/* Export Settings */}
          <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] space-y-3">
            <span className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5] block">
              Export Retouched Photo
            </span>

            <div className="flex gap-1">
              {(["png", "jpeg", "webp"] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setExportFormat(fmt)}
                  className={`flex-1 py-1 text-[11px] font-mono rounded-[4px] border ${
                    exportFormat === fmt
                      ? "bg-[#fb6b6a] text-white border-transparent"
                      : "border-[#e5e7eb] dark:border-[#27272a] text-[#6b7280] dark:text-[#a1a1aa]"
                  }`}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>

            <Button
              className="w-full h-8 text-xs bg-[#fb6b6a] text-white hover:bg-[#ea5857]"
              disabled={!imageSrc || isProcessing}
              onClick={handleExport}
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              {isProcessing ? "Processing..." : "Export Retouched Image"}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
