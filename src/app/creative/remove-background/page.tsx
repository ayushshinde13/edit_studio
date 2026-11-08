"use client";

import * as React from "react";
import {
  Sparkles,
  Upload,
  Download,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/design-system/primitives/button";
import { Slider } from "@/design-system/primitives/slider";
import { Card, CardHeader, CardTitle, CardContent } from "@/design-system/primitives/card";
import { Label } from "@/components/ui/label";
import { removeBackgroundCanvas } from "@/lib/image/imageProcessing";

export default function BackgroundRemoverPage() {
  const [imageSrc, setImageSrc] = React.useState<string | null>(null);
  const [tolerance, setTolerance] = React.useState(35);
  const [bgColor, setBgColor] = React.useState<string>("transparent");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [processedCanvas, setProcessedCanvas] = React.useState<HTMLCanvasElement | null>(null);

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setImageSrc(URL.createObjectURL(f));
    }
  };

  const handleRemoveBg = async () => {
    if (!imageSrc) return;
    setIsProcessing(true);

    const img = new Image();
    img.src = imageSrc;
    await new Promise((r) => {
      img.onload = r;
    });

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const ctx = tempCanvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);

    const cutoutCanvas = removeBackgroundCanvas(tempCanvas, tolerance);
    setProcessedCanvas(cutoutCanvas);
    renderComposite(cutoutCanvas, bgColor);
    setIsProcessing(false);
  };

  const renderComposite = (cutout: HTMLCanvasElement, bg: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = cutout.width;
    canvas.height = cutout.height;
    const ctx = canvas.getContext("2d")!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (bg !== "transparent") {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(cutout, 0, 0);
  };

  React.useEffect(() => {
    if (processedCanvas) {
      renderComposite(processedCanvas, bgColor);
    }
  }, [bgColor, processedCanvas]);

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `edito_cutout_${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#e5e7eb] dark:border-[#27272a]">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#fb6b6a]" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-[#f4f4f5]">
              AI Background Remover & Transparent PNG
            </h1>
          </div>
          <p className="text-xs text-[#6b7280] dark:text-[#a1a1aa] mt-0.5">
            Automatic background extraction. Replace with studio solid color or export transparent PNG.
          </p>
        </div>

        {imageSrc && (
          <Button onClick={handleExport} className="h-8 text-xs px-3">
            <Download className="h-3 w-3 mr-1" />
            Export PNG
          </Button>
        )}
      </div>

      {!imageSrc ? (
        <Card className="max-w-xl mx-auto p-8 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215]">
          <label className="flex flex-col items-center justify-center p-8 rounded-[6px] border border-dashed border-[#d1d5db] dark:border-[#3f3f46] hover:border-[#fb6b6a] dark:hover:border-[#fb6b6a] bg-[#fbfbfb] dark:bg-[#18181c] cursor-pointer transition-colors text-center">
            <Sparkles className="h-8 w-8 text-[#fb6b6a] mb-2" />
            <span className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
              Select a portrait or product photo
            </span>
            <span className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa] mt-1">
              Supports JPG, PNG, WebP (100% in-browser matting)
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
            <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] flex flex-col items-center justify-center min-h-[440px] overflow-hidden">
              <div className="canvas-checkerboard p-2 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a]">
                <canvas
                  ref={canvasRef}
                  className="max-w-full rounded-[4px]"
                />
              </div>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] space-y-4">
              <div className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5] pb-2 border-b border-[#e5e7eb] dark:border-[#27272a]">
                Background Controls
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
                disabled={isProcessing}
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
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
