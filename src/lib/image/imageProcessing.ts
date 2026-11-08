// Image manipulation utilities: Resize, Inpaint Watermark, Effects, Background Cutout, and Collage

export interface ResizeOptions {
  width: number;
  height: number;
  format: "image/jpeg" | "image/png" | "image/webp";
  quality?: number; // 0 to 1
  targetSizeKB?: number;
  fitMode?: "contain" | "cover" | "stretch";
}

export async function resizeImage(
  imgSource: HTMLImageElement | ImageBitmap,
  options: ResizeOptions
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = options.width;
  canvas.height = options.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create 2D canvas");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const srcW = imgSource.width;
  const srcH = imgSource.height;
  const targetW = options.width;
  const targetH = options.height;

  if (options.fitMode === "contain") {
    const ratio = Math.min(targetW / srcW, targetH / srcH);
    const renderW = srcW * ratio;
    const renderH = srcH * ratio;
    const offsetX = (targetW - renderW) / 2;
    const offsetY = (targetH - renderH) / 2;
    ctx.drawImage(imgSource, offsetX, offsetY, renderW, renderH);
  } else if (options.fitMode === "cover") {
    const ratio = Math.max(targetW / srcW, targetH / srcH);
    const renderW = srcW * ratio;
    const renderH = srcH * ratio;
    const offsetX = (targetW - renderW) / 2;
    const offsetY = (targetH - renderH) / 2;
    ctx.drawImage(imgSource, offsetX, offsetY, renderW, renderH);
  } else {
    ctx.drawImage(imgSource, 0, 0, targetW, targetH);
  }

  // If targetSizeKB is set, binary search on quality
  if (options.targetSizeKB && options.format !== "image/png") {
    let minQ = 0.05;
    let maxQ = 1.0;
    let bestBlob: Blob | null = null;

    for (let iter = 0; iter < 6; iter++) {
      const midQ = (minQ + maxQ) / 2;
      const b = await new Promise<Blob | null>((res) => canvas.toBlob(res, options.format, midQ));
      if (!b) break;
      const sizeKB = b.size / 1024;
      bestBlob = b;
      if (sizeKB > options.targetSizeKB) {
        maxQ = midQ;
      } else {
        minQ = midQ;
      }
    }
    if (bestBlob) return bestBlob;
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      options.format,
      options.quality ?? 0.92
    );
  });
}

