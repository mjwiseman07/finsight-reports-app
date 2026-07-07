/**
 * Phase D6.5 Part 2 — Block 1: Fingerprint extractor
 * Layer 4 — Perceptual Visual Invoice Fingerprint
 */
import { logAiAction } from "@/lib/ai/action-logger";

export const EXTRACTOR_VERSION = "l4-v1.0.0";

export interface PageImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface LayoutBBox {
  x: number;
  y: number;
  w: number;
  h: number;
  region_kind: "header" | "logo" | "body" | "table" | "footer" | "signature" | "other";
}

export interface FingerprintPayload {
  layout_bboxes: LayoutBBox[];
  font_families: string[];
  color_palette: [number, number, number, number][];
  phash: Buffer;
  dhash: Buffer;
  extractor_version: string;
}

export const DRIFT_THRESHOLDS = {
  layout_bbox_iou_min: 0.85,
  color_delta_e_max: 20,
  phash_hamming_max: 8,
};

export interface DriftReport {
  layout_drift_pct: number;
  font_diff: { added: string[]; removed: string[] };
  color_delta_e_max: number;
  phash_hamming: number;
  within_threshold: boolean;
  worst_signal: string | null;
}

function grayscaleAt(img: PageImage, x: number, y: number): number {
  const idx = (y * img.width + x) * 4;
  const r = img.data[idx] ?? 0;
  const g = img.data[idx + 1] ?? 0;
  const b = img.data[idx + 2] ?? 0;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function resizeTo(img: PageImage, targetW: number, targetH: number): PageImage {
  const out = new Uint8ClampedArray(targetW * targetH * 4);
  for (let y = 0; y < targetH; y += 1) {
    for (let x = 0; x < targetW; x += 1) {
      const sx = Math.min(img.width - 1, Math.floor((x / targetW) * img.width));
      const sy = Math.min(img.height - 1, Math.floor((y / targetH) * img.height));
      const src = (sy * img.width + sx) * 4;
      const dst = (y * targetW + x) * 4;
      out[dst] = img.data[src];
      out[dst + 1] = img.data[src + 1];
      out[dst + 2] = img.data[src + 2];
      out[dst + 3] = img.data[src + 3] ?? 255;
    }
  }
  return { data: out, width: targetW, height: targetH };
}

export function detectLayoutRegions(img: PageImage): LayoutBBox[] {
  const bands: Array<{ kind: LayoutBBox["region_kind"]; start: number; end: number }> = [
    { kind: "header", start: 0, end: 0.12 },
    { kind: "logo", start: 0.12, end: 0.22 },
    { kind: "body", start: 0.22, end: 0.55 },
    { kind: "table", start: 0.55, end: 0.78 },
    { kind: "footer", start: 0.78, end: 0.92 },
    { kind: "signature", start: 0.92, end: 1 },
  ];
  return bands.map((b) => ({
    x: 0,
    y: Math.floor(b.start * img.height),
    w: img.width,
    h: Math.max(1, Math.floor((b.end - b.start) * img.height)),
    region_kind: b.kind,
  }));
}

export function enumerateFontFamilies(img: PageImage): string[] {
  let edgeCount = 0;
  for (let y = 1; y < img.height - 1; y += 2) {
    for (let x = 1; x < img.width - 1; x += 2) {
      const g = grayscaleAt(img, x, y);
      const gx = Math.abs(g - grayscaleAt(img, x + 1, y));
      const gy = Math.abs(g - grayscaleAt(img, x, y + 1));
      if (gx + gy > 40) edgeCount += 1;
    }
  }
  const density = edgeCount / Math.max(1, (img.width * img.height) / 4);
  const families = new Set<string>(["sans-serif"]);
  if (density > 0.08) families.add("serif-invoice");
  if (density > 0.14) families.add("mono-table");
  if (density > 0.2) families.add("display-logo");
  return [...families];
}

export function quantizePalette(
  img: PageImage,
  k: number,
): [number, number, number, number][] {
  const samples: Array<[number, number, number]> = [];
  const step = Math.max(1, Math.floor(Math.sqrt((img.width * img.height) / 400)));
  for (let y = 0; y < img.height; y += step) {
    for (let x = 0; x < img.width; x += step) {
      const idx = (y * img.width + x) * 4;
      samples.push([img.data[idx], img.data[idx + 1], img.data[idx + 2]]);
    }
  }
  const buckets = new Map<string, { rgb: [number, number, number]; count: number }>();
  for (const [r, g, b] of samples) {
    const key = `${Math.floor(r / 32)}-${Math.floor(g / 32)}-${Math.floor(b / 32)}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      buckets.set(key, { rgb: [r, g, b], count: 1 });
    }
  }
  const sorted = [...buckets.values()].sort((a, b) => b.count - a.count).slice(0, k);
  const total = samples.length || 1;
  return sorted.map((b) => [
    b.rgb[0],
    b.rgb[1],
    b.rgb[2],
    Math.round((b.count / total) * 1000) / 10,
  ]);
}

export function perceptualHash8x8(img: PageImage): Buffer {
  const small = resizeTo(img, 8, 8);
  const gray: number[] = [];
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      gray.push(grayscaleAt(small, x, y));
    }
  }
  const avg = gray.reduce((a, b) => a + b, 0) / gray.length;
  const bits = gray.map((v) => (v >= avg ? 1 : 0));
  const buf = Buffer.alloc(8);
  for (let i = 0; i < 64; i += 1) {
    if (bits[i]) buf[Math.floor(i / 8)] |= 1 << (i % 8);
  }
  return buf;
}

export function differenceHash9x8(img: PageImage): Buffer {
  const small = resizeTo(img, 9, 8);
  const bits: number[] = [];
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const left = grayscaleAt(small, x, y);
      const right = grayscaleAt(small, x + 1, y);
      bits.push(left < right ? 1 : 0);
    }
  }
  const buf = Buffer.alloc(10);
  for (let i = 0; i < bits.length; i += 1) {
    if (bits[i]) buf[Math.floor(i / 8)] |= 1 << (i % 8);
  }
  return buf;
}

function bboxIoU(a: LayoutBBox, b: LayoutBBox): number {
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;
  const ix1 = Math.max(a.x, b.x);
  const iy1 = Math.max(a.y, b.y);
  const ix2 = Math.min(ax2, bx2);
  const iy2 = Math.min(ay2, by2);
  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const inter = iw * ih;
  const union = a.w * a.h + b.w * b.h - inter;
  return union <= 0 ? 0 : inter / union;
}

function layoutDriftPct(prior: LayoutBBox[], current: LayoutBBox[]): number {
  if (prior.length === 0 && current.length === 0) return 0;
  const kinds = new Set([...prior, ...current].map((b) => b.region_kind));
  let worst = 0;
  for (const kind of kinds) {
    const p = prior.find((b) => b.region_kind === kind);
    const c = current.find((b) => b.region_kind === kind);
    if (!p || !c) {
      worst = Math.max(worst, 1);
      continue;
    }
    worst = Math.max(worst, 1 - bboxIoU(p, c));
  }
  return worst * 100;
}

function deltaE(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const dr = rgb1[0] - rgb2[0];
  const dg = rgb1[1] - rgb2[1];
  const db = rgb1[2] - rgb2[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function maxPaletteDeltaE(
  prior: [number, number, number, number][],
  current: [number, number, number, number][],
): number {
  let max = 0;
  for (const p of prior) {
    let best = Infinity;
    for (const c of current) {
      best = Math.min(best, deltaE([p[0], p[1], p[2]], [c[0], c[1], c[2]]));
    }
    max = Math.max(max, best === Infinity ? 0 : best);
  }
  return max;
}

function hammingDistance(a: Buffer, b: Buffer): number {
  const len = Math.min(a.length, b.length);
  let dist = 0;
  for (let i = 0; i < len; i += 1) {
    let x = a[i] ^ b[i];
    while (x) {
      dist += x & 1;
      x >>= 1;
    }
  }
  return dist + Math.abs(a.length - b.length) * 8;
}

function symmetricFontDiff(prior: string[], current: string[]): {
  added: string[];
  removed: string[];
} {
  const pSet = new Set(prior);
  const cSet = new Set(current);
  return {
    added: current.filter((f) => !pSet.has(f)),
    removed: prior.filter((f) => !cSet.has(f)),
  };
}

export function computeDrift(prior: FingerprintPayload, current: FingerprintPayload): DriftReport {
  const layout_drift_pct = layoutDriftPct(prior.layout_bboxes, current.layout_bboxes);
  const font_diff = symmetricFontDiff(prior.font_families, current.font_families);
  const color_delta_e_max = maxPaletteDeltaE(prior.color_palette, current.color_palette);
  const phash_hamming = hammingDistance(prior.phash, current.phash);

  const layoutExceeded = layout_drift_pct > (1 - DRIFT_THRESHOLDS.layout_bbox_iou_min) * 100;
  const fontExceeded = font_diff.added.length > 0 || font_diff.removed.length > 0;
  const colorExceeded = color_delta_e_max > DRIFT_THRESHOLDS.color_delta_e_max;
  const phashExceeded = phash_hamming > DRIFT_THRESHOLDS.phash_hamming_max;

  let worst_signal: string | null = null;
  if (layoutExceeded) worst_signal = "layout_drift_pct";
  else if (fontExceeded) worst_signal = "font_diff";
  else if (colorExceeded) worst_signal = "color_delta_e_max";
  else if (phashExceeded) worst_signal = "phash_hamming";

  const within_threshold = !layoutExceeded && !fontExceeded && !colorExceeded && !phashExceeded;

  return {
    layout_drift_pct,
    font_diff,
    color_delta_e_max,
    phash_hamming,
    within_threshold,
    worst_signal,
  };
}

export async function fingerprintExtract(
  pageImage: PageImage,
  firmClientId: string,
): Promise<FingerprintPayload> {
  const t0 = Date.now();

  const layout_bboxes = detectLayoutRegions(pageImage);
  const font_families = enumerateFontFamilies(pageImage).sort();
  const color_palette = quantizePalette(pageImage, 8);
  const phash = perceptualHash8x8(pageImage);
  const dhash = differenceHash9x8(pageImage);

  await logAiAction({
    firmClientId,
    actionType: "fingerprint_extract",
    actionCategory: "visual_fingerprint",
    modelName: EXTRACTOR_VERSION,
    modelProvider: "local",
    input: { width: pageImage.width, height: pageImage.height },
    output: {
      layout_region_count: layout_bboxes.length,
      font_count: font_families.length,
      palette_size: color_palette.length,
    },
    latencyMs: Date.now() - t0,
  });

  return {
    layout_bboxes,
    font_families,
    color_palette,
    phash,
    dhash,
    extractor_version: EXTRACTOR_VERSION,
  };
}

/** Build a synthetic RGBA raster for tests and non-image attachments. */
export function rasterFromSeed(seed: string, width = 64, height = 96): PageImage {
  const data = new Uint8ClampedArray(width * height * 4);
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      const r = (h + x * 3 + y * 5) % 256;
      const g = (h + x * 7 + y * 2) % 256;
      const b = (h + x * 11 + y * 13) % 256;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }
  return { data, width, height };
}
