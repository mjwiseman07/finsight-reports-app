import { describe, it, expect } from "vitest";
import {
  EXTRACTOR_VERSION,
  computeDrift,
  perceptualHash8x8,
  differenceHash9x8,
  rasterFromSeed,
  type FingerprintPayload,
} from "@/lib/ap-intake/fingerprint/extractor";

function baseFp(seed: string, colorShift = 0): FingerprintPayload {
  const img = rasterFromSeed(seed);
  if (colorShift) {
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = Math.min(255, img.data[i] + colorShift);
    }
  }
  return {
    layout_bboxes: [
      { x: 0, y: 0, w: img.width, h: 12, region_kind: "header" },
      { x: 0, y: 12, w: img.width, h: 40, region_kind: "body" },
    ],
    font_families: ["sans-serif"],
    color_palette: [[10, 20, 30, 50]],
    phash: perceptualHash8x8(img),
    dhash: differenceHash9x8(img),
    extractor_version: EXTRACTOR_VERSION,
  };
}

describe("fingerprint extractor", () => {
  it("exports EXTRACTOR_VERSION non-empty", () => {
    expect(EXTRACTOR_VERSION).toBeTruthy();
    expect(EXTRACTOR_VERSION).toBe("l4-v1.0.0");
  });

  it("pHash output is exactly 8 bytes; dHash output is 10 bytes", () => {
    const img = rasterFromSeed("hash-len");
    expect(perceptualHash8x8(img)).toHaveLength(8);
    expect(differenceHash9x8(img)).toHaveLength(10);
  });

  it("computeDrift reports within_threshold true for nearly-identical rasters", () => {
    const prior = baseFp("near-identical-a");
    const current = baseFp("near-identical-a");
    const drift = computeDrift(prior, current);
    expect(drift.within_threshold).toBe(true);
    expect(drift.worst_signal).toBeNull();
  });

  it("computeDrift reports within_threshold false for swapped color palette", () => {
    const prior = baseFp("palette-a", 0);
    const current = baseFp("palette-a", 0);
    prior.color_palette = [[0, 0, 0, 50]];
    current.color_palette = [[255, 255, 255, 50]];
    const drift = computeDrift(prior, current);
    expect(drift.within_threshold).toBe(false);
    expect(drift.worst_signal).toBe("color_delta_e_max");
  });
});
