import type { CacheMetrics } from "./types";

export function createMetricsAccumulator(): {
  metrics: CacheMetrics;
  bump(field: keyof Omit<CacheMetrics, "currentSize" | "currentSizePHI" | "approxBytes">): void;
} {
  const metrics = {
    hits: 0,
    misses: 0,
    writes: 0,
    evictionsLRU: 0,
    evictionsTTL: 0,
    invalidationsOrg: 0,
    purgesPHI: 0,
    currentSize: 0,
    currentSizePHI: 0,
    approxBytes: 0,
  };

  return {
    metrics,
    bump(field) {
      metrics[field] += 1;
    },
  };
}
