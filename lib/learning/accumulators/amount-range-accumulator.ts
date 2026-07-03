import { upsertMemory } from "@/lib/memory/client-memory-service";
import { welfordInit, welfordUpdate, welfordStddev, type WelfordState } from "../confidence";
import type { Accumulator, LearnedLine, LearningSource } from "../types";

const MAX_SAMPLES = 500;

type Group = {
  vendorId: string;
  vendorName: string;
  accountId: string;
  welford: WelfordState;
  samples: number[]; // capped sorted-on-demand array
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}

export class AmountRangeAccumulator implements Accumulator {
  private map = new Map<string, Group>();

  add(line: LearnedLine) {
    if (!line.vendor_id || !line.account_id) return;
    const key = `${line.vendor_id}|${line.account_id}`;
    const g = this.map.get(key) ?? {
      vendorId: line.vendor_id,
      vendorName: line.vendor_name ?? "",
      accountId: line.account_id,
      welford: welfordInit(),
      samples: [],
    };
    const amount = Math.abs(line.amount);
    g.welford = welfordUpdate(g.welford, amount);
    if (g.samples.length < MAX_SAMPLES) g.samples.push(amount);
    this.map.set(key, g);
  }

  async flush(firmClientId: string, source: LearningSource) {
    let count = 0;
    for (const g of this.map.values()) {
      if (g.welford.n < 5) continue;
      const sorted = [...g.samples].sort((a, b) => a - b);
      await upsertMemory({
        firmClientId,
        memoryType: "amount_range",
        memoryId: `mem_${firmClientId}_amount_range_${g.vendorId}_${g.accountId}`,
        entityType: "vendor",
        entityId: g.vendorId,
        payload: {
          vendor_id: g.vendorId,
          vendor_name: g.vendorName,
          account_id: g.accountId,
          p05: Number(percentile(sorted, 0.05).toFixed(2)),
          p50: Number(percentile(sorted, 0.5).toFixed(2)),
          p95: Number(percentile(sorted, 0.95).toFixed(2)),
          mean: Number(g.welford.mean.toFixed(2)),
          stddev: Number(welfordStddev(g.welford).toFixed(2)),
          sample_count: g.welford.n,
          last_updated: new Date().toISOString(),
          source,
        },
      });
      count++;
    }
    return { patterns_written: count };
  }
}
