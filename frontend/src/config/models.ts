export interface AIModelMeta {
  id: string;
  name: string;
  category: "stems" | "inpainting" | "background" | "retouch";
  version: string;
  fileSize: number; // bytes
  format: "onnx" | "wasm" | "tflite";
  cdnUrl: string;
  sha256?: string;
  minFeatures: string[];
  description: string;
  fallbackAvailable: boolean;
}

export const AI_MODELS: AIModelMeta[] = [
  {
    id: "demucs-htdemucs-v4-quant",
    name: "HTDemucs 4-Stem Quantized",
    category: "stems",
    version: "4.0.1",
    fileSize: 42 * 1024 * 1024, // 42 MB
    format: "onnx",
    cdnUrl: "https://models.edito.studio/stems/htdemucs_quant.onnx",
    minFeatures: ["webgpu", "wasm"],
    description: "Separates audio into Vocals, Drums, Bass, and Other accompaniment.",
    fallbackAvailable: true
  },
  {
    id: "spleeter-2stem-fp16",
    name: "Spleeter 2-Stem Fast",
    category: "stems",
    version: "2.1.0",
    fileSize: 18 * 1024 * 1024, // 18 MB
    format: "onnx",
    cdnUrl: "https://models.edito.studio/stems/spleeter_2stems.onnx",
    minFeatures: ["wasm"],
    description: "Fast 2-stem separation for vocal extraction and backing track generation.",
    fallbackAvailable: true
  },
  {
    id: "lama-inpainting-quant",
    name: "LaMa Watermark & Object Inpainting",
    category: "inpainting",
    version: "1.2.0",
    fileSize: 32 * 1024 * 1024, // 32 MB
    format: "onnx",
    cdnUrl: "https://models.edito.studio/vision/lama_quant.onnx",
    minFeatures: ["webgpu", "wasm"],
    description: "Fills in brushed masks and erases watermarks smoothly with deep learning.",
    fallbackAvailable: true
  },
  {
    id: "modnet-portrait-cutout",
    name: "MODNet Background Cutout",
    category: "background",
    version: "1.0.4",
    fileSize: 14 * 1024 * 1024, // 14 MB
    format: "onnx",
    cdnUrl: "https://models.edito.studio/vision/modnet_portrait.onnx",
    minFeatures: ["webgpu", "wasm"],
    description: "High-resolution edge detection for instant portrait background matting.",
    fallbackAvailable: true
  }
];

