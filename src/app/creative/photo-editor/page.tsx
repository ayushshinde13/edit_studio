"use client";

import * as React from "react";
import {
  Wand2,
  Crop,
  RotateCw,
  Sliders,
  Type,
  Pencil,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/design-system/primitives/button";
import { Slider } from "@/design-system/primitives/slider";
import { Card, CardHeader, CardTitle, CardContent } from "@/design-system/primitives/card";
import { Label } from "@/components/ui/label";
import { analytics } from "@/lib/analytics/tracker";

export default function PhotoEditorPage() {
  const [imageSrc, setImageSrc] = React.useState<string | null>(null);
  const [brightness, setBrightness] = React.useState(100);
  const [contrast, setContrast] = React.useState(100);
  const [saturation, setSaturation] = React.useState(100);
  const [rotation, setRotation] = React.useState(0);
  const [flipH, setFlipH] = React.useState(false);
  const [drawingMode, setDrawingMode] = React.useState(false);
  const [brushColor, setBrushColor] = React.useState("#fb6b6a");
  const [brushSize, setBrushSize] = React.useState(5);

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const isDrawing = React.useRef(false);

  React.useEffect(() => {
    if (!imageSrc) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      canvas.width = Math.min(img.width, 1000);
      canvas.height = (img.height / img.width) * canvas.width;

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, 1);
      ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
      ctx.restore();
    };
  }, [imageSrc, brightness, contrast, saturation, rotation, flipH]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setImageSrc(URL.createObjectURL(f));
    }
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingMode) return;
    isDrawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !drawingMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDraw = () => {
    isDrawing.current = false;
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `edito_photo_${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#e5e7eb] dark:border-[#27272a]">
        <div>
          <div className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-[#fb6b6a]" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-[#f4f4f5]">
              Photo Canvas Editor
            </h1>
          </div>
          <p className="text-xs text-[#6b7280] dark:text-[#a1a1aa] mt-0.5">
            Crop, rotate, brush sketch, and adjust lighting levels inside canvas memory.
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
            <Upload className="h-8 w-8 text-[#fb6b6a] mb-2" />
            <span className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
              Select an image file to edit
            </span>
            <span className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa] mt-1">
              Supports JPG, PNG, WebP, AVIF (Zero server transfer)
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
          {/* Main Stage (8 cols) */}
          <div className="lg:col-span-8">
            <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] flex flex-col items-center justify-center min-h-[440px] overflow-hidden">
              <div className="canvas-checkerboard p-2 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a]">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  className={`max-w-full rounded-[4px] ${
                    drawingMode ? "cursor-crosshair" : "cursor-default"
                  }`}
                />
              </div>
            </Card>
          </div>

          {/* Right Parameters Pane (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] space-y-4">
              <div className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5] pb-2 border-b border-[#e5e7eb] dark:border-[#27272a]">
                Color Levels & Adjustments
              </div>

              {/* Sliders */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-[#6b7280] dark:text-[#a1a1aa]">
                  <span>Brightness</span>
                  <span className="font-mono text-[#fb6b6a]">{brightness}%</span>
                </div>
                <Slider
                  value={[brightness]}
                  min={20}
                  max={200}
                  step={1}
                  onValueChange={(v) => setBrightness(v[0])}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-[#6b7280] dark:text-[#a1a1aa]">
                  <span>Contrast</span>
                  <span className="font-mono text-[#fb6b6a]">{contrast}%</span>
                </div>
                <Slider
                  value={[contrast]}
                  min={20}
                  max={200}
                  step={1}
                  onValueChange={(v) => setContrast(v[0])}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-[#6b7280] dark:text-[#a1a1aa]">
                  <span>Saturation</span>
                  <span className="font-mono text-[#fb6b6a]">{saturation}%</span>
                </div>
                <Slider
                  value={[saturation]}
                  min={0}
                  max={200}
                  step={1}
                  onValueChange={(v) => setSaturation(v[0])}
                />
              </div>

              {/* Transforms */}
              <div className="pt-2 border-t border-[#e5e7eb] dark:border-[#27272a]">
                <span className="text-xs font-medium text-[#6b7280] dark:text-[#a1a1aa] block mb-2">
                  Orientation
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                  >
                    <RotateCw className="h-3 w-3 mr-1" />
                    Rotate 90°
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() => setFlipH((f) => !f)}
                  >
                    Flip Horiz.
                  </Button>
                </div>
              </div>

              {/* Draw */}
              <div className="pt-2 border-t border-[#e5e7eb] dark:border-[#27272a]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[#6b7280] dark:text-[#a1a1aa]">
                    Canvas Pen
                  </span>
                  <Button
                    size="sm"
                    variant={drawingMode ? "default" : "outline"}
                    className="h-6 text-[10px] px-2"
                    onClick={() => setDrawingMode(!drawingMode)}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    {drawingMode ? "Active" : "Toggle"}
                  </Button>
                </div>

                {drawingMode && (
                  <div className="flex items-center gap-1.5">
                    {["#fb6b6a", "#38bdf8", "#10b981", "#f59e0b", "#ffffff", "#000000"].map((c) => (
                      <button
                        key={c}
                        onClick={() => setBrushColor(c)}
                        className={`h-5 w-5 rounded-[3px] border ${
                          brushColor === c ? "border-[#111827] dark:border-white ring-1 ring-[#fb6b6a]" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
