"use client";

import * as React from "react";
import {
  Grid,
  Upload,
  Download,
  Trash2,
} from "lucide-react";
import { Button } from "@/design-system/primitives/button";
import { Slider } from "@/design-system/primitives/slider";
import { Card, CardHeader, CardTitle, CardContent } from "@/design-system/primitives/card";
import { Label } from "@/components/ui/label";

export default function MakeCollagePage() {
  const [images, setImages] = React.useState<string[]>([]);
  const [spacing, setSpacing] = React.useState(10);
  const [borderRadius, setBorderRadius] = React.useState(8);
  const [bgColor, setBgColor] = React.useState("#121215");
  const [layout, setLayout] = React.useState<"2-col" | "3-grid" | "4-grid">("4-grid");

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const urls = Array.from(files).map((f) => URL.createObjectURL(f));
    setImages((prev) => [...prev, ...urls].slice(0, 6));
  };

  React.useEffect(() => {
    if (images.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 1000;
    canvas.width = size;
    canvas.height = size;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);

    const loadedImages: HTMLImageElement[] = [];
    let count = 0;

    images.forEach((src) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        count++;
        if (count === images.length) {
          drawGrid(ctx, size);
        }
      };
      loadedImages.push(img);
    });

    const drawGrid = (context: CanvasRenderingContext2D, s: number) => {
      const cols = layout === "2-col" ? 2 : layout === "3-grid" ? 3 : 2;
      const rows = layout === "4-grid" ? 2 : 1;
      const cellW = (s - spacing * (cols + 1)) / cols;
      const cellH = (s - spacing * (rows + 1)) / rows;

      loadedImages.forEach((img, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = spacing + col * (cellW + spacing);
        const y = spacing + row * (cellH + spacing);

        context.save();
        context.beginPath();
        context.roundRect(x, y, cellW, cellH, borderRadius);
        context.clip();
        context.drawImage(img, x, y, cellW, cellH);
        context.restore();
      });
    };
  }, [images, spacing, borderRadius, bgColor, layout]);

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/jpeg", 0.95);
    a.download = `edito_collage_${Date.now()}.jpg`;
    a.click();
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#e5e7eb] dark:border-[#27272a]">
        <div>
          <div className="flex items-center gap-2">
            <Grid className="h-5 w-5 text-[#fb6b6a]" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-[#f4f4f5]">
              Photo Collage Maker
            </h1>
          </div>
          <p className="text-xs text-[#6b7280] dark:text-[#a1a1aa] mt-0.5">
            Assemble multi-photo grid templates with customizable spacing and rounded framing.
          </p>
        </div>

        {images.length > 0 && (
          <Button onClick={handleExport} className="h-8 text-xs px-3">
            <Download className="h-3 w-3 mr-1" />
            Export Collage
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8">
          <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] flex flex-col items-center justify-center min-h-[440px]">
            {images.length === 0 ? (
              <label className="flex flex-col items-center justify-center p-8 rounded-[6px] border border-dashed border-[#d1d5db] dark:border-[#3f3f46] hover:border-[#fb6b6a] dark:hover:border-[#fb6b6a] bg-[#fbfbfb] dark:bg-[#18181c] cursor-pointer transition-colors text-center">
                <Grid className="h-8 w-8 text-[#fb6b6a] mb-2" />
                <span className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
                  Select 2 to 6 photos for your collage
                </span>
                <span className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa] mt-1">
                  JPG, PNG, WebP (Instant grid assembly)
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFiles}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="p-2 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a]">
                <canvas
                  ref={canvasRef}
                  className="max-w-full rounded-[4px] aspect-square object-contain"
                />
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#e5e7eb] dark:border-[#27272a]">
              <span className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
                Grid Template
              </span>
              {images.length > 0 && (
                <button
                  onClick={() => setImages([])}
                  className="text-[10px] text-red-500 hover:text-red-400"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1 bg-[#fbfbfb] dark:bg-[#18181c] p-0.5 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a]">
              {(["2-col", "3-grid", "4-grid"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLayout(l)}
                  className={`py-1 text-[11px] font-mono uppercase rounded-[4px] transition-colors ${
                    layout === l
                      ? "bg-[#fb6b6a] text-white"
                      : "text-[#6b7280] dark:text-[#a1a1aa]"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-[#6b7280] dark:text-[#a1a1aa]">
                <span>Tile Spacing</span>
                <span className="font-mono text-[#fb6b6a]">{spacing}px</span>
              </div>
              <Slider
                value={[spacing]}
                min={0}
                max={30}
                step={2}
                onValueChange={(v) => setSpacing(v[0])}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-[#6b7280] dark:text-[#a1a1aa]">
                <span>Corner Radius</span>
                <span className="font-mono text-[#fb6b6a]">{borderRadius}px</span>
              </div>
              <Slider
                value={[borderRadius]}
                min={0}
                max={24}
                step={2}
                onValueChange={(v) => setBorderRadius(v[0])}
              />
            </div>

            <div className="pt-2 border-t border-[#e5e7eb] dark:border-[#27272a] space-y-1.5">
              <Label className="text-xs text-[#6b7280] dark:text-[#a1a1aa]">Frame Color</Label>
              <div className="flex items-center gap-1.5">
                {["#121215", "#ffffff", "#000000", "#fb6b6a", "#38bdf8", "#10b981"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setBgColor(c)}
                    className={`h-6 w-6 rounded-[3px] border ${
                      bgColor === c ? "border-[#111827] dark:border-white ring-1 ring-[#fb6b6a]" : "border-zinc-700"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