// High-Fidelity Continuous Radial Ray Inpainting with Boundary Relaxation
export function inpaintCanvasRegion(
  sourceCanvas: HTMLCanvasElement,
  maskCanvas: HTMLCanvasElement
): HTMLCanvasElement {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const total = width * height;

  const resultCanvas = document.createElement("canvas");
  resultCanvas.width = width;
  resultCanvas.height = height;
  const resCtx = resultCanvas.getContext("2d")!;
  resCtx.drawImage(sourceCanvas, 0, 0);

  const imgData = resCtx.getImageData(0, 0, width, height);
  const maskCtx = maskCanvas.getContext("2d")!;
  const maskData = maskCtx.getImageData(0, 0, width, height);

  const pixels = imgData.data;
  const maskPixels = maskData.data;

  // Step 1: Detect bounding box of masked pixels
  let minX = width, minY = height, maxX = 0, maxY = 0;
  let maskCount = 0;
  const initialMask = new Uint8Array(total);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const pIdx = idx * 4;
      if (maskPixels[pIdx + 3] > 15 || maskPixels[pIdx] > 40) {
        initialMask[idx] = 1;
        maskCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maskCount === 0) return resultCanvas;

  // Step 2: Dilate mask by 2px to ensure anti-aliased watermark borders are fully covered
  const mask = new Uint8Array(total);
  const dilationR = 2;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = y * width + x;
      if (initialMask[idx] === 1) {
        for (let dy = -dilationR; dy <= dilationR; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= height) continue;
          for (let dx = -dilationR; dx <= dilationR; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= width) continue;
            if (dx * dx + dy * dy <= dilationR * dilationR + 1) {
              mask[ny * width + nx] = 1;
            }
          }
        }
      }
    }
  }

  minX = Math.max(0, minX - dilationR);
  maxX = Math.min(width - 1, maxX + dilationR);
  minY = Math.max(0, minY - dilationR);
  maxY = Math.min(height - 1, maxY + dilationR);

  // Step 3: Direction-Aligned Isophote Inpainting (Material-Preserving Streamlines)
  // Fixes the "blurry smudge" bug:
  // 1. Never mix colors across material borders (green silk vs brown wood).
  // 2. Transverse rays that cross borders are strictly discarded (weight = 0).
  // 3. Structural streamlines (along the wood armrest or saree folds) receive maximum fidelity.
  const numAngles = 48;
  const cosA = new Float32Array(numAngles);
  const sinA = new Float32Array(numAngles);
  for (let a = 0; a < numAngles; a++) {
    const theta = (a * Math.PI) / numAngles;
    cosA[a] = Math.cos(theta);
    sinA[a] = Math.sin(theta);
  }

  const maxRayDist = Math.max(90, Math.max(maxX - minX, maxY - minY) * 1.8);
  const filledPixels = new Uint8ClampedArray(pixels);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = y * width + x;
      if (mask[idx] === 1) {
        let bestRSum = 0, bestGSum = 0, bestBSum = 0, bestWSum = 0;
        let fallbackR = 0, fallbackG = 0, fallbackB = 0;
        let minBoundaryDist = Infinity;

        for (let a = 0; a < numAngles; a++) {
          const dx = cosA[a];
          const dy = sinA[a];

          // Forward ray along (dx, dy)
          let d1 = 1, hit1 = false, h1X = 0, h1Y = 0;
          while (d1 <= maxRayDist) {
            const rx = Math.round(x + dx * d1);
            const ry = Math.round(y + dy * d1);
            if (rx < 0 || rx >= width || ry < 0 || ry >= height) break;
            if (mask[ry * width + rx] === 0) {
              hit1 = true;
              h1X = rx;
              h1Y = ry;
              break;
            }
            d1++;
          }

          // Backward ray along (-dx, -dy)
          let d2 = 1, hit2 = false, h2X = 0, h2Y = 0;
          while (d2 <= maxRayDist) {
            const rx = Math.round(x - dx * d2);
            const ry = Math.round(y - dy * d2);
            if (rx < 0 || rx >= width || ry < 0 || ry >= height) break;
            if (mask[ry * width + rx] === 0) {
              hit2 = true;
              h2X = rx;
              h2Y = ry;
              break;
            }
            d2++;
          }

          // Track closest single boundary pixel for fallback
          if (hit1 && d1 < minBoundaryDist) {
            minBoundaryDist = d1;
            const p1 = (h1Y * width + h1X) * 4;
            fallbackR = pixels[p1];
            fallbackG = pixels[p1 + 1];
            fallbackB = pixels[p1 + 2];
          }
          if (hit2 && d2 < minBoundaryDist) {
            minBoundaryDist = d2;
            const p2 = (h2Y * width + h2X) * 4;
            fallbackR = pixels[p2];
            fallbackG = pixels[p2 + 1];
            fallbackB = pixels[p2 + 2];
          }

          if (hit1 && hit2) {
            const p1 = (h1Y * width + h1X) * 4;
            const p2 = (h2Y * width + h2X) * 4;

            const r1 = pixels[p1], g1 = pixels[p1 + 1], b1 = pixels[p1 + 2];
            const r2 = pixels[p2], g2 = pixels[p2 + 1], b2 = pixels[p2 + 2];

            const colorDiffSq = (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2;

            // STRICT MATERIAL CONSISTENCY:
            // If color difference between opposite endpoints is large (>35 per channel),
            // this ray CROSSES a material boundary (e.g. green saree to brown wood).
            // It MUST NOT contribute ANY weight! Zero cross-material blending!
            if (colorDiffSq > 2400) continue; // ~28 color distance cutoff

            const totalDist = d1 + d2;
            // Photometric similarity: higher if endpoints have identical tone / highlight
            const simWeight = Math.exp(-colorDiffSq / (2 * 18 * 18));
            // Gentle distance falloff: doesn't penalize long streamlines along the wood railing
            const distWeight = 1.0 / (1.0 + 0.08 * totalDist);
            const w = simWeight * distWeight;

            // Smooth linear interpolation along the valid continuous streamline
            const rLine = (d2 * r1 + d1 * r2) / totalDist;
            const gLine = (d2 * g1 + d1 * g2) / totalDist;
            const bLine = (d2 * b1 + d1 * b2) / totalDist;

            bestRSum += rLine * w;
            bestGSum += gLine * w;
            bestBSum += bLine * w;
            bestWSum += w;
          }
        }

        const pT = idx * 4;
        if (bestWSum > 0.001) {
          filledPixels[pT] = Math.round(bestRSum / bestWSum);
          filledPixels[pT + 1] = Math.round(bestGSum / bestWSum);
          filledPixels[pT + 2] = Math.round(bestBSum / bestWSum);
        } else {
          // If no matching diametric streamline crossed this pixel (rare, e.g. acute corner),
          // copy the closest valid boundary pixel to prevent blur or color bleed
          filledPixels[pT] = fallbackR;
          filledPixels[pT + 1] = fallbackG;
          filledPixels[pT + 2] = fallbackB;
        }
      }
    }
  }

  // Step 4: Subtle Camera Noise Matching (Preserves photographic authenticity without blurring edges)
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = y * width + x;
      if (mask[idx] === 1) {
        const pT = idx * 4;
        const noise = (((x * 12.9898 + y * 78.233) % 1) - 0.5) * 3;
        filledPixels[pT] = Math.max(0, Math.min(255, Math.round(filledPixels[pT] + noise)));
        filledPixels[pT + 1] = Math.max(0, Math.min(255, Math.round(filledPixels[pT + 1] + noise)));
        filledPixels[pT + 2] = Math.max(0, Math.min(255, Math.round(filledPixels[pT + 2] + noise)));
      }
    }
  }

  // Step 5: Bilateral Micro-Seam Dissolve (Seamless transition without blurring sharp material boundaries)
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = y * width + x;
      if (mask[idx] === 1) {
        const bordersClean =
          (x > 0 && mask[idx - 1] === 0) ||
          (x < width - 1 && mask[idx + 1] === 0) ||
          (y > 0 && mask[idx - width] === 0) ||
          (y < height - 1 && mask[idx + width] === 0);

        if (bordersClean) {
          const pT = idx * 4;
          const currR = filledPixels[pT];
          const currG = filledPixels[pT + 1];
          const currB = filledPixels[pT + 2];

          let rN = 0, gN = 0, bN = 0, count = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const ny = y + dy, nx = x + dx;
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIdx = ny * width + nx;
                if (mask[nIdx] === 0) {
                  const nR = pixels[nIdx * 4];
                  const nG = pixels[nIdx * 4 + 1];
                  const nB = pixels[nIdx * 4 + 2];
                  // Only blend with neighbors of matching material (don't blur wood into silk)
                  const diffSq = (currR - nR) ** 2 + (currG - nG) ** 2 + (currB - nB) ** 2;
                  if (diffSq < 1800) {
                    rN += nR;
                    gN += nG;
                    bN += nB;
                    count++;
                  }
                }
              }
            }
          }
          if (count > 0) {
            filledPixels[pT] = Math.round(currR * 0.5 + (rN / count) * 0.5);
            filledPixels[pT + 1] = Math.round(currG * 0.5 + (gN / count) * 0.5);
            filledPixels[pT + 2] = Math.round(currB * 0.5 + (bN / count) * 0.5);
          }
        }
      }
    }
  }

  resCtx.putImageData(new ImageData(filledPixels, width, height), 0, 0);
  return resultCanvas;
}

