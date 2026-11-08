"use client";

import * as React from "react";
import {
  Flame,
  Upload,
  Download,
  Sparkles,
  Sliders,
} from "lucide-react";
import { Button } from "@/design-system/primitives/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/design-system/primitives/card";
import { applyShaderEffect } from "@/lib/image/imageProcessing";

const SHADERS = [
  { id: "retro", name: "Vintage 1980", desc: "Warm highlights and rich nostalgic fade" },
  { id: "cyberpunk", name: "Cyberpunk Neon", desc: "Electric blues and hot magenta contrast" },
  { id: "vignette", name: "Cinematic Vignette", desc: "Soft dark edge falloff framing" },
  { id: "glitch", name: "RGB Glitch Slice", desc: "Chromatic aberration and horizontal slice" },
  { id: "blackwhite", name: "Noir Mono", desc: "High dynamic range black and white" },
  { id: "warm", name: "Golden Sunset", desc: "Amber golden hour warmth" },
] as const;

export default function ApplyEffectsPage() {
  const [imageSrc, setImageSrc] = React.useState<string | null>(null);
  const [activeShader, setActiveShader] = React.useState<string>("retro");

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setImageSrc(URL.createObjectURL(f));
    }
  };

  React.useEffect(() => {
    if (!imageSrc) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      canvas.width = Math.min(img.width, 900);
      canvas.height = (img.height / img.width) * canvas.width;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      applyShaderEffect(canvas, activeShader as any);
    };
  }, [imageSrc, activeShader]);

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/jpeg", 0.95);
    a.download = `edito_effect_${activeShader}_${Date.now()}.jpg`;
    a.click();
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#e5e7eb] dark:border-[#27272a]">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-[#fb6b6a]" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-[#f4f4f5]">
              Online Photo Filters & WebGL Effects
            </h1>
          </div>
          <p className="text-xs text-[#6b7280] dark:text-[#a1a1aa] mt-0.5">
            Aesthetic LUT shaders: Vintage 1980, Cyberpunk, Vignette, and RGB Glitch.
          </p>
        </div>

        {imageSrc && (
          <Button onClick={handleExport} className="h-8 text-xs px-3">
            <Download className="h-3 w-3 mr-1" />
            Export Photo
          </Button>
        )}
      </div>

      {!imageSrc ? (
        <Card className="max-w-xl mx-auto p-8 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215]">
          <label className="flex flex-col items-center justify-center p-8 rounded-[6px] border border-dashed border-[#d1d5db] dark:border-[#3f3f46] hover:border-[#fb6b6a] dark:hover:border-[#fb6b6a] bg-[#fbfbfb] dark:bg-[#18181c] cursor-pointer transition-colors text-center">
            <Flame className="h-8 w-8 text-[#fb6b6a] mb-2" />
            <span className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
              Select an image to apply aesthetic filters
            </span>
            <span className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa] mt-1">
              Supports JPG, PNG, WebP (Real-time Canvas Shaders)
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
          <div className="lg:col-span-8">
            <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] flex flex-col items-center justify-center min-h-[440px]">
              <div className="canvas-checkerboard p-2 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a]">
                <canvas
                  ref={canvasRef}
                  className="max-w-full rounded-[4px]"
                />
              </div>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] space-y-2">
              <div className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5] pb-2 border-b border-[#e5e7eb] dark:border-[#27272a]">
                Select Filter Preset
              </div>

              <div className="space-y-1.5">
                {SHADERS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveShader(s.id)}
                    className={`w-full text-left p-2.5 rounded-[6px] border transition-colors ${
                      activeShader === s.id
                        ? "bg-[#fb6b6a]/10 border-[#fb6b6a]"
                        : "border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] hover:border-[#fb6b6a]/50"
                    }`}
                  >
                    <div className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
                      {s.name}
                    </div>
                    <div className="text-[10px] text-[#6b7280] dark:text-[#a1a1aa] mt-0.5">
                      {s.desc}
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
