"use client";

import * as React from "react";
import {
  Maximize,
  Upload,
  Download,
  FolderArchive,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/design-system/primitives/button";
import { Slider } from "@/design-system/primitives/slider";
import { Card, CardHeader, CardTitle, CardContent } from "@/design-system/primitives/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/design-system/primitives/input";
import { resizeImage } from "@/lib/image/imageProcessing";
import { zipSync } from "fflate";
import { formatBytes } from "@/lib/utils";

interface ImageFileItem {
  id: string;
  file: File;
  previewUrl: string;
  originalWidth: number;
  originalHeight: number;
}

const SOCIAL_PRESETS = [
  { label: "Instagram Post (1:1)", w: 1080, h: 1080 },
  { label: "Instagram Story (9:16)", w: 1080, h: 1920 },
  { label: "YouTube Thumbnail (16:9)", w: 1280, h: 720 },
  { label: "Facebook Cover", w: 820, h: 312 },
  { label: "WhatsApp DP", w: 500, h: 500 },
];

export default function ResizeImagePage() {
  const [items, setItems] = React.useState<ImageFileItem[]>([]);
  const [mode, setMode] = React.useState<"preset" | "exact" | "percent">("preset");
  const [targetWidth, setTargetWidth] = React.useState(1080);
  const [targetHeight, setTargetHeight] = React.useState(1080);
  const [percentScale, setPercentScale] = React.useState(50);
  const [format, setFormat] = React.useState<"image/jpeg" | "image/png" | "image/webp">("image/jpeg");
  const [quality, setQuality] = React.useState(85);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;

    Array.from(fileList).forEach((f) => {
      const url = URL.createObjectURL(f);
      const img = new Image();
      img.src = url;
      img.onload = () => {
        setItems((prev) => [
          ...prev,
          {
            id: `img_${Date.now()}_${Math.random()}`,
            file: f,
            previewUrl: url,
            originalWidth: img.width,
            originalHeight: img.height,
          },
        ]);
      };
    });
  };

  const handleProcessAndDownloadZip = async () => {
    if (items.length === 0) return;
    setIsProcessing(true);

    try {
      const zipData: Record<string, Uint8Array> = {};

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const img = new Image();
        img.src = item.previewUrl;
        await new Promise((r) => {
          img.onload = r;
        });

        let w = targetWidth;
        let h = targetHeight;
        if (mode === "percent") {
          w = Math.round((item.originalWidth * percentScale) / 100);
          h = Math.round((item.originalHeight * percentScale) / 100);
        }

        const blob = await resizeImage(img, {
          width: w,
          height: h,
          format,
          quality: quality / 100,
          fitMode: "cover",
        });

        const ext = format === "image/png" ? "png" : format === "image/webp" ? "webp" : "jpg";
        const nameWithoutExt = item.file.name.replace(/\.[^/.]+$/, "");
        const fileName = `${nameWithoutExt}_resized_${w}x${h}.${ext}`;

        const buffer = await blob.arrayBuffer();
        zipData[fileName] = new Uint8Array(buffer);
      }

      const zipped = zipSync(zipData);
      const zipBlob = new Blob([zipped as any], { type: "application/zip" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `edito_resized_batch_${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#e5e7eb] dark:border-[#27272a]">
        <div>
          <div className="flex items-center gap-2">
            <Maximize className="h-5 w-5 text-[#fb6b6a]" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-[#f4f4f5]">
              Bulk Image Resizer & Converter
            </h1>
          </div>
          <p className="text-xs text-[#6b7280] dark:text-[#a1a1aa] mt-0.5">
            Resize batches of up to 50 photos with Lanczos scaling, social presets, and instant ZIP export.
          </p>
        </div>

        {items.length > 0 && (
          <Button
            onClick={handleProcessAndDownloadZip}
            disabled={isProcessing}
            className="h-8 text-xs px-3"
          >
            <FolderArchive className="h-3 w-3 mr-1" />
            {isProcessing ? "Processing..." : `Export ${items.length} Images (ZIP)`}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 space-y-4">
          <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215]">
            <label className="flex flex-col items-center justify-center p-6 rounded-[6px] border border-dashed border-[#d1d5db] dark:border-[#3f3f46] hover:border-[#fb6b6a] dark:hover:border-[#fb6b6a] bg-[#fbfbfb] dark:bg-[#18181c] cursor-pointer transition-colors text-center">
              <Upload className="h-8 w-8 text-[#fb6b6a] mb-2" />
              <span className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
                Select or drop images (up to 50 files)
              </span>
              <span className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa] mt-1">
                JPG, PNG, WebP, AVIF, GIF (100% Client-Side Processing)
              </span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFiles}
                className="hidden"
              />
            </label>
          </Card>

          {items.length > 0 && (
            <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215]">
              <div className="flex items-center justify-between pb-3 border-b border-[#e5e7eb] dark:border-[#27272a] mb-3">
                <span className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
                  Batch Queue ({items.length} files)
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[10px] text-red-500 hover:text-red-400"
                  onClick={() => setItems([])}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-80 overflow-y-auto">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c]"
                  >
                    <div className="h-20 w-full rounded-[4px] overflow-hidden bg-zinc-800 mb-1.5">
                      <img
                        src={item.previewUrl}
                        alt={item.file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-[11px] truncate text-[#111827] dark:text-[#f4f4f5] font-medium">
                      {item.file.name}
                    </div>
                    <div className="text-[10px] text-[#6b7280] dark:text-[#a1a1aa] font-mono">
                      {item.originalWidth}x{item.originalHeight} • {formatBytes(item.file.size)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Settings */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] space-y-4">
            <div className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5] pb-2 border-b border-[#e5e7eb] dark:border-[#27272a]">
              Resize Parameters
            </div>

            {/* Mode Selector */}
            <div className="grid grid-cols-3 gap-1 bg-[#fbfbfb] dark:bg-[#18181c] p-0.5 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a]">
              {(["preset", "exact", "percent"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`py-1 text-[11px] rounded-[4px] font-medium capitalize transition-colors ${
                    mode === m
                      ? "bg-[#fb6b6a] text-white"
                      : "text-[#6b7280] dark:text-[#a1a1aa]"
                  }`}
                >
                  {m === "preset" ? "Presets" : m === "exact" ? "Exact Px" : "Scale %"}
                </button>
              ))}
            </div>

            {/* Presets */}
            {mode === "preset" && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {SOCIAL_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => {
                      setTargetWidth(p.w);
                      setTargetHeight(p.h);
                    }}
                    className={`w-full text-left p-2 rounded-[4px] text-xs flex items-center justify-between border transition-colors ${
                      targetWidth === p.w && targetHeight === p.h
                        ? "bg-[#fb6b6a]/10 border-[#fb6b6a] text-[#fb6b6a] font-medium"
                        : "border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] text-[#111827] dark:text-[#f4f4f5]"
                    }`}
                  >
                    <span>{p.label}</span>
                    <span className="font-mono text-[10px] text-[#6b7280] dark:text-[#a1a1aa]">{p.w}x{p.h}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Exact Pixels */}
            {mode === "exact" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa]">Width (px)</Label>
                  <Input
                    type="number"
                    value={targetWidth}
                    onChange={(e) => setTargetWidth(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa]">Height (px)</Label>
                  <Input
                    type="number"
                    value={targetHeight}
                    onChange={(e) => setTargetHeight(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {/* Percent */}
            {mode === "percent" && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-[#6b7280] dark:text-[#a1a1aa]">
                  <span>Downscale Factor</span>
                  <span className="font-mono text-[#fb6b6a] font-semibold">{percentScale}%</span>
                </div>
                <Slider
                  value={[percentScale]}
                  min={10}
                  max={100}
                  step={5}
                  onValueChange={(v) => setPercentScale(v[0])}
                />
              </div>
            )}

            {/* Format & Quality */}
            <div className="pt-2 border-t border-[#e5e7eb] dark:border-[#27272a] space-y-2">
              <Label className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa]">Format</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["image/jpeg", "image/png", "image/webp"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setFormat(fmt)}
                    className={`py-1 text-xs font-mono uppercase rounded-[4px] border transition-colors ${
                      format === fmt
                        ? "bg-[#fb6b6a] text-white border-transparent"
                        : "border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] text-[#111827] dark:text-[#f4f4f5]"
                    }`}
                  >
                    {fmt.replace("image/", "")}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
