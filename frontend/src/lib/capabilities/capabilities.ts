export interface SystemCapabilities {
  webgpu: boolean;
  sharedArrayBuffer: boolean;
  simd: boolean;
  deviceMemoryGB: number;
  hardwareConcurrency: number;
  deviceClass: "mobile" | "tablet" | "desktop";
  recommendedMode: "fast" | "safe";
}

export async function detectCapabilities(): Promise<SystemCapabilities> {
  if (typeof window === "undefined") {
    return {
      webgpu: false,
      sharedArrayBuffer: false,
      simd: false,
      deviceMemoryGB: 4,
      hardwareConcurrency: 4,
      deviceClass: "desktop",
      recommendedMode: "safe",
    };
  }

  // Check WebGPU
  let webgpu = false;
  if ("gpu" in navigator && typeof (navigator as any).gpu?.requestAdapter === "function") {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      webgpu = !!adapter;
    } catch {
      webgpu = false;
    }
  }

  // Check SharedArrayBuffer
  const sharedArrayBuffer = typeof SharedArrayBuffer !== "undefined";

  // Check WebAssembly SIMD
  let simd = false;
  try {
    simd = WebAssembly.validate(
      new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 125, 0, 0, 0, 0, 11])
    );
  } catch {
    simd = false;
  }

  // Memory & Concurrency
  const deviceMemoryGB = (navigator as any).deviceMemory || 4;
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;

  // Device Class heuristic
  const ua = navigator.userAgent.toLowerCase();
  let deviceClass: "mobile" | "tablet" | "desktop" = "desktop";
  if (/(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(ua)) {
    deviceClass = "tablet";
  } else if (/(mobi|ipod|phone|blackberry|opera mini|fennec|minimo|symbian|psp|nintendo ds)/.test(ua)) {
    deviceClass = "mobile";
  }

  // Choose mode
  const recommendedMode = webgpu && hardwareConcurrency >= 4 ? "fast" : "safe";

  return {
    webgpu,
    sharedArrayBuffer,
    simd,
    deviceMemoryGB,
    hardwareConcurrency,
    deviceClass,
    recommendedMode,
  };
}

