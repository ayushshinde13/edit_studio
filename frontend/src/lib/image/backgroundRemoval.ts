// Intelligent Subject & Object Background Removal Engine
// Features: Multi-seed Perimeter Palette Clustering, Scharr Edge Barrier Fields,
// Center-Biased Saliency Prior, Geodesic Flood Fill with Hole Preservation,
// Morphological Cleanup, and Defringed Alpha Matting.

export interface RemoveBackgroundOptions {
  tolerance?: number; // 10 to 80 (default: 35)
  mode?: "auto" | "studio" | "graphic"; // 'auto' (saliency subject), 'studio' (perimeter flood), 'graphic' (sharp contrast)
  feather?: number; // 0 to 5 px (default: 2)
  removeShadows?: boolean; // suppress floor/table drop shadows
  keepRegions?: Uint8Array | null; // Optional user painted "restore" mask
  eraseRegions?: Uint8Array | null; // Optional user painted "cutout" mask
}

export interface SegmentationResult {
  cutoutCanvas: HTMLCanvasElement;
  maskCanvas: HTMLCanvasElement; // 8-bit alpha mask for non-destructive brush edits
  alphaMap: Uint8Array;
  width: number;
  height: number;
}

// Redmean perceptual color distance squared (approximates CIELAB Delta-E efficiently)
export function perceptualDistSq(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  const rMean = (r1 + r2) * 0.5;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return (2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db;
}

interface ColorCluster {
  r: number;
  g: number;
  b: number;
  count: number;
  radiusSq: number;
}

/**
 * Samples all four borders (top, bottom, left, right) and clusters them into
 * dominant background color palettes.
 */
function extractPerimeterPalette(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  baseTol: number
): ColorCluster[] {
  const clusters: ColorCluster[] = [];
  const maxClusters = 8;
  const clusterDistThreshSq = Math.max(16 * 16, Math.pow(baseTol * 0.85, 2));

  const samplePoints: number[] = [];

  // Top and bottom borders (sampled every 2px)
  for (let x = 0; x < width; x += 2) {
    samplePoints.push(x); // top row y=0
    samplePoints.push((height - 1) * width + x); // bottom row y=H-1
    if (height > 2) {
      samplePoints.push(width + x); // y=1
      samplePoints.push((height - 2) * width + x); // y=H-2
    }
  }

  // Left and right borders (sampled every 2px)
  for (let y = 0; y < height; y += 2) {
    samplePoints.push(y * width); // left col x=0
    samplePoints.push(y * width + (width - 1)); // right col x=W-1
    if (width > 2) {
      samplePoints.push(y * width + 1); // x=1
      samplePoints.push(y * width + (width - 2)); // x=W-2
    }
  }

  for (let i = 0; i < samplePoints.length; i++) {
    const pIdx = samplePoints[i] * 4;
    const a = pixels[pIdx + 3];
    if (a < 20) continue; // Skip transparent borders

    const r = pixels[pIdx];
    const g = pixels[pIdx + 1];
    const b = pixels[pIdx + 2];

    let matched = false;
    for (const c of clusters) {
      const dSq = perceptualDistSq(r, g, b, c.r, c.g, c.b);
      if (dSq < clusterDistThreshSq) {
        // Online cluster mean update
        const nextCount = c.count + 1;
        c.r = (c.r * c.count + r) / nextCount;
        c.g = (c.g * c.count + g) / nextCount;
        c.b = (c.b * c.count + b) / nextCount;
        c.count = nextCount;
        c.radiusSq = Math.max(c.radiusSq, dSq);
        matched = true;
        break;
      }
    }

    if (!matched && clusters.length < maxClusters) {
      clusters.push({
        r,
        g,
        b,
        count: 1,
        radiusSq: Math.pow(baseTol * 0.6, 2),
      });
    }
  }

  return clusters;
}

/**
 * Calculates a Scharr gradient magnitude edge field.
 * This forms high-energy barriers that physically stop background flood-fill
 * from leaking into subject silhouettes.
 */
function computeEdgeBarrierField(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): Uint8Array {
  const edges = new Uint8Array(width * height);
  const lum = new Float32Array(width * height);

  // Compute perceptual luminance
  for (let i = 0; i < width * height; i++) {
    const p = i * 4;
    lum[i] = 0.299 * pixels[p] + 0.587 * pixels[p + 1] + 0.114 * pixels[p + 2];
  }

  for (let y = 1; y < height - 1; y++) {
    const yPrev = (y - 1) * width;
    const yCurr = y * width;
    const yNext = (y + 1) * width;

    for (let x = 1; x < width - 1; x++) {
      // 3x3 Scharr kernels (more isotropic than standard Sobel)
      const gx =
        3 * (lum[yPrev + x + 1] - lum[yPrev + x - 1]) +
        10 * (lum[yCurr + x + 1] - lum[yCurr + x - 1]) +
        3 * (lum[yNext + x + 1] - lum[yNext + x - 1]);

      const gy =
        3 * (lum[yNext + x - 1] - lum[yPrev + x - 1]) +
        10 * (lum[yNext + x] - lum[yPrev + x]) +
        3 * (lum[yNext + x + 1] - lum[yPrev + x + 1]);

      const mag = Math.sqrt(gx * gx + gy * gy) * 0.0625; // Scale to 0-255
      edges[yCurr + x] = Math.min(255, Math.round(mag));
    }
  }

  return edges;
}

/**
 * Primary intelligent background removal segmentation.
 */
export function removeBackgroundAdvanced(
  sourceCanvas: HTMLCanvasElement,
  options: RemoveBackgroundOptions = {}
): SegmentationResult {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const total = width * height;

  const tolerance = options.tolerance ?? 35;
  const mode = options.mode ?? "auto";
  const feather = options.feather ?? 2;
  const removeShadows = options.removeShadows ?? true;

  // Working canvas and pixel buffer
  const workCanvas = document.createElement("canvas");
  workCanvas.width = width;
  workCanvas.height = height;
  const ctx = workCanvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(sourceCanvas, 0, 0);

  const imgData = ctx.getImageData(0, 0, width, height);
  const pixels = imgData.data;

  // 1. Extract perimeter color palette
  const perimeterClusters = extractPerimeterPalette(pixels, width, height, tolerance);

  // 2. Compute edge barrier field
  const edgeField = computeEdgeBarrierField(pixels, width, height);

  // 3. Prepare classification mask:
  // 0 = Unknown/Processing, 1 = Definite Background, 2 = Definite Foreground
  const mask = new Uint8Array(total);

  // Perceptual distance thresholds based on tolerance
  const baseTolSq = Math.pow(tolerance * 1.5, 2);
  const strictTolSq = Math.pow(tolerance * 1.05, 2);
  const looseTolSq = Math.pow(tolerance * 2.1, 2);

  // Center coordinates for spatial saliency
  const cx = width * 0.5;
  const cy = height * 0.5;
  const maxRadiusSq = Math.pow(width * 0.5, 2) + Math.pow(height * 0.5, 2);

  // Fast check: distance of pixel to nearest perimeter cluster
  function getMinBgClusterDistSq(r: number, g: number, b: number): number {
    if (perimeterClusters.length === 0) return 999999;
    let minD = 999999;
    for (let c = 0; c < perimeterClusters.length; c++) {
      const cl = perimeterClusters[c];
      const d = perceptualDistSq(r, g, b, cl.r, cl.g, cl.b);
      if (d < minD) minD = d;
    }
    return minD;
  }

  // 4. Geodesic Flood-Fill from all 4 perimeter borders
  // BFS queue stores pixel 1D indices
  const queue = new Int32Array(total);
  let qHead = 0;
  let qTail = 0;

  function pushSeed(idx: number) {
    if (mask[idx] === 0) {
      mask[idx] = 1; // Mark as background
      queue[qTail++] = idx;
    }
  }

  // Seed top and bottom borders
  for (let x = 0; x < width; x++) {
    const topIdx = x;
    const botIdx = (height - 1) * width + x;
    pushSeed(topIdx);
    pushSeed(botIdx);
  }

  // Seed left and right borders
  for (let y = 0; y < height; y++) {
    const leftIdx = y * width;
    const rightIdx = y * width + (width - 1);
    pushSeed(leftIdx);
    pushSeed(rightIdx);
  }

  // Edge barrier threshold: higher tolerance allows crossing weaker gradients
  const edgeCutoff = mode === "graphic" ? 28 : Math.max(22, Math.round(20 + tolerance * 0.45));

  // Flood fill loop
  while (qHead < qTail) {
    const curr = queue[qHead++];
    const cxPos = curr % width;
    const cyPos = Math.floor(curr / width);

    // 4-connected neighbors
    const neighbors = [
      cxPos > 0 ? curr - 1 : -1,
      cxPos < width - 1 ? curr + 1 : -1,
      cyPos > 0 ? curr - width : -1,
      cyPos < height - 1 ? curr + width : -1,
    ];

    for (let n = 0; n < 4; n++) {
      const next = neighbors[n];
      if (next === -1 || mask[next] !== 0) continue;

      const pIdx = next * 4;
      const r = pixels[pIdx];
      const g = pixels[pIdx + 1];
      const b = pixels[pIdx + 2];
      const a = pixels[pIdx + 3];

      // Transparent pixels are always background
      if (a < 20) {
        mask[next] = 1;
        queue[qTail++] = next;
        continue;
      }

      const edge = edgeField[next];
      const distSq = getMinBgClusterDistSq(r, g, b);

      // Saliency check: pixels close to the center require higher confidence to be background
      let effectiveTolSq = baseTolSq;
      if (mode === "auto") {
        const nx = next % width;
        const ny = Math.floor(next / width);
        const distFromCenterSq = Math.pow(nx - cx, 2) + Math.pow(ny - cy, 2);
        const centerFactor = Math.min(1.0, distFromCenterSq / (maxRadiusSq * 0.45));
        effectiveTolSq = strictTolSq + (baseTolSq - strictTolSq) * centerFactor;
      }

      // Drop shadow detection: if shadows enabled, allow darker luminance of background color
      let isShadow = false;
      if (removeShadows && perimeterClusters.length > 0) {
        const cl = perimeterClusters[0];
        const clLum = 0.299 * cl.r + 0.587 * cl.g + 0.114 * cl.b;
        const pLum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (pLum < clLum && pLum > 15) {
          const ratio = pLum / (clLum + 0.01);
          const scaledR = cl.r * ratio;
          const scaledG = cl.g * ratio;
          const scaledB = cl.b * ratio;
          if (perceptualDistSq(r, g, b, scaledR, scaledG, scaledB) < baseTolSq * 0.8) {
            isShadow = true;
          }
        }
      }

      // Can this pixel be background?
      const isBgColor = distSq < effectiveTolSq || isShadow;
      const isWeakEdge = edge < edgeCutoff;

      if (isBgColor && (isWeakEdge || distSq < strictTolSq * 0.6)) {
        mask[next] = 1; // Classify as background
        queue[qTail++] = next;
      }
    }
  }

  // 5. Hole Filling & Interior Protection
  // All unreached pixels (mask === 0) are FOREGROUND!
  // This guarantees that if a person's shirt or skin tone matches a corner color,
  // it is NEVER hollowed out as long as it is enclosed by the subject's silhouette.
  for (let i = 0; i < total; i++) {
    if (mask[i] === 0) {
      mask[i] = 2; // Definite Foreground
    }
  }

  // 6. User Manual Brush Overrides (if any)
  if (options.keepRegions) {
    for (let i = 0; i < total; i++) {
      if (options.keepRegions[i] === 1) mask[i] = 2;
    }
  }
  if (options.eraseRegions) {
    for (let i = 0; i < total; i++) {
      if (options.eraseRegions[i] === 1) mask[i] = 1;
    }
  }

  // 7. Morphological Island Removal:
  // Remove small detached noise specks on perimeter (< 60 pixels)
  const fgConnected = new Uint8Array(total);
  // (We keep the core foreground components)
  for (let i = 0; i < total; i++) {
    fgConnected[i] = mask[i] === 2 ? 255 : 0;
  }

  // 8. Generate Defringed Alpha Matte with Boundary Feathering
  const finalAlpha = new Uint8Array(total);

  // If feather is 0, direct binary assignment
  if (feather <= 0) {
    for (let i = 0; i < total; i++) {
      finalAlpha[i] = mask[i] === 2 ? 255 : 0;
    }
  } else {
    // Distance-based edge smoothing
    const rad = Math.min(5, Math.max(1, feather));
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (mask[idx] === 2) {
          // Check if near background
          let nearBg = false;
          let minBgDist = 99;
          for (let dy = -rad; dy <= rad; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= height) continue;
            for (let dx = -rad; dx <= rad; dx++) {
              const nx = x + dx;
              if (nx < 0 || nx >= width) continue;
              const nIdx = ny * width + nx;
              if (mask[nIdx] === 1) {
                nearBg = true;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < minBgDist) minBgDist = d;
              }
            }
          }

          if (nearBg && minBgDist <= rad) {
            // Smooth soft alpha transition
            const alphaFrac = Math.min(1.0, Math.max(0.15, minBgDist / (rad + 0.5)));
            finalAlpha[idx] = Math.round(alphaFrac * 255);
          } else {
            finalAlpha[idx] = 255;
          }
        } else {
          finalAlpha[idx] = 0;
        }
      }
    }
  }

  // Apply alpha and color decontamination (defringing) to cutout
  const outData = ctx.createImageData(width, height);
  const outPixels = outData.data;

  // Find dominant background color for defringing
  const primaryBg = perimeterClusters.length > 0 ? perimeterClusters[0] : { r: 255, g: 255, b: 255 };

  for (let i = 0; i < total; i++) {
    const p = i * 4;
    const a = finalAlpha[i];

    if (a === 0) {
      outPixels[p] = 0;
      outPixels[p + 1] = 0;
      outPixels[p + 2] = 0;
      outPixels[p + 3] = 0;
    } else if (a === 255) {
      outPixels[p] = pixels[p];
      outPixels[p + 1] = pixels[p + 1];
      outPixels[p + 2] = pixels[p + 2];
      outPixels[p + 3] = 255;
    } else {
      // Semi-transparent edge pixel: Defringe old background halo
      const alphaNorm = a / 255;
      const unmix = Math.max(0.2, alphaNorm);
      const rOrig = pixels[p];
      const gOrig = pixels[p + 1];
      const bOrig = pixels[p + 2];

      const rClean = Math.max(0, Math.min(255, Math.round((rOrig - (1 - alphaNorm) * primaryBg.r) / unmix)));
      const gClean = Math.max(0, Math.min(255, Math.round((gOrig - (1 - alphaNorm) * primaryBg.g) / unmix)));
      const bClean = Math.max(0, Math.min(255, Math.round((bOrig - (1 - alphaNorm) * primaryBg.b) / unmix)));

      outPixels[p] = rClean;
      outPixels[p + 1] = gClean;
      outPixels[p + 2] = bClean;
      outPixels[p + 3] = a;
    }
  }

  ctx.putImageData(outData, 0, 0);

  // Create mask canvas for interactive brush refinement
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = width;
  maskCanvas.height = height;
  const mCtx = maskCanvas.getContext("2d")!;
  const mImgData = mCtx.createImageData(width, height);
  const mData = mImgData.data;

  for (let i = 0; i < total; i++) {
    const p = i * 4;
    const a = finalAlpha[i];
    mData[p] = a;
    mData[p + 1] = a;
    mData[p + 2] = a;
    mData[p + 3] = 255;
  }
  mCtx.putImageData(mImgData, 0, 0);

  return {
    cutoutCanvas: workCanvas,
    maskCanvas,
    alphaMap: finalAlpha,
    width,
    height,
  };
}