// Background Removal via Edge Cutout & Threshold Matting
export function removeBackgroundCanvas(
  sourceCanvas: HTMLCanvasElement,
  tolerance = 30
): HTMLCanvasElement {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const result = document.createElement("canvas");
  result.width = width;
  result.height = height;
  const ctx = result.getContext("2d")!;
  ctx.drawImage(sourceCanvas, 0, 0);

  const imgData = ctx.getImageData(0, 0, width, height);
  const d = imgData.data;

  // Sample corner background color
  const bgR = (d[0] + d[(width - 1) * 4]) / 2;
  const bgG = (d[1] + d[(width - 1) * 4 + 1]) / 2;
  const bgB = (d[2] + d[(width - 1) * 4 + 2]) / 2;

  for (let i = 0; i < d.length; i += 4) {
    const diff = Math.sqrt(
      Math.pow(d[i] - bgR, 2) + Math.pow(d[i + 1] - bgG, 2) + Math.pow(d[i + 2] - bgB, 2)
    );
    if (diff < tolerance * 2) {
      d[i + 3] = 0; // Transparent
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return result;
}

// Creative Filters & Effects
export function applyShaderEffect(
  canvas: HTMLCanvasElement,
  effect: "retro" | "cyberpunk" | "glitch" | "vignette" | "blackwhite" | "warm"
) {
  const ctx = canvas.getContext("2d")!;
  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const d = imgData.data;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];

    if (effect === "blackwhite") {
      const avg = 0.299 * r + 0.587 * g + 0.114 * b;
      d[i] = avg;
      d[i + 1] = avg;
      d[i + 2] = avg;
    } else if (effect === "retro") {
      d[i] = Math.min(255, r * 1.2 + 20);
      d[i + 1] = Math.min(255, g * 1.0 + 10);
      d[i + 2] = Math.max(0, b * 0.8 - 10);
    } else if (effect === "cyberpunk") {
      d[i] = Math.min(255, r * 1.3);
      d[i + 1] = Math.max(0, g * 0.7);
      d[i + 2] = Math.min(255, b * 1.4 + 20);
    } else if (effect === "warm") {
      d[i] = Math.min(255, r * 1.15);
      d[i + 1] = Math.min(255, g * 1.05);
      d[i + 2] = Math.max(0, b * 0.85);
    }
  }

  ctx.putImageData(imgData, 0, 0);

  if (effect === "vignette") {
    const gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      width * 0.3,
      width / 2,
      height / 2,
      width * 0.7
    );
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0.65)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  } else if (effect === "glitch") {
    // Add RGB shift bands
    const sliceH = Math.floor(height * 0.08);
    const sliceY = Math.floor(Math.random() * (height - sliceH));
    const slice = ctx.getImageData(0, sliceY, width, sliceH);
    ctx.putImageData(slice, 15, sliceY);
  }
}

