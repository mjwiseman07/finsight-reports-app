import { createHash } from "node:crypto";
import { upsertMemory } from "@/lib/memory/client-memory-service";
import type { Accumulator, LearnedLine, LearningSource } from "../types";

type Group = {
  vendorId: string;
  vendorName: string;
  accountId: string;
  bucket: number;
  dates: string[];
};

const CADENCES: Array<{ days: number; label: string }> = [
  { days: 7, label: "weekly" },
  { days: 14, label: "biweekly" },
  { days: 30, label: "monthly" },
  { days: 90, label: "quarterly" },
  { days: 365, label: "annual" },
];

/** Round to nearest $10 (<$1k), $100 ($1k–$10k), $1,000 (>$10k). */
export function amountBucket(amount: number): number {
  const a = Math.abs(amount);
  if (a < 1000) return Math.round(a / 10) * 10;
  if (a < 10000) return Math.round(a / 100) * 100;
  return Math.round(a / 1000) * 1000;
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime();
  return ms / 86400000;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + Math.round(days));
  return d.toISOString().slice(0, 10);
}

function mean(nums: number[]): number {
  return nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
}

function stddev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const m = mean(nums);
  const variance = nums.reduce((s, n) => s + (n - m) ** 2, 0) / (nums.length - 1);
  return Math.sqrt(variance);
}

export class RecurringAccumulator implements Accumulator {
  private map = new Map<string, Group>();

  add(line: LearnedLine) {
    if (!line.vendor_id || !line.account_id) return;
    const bucket = amountBucket(line.amount);
    const key = `${line.vendor_id}|${line.account_id}|${bucket}`;
    const g = this.map.get(key) ?? {
      vendorId: line.vendor_id,
      vendorName: line.vendor_name ?? "",
      accountId: line.account_id,
      bucket,
      dates: [],
    };
    if (line.txn_date) g.dates.push(line.txn_date);
    this.map.set(key, g);
  }

  async flush(firmClientId: string, source: LearningSource) {
    let count = 0;
    for (const g of this.map.values()) {
      if (g.dates.length < 3) continue;
      const sorted = [...new Set(g.dates)].sort();
      if (sorted.length < 3) continue;

      const deltas: number[] = [];
      for (let i = 1; i < sorted.length; i++) deltas.push(daysBetween(sorted[i - 1], sorted[i]));
      const meanDelta = mean(deltas);
      if (meanDelta <= 0) continue;
      const cv = stddev(deltas) / meanDelta;
      if (cv >= 0.15) continue;

      const match = CADENCES.find((c) => Math.abs(meanDelta - c.days) / c.days <= 0.15);
      if (!match) continue;

      const lastSeen = sorted[sorted.length - 1];
      const nextExpected = addDays(lastSeen, meanDelta);
      const fingerprint = createHash("sha256")
        .update(`${g.vendorId}|${g.accountId}|${g.bucket}|${match.label}`)
        .digest("hex");
      const confidence = Number(Math.max(0, Math.min(1, 1 - cv)).toFixed(3));
      const dayOfMonth =
        match.label === "monthly" || match.label === "quarterly" || match.label === "annual"
          ? new Date(lastSeen + "T00:00:00Z").getUTCDate()
          : undefined;

      await upsertMemory({
        firmClientId,
        memoryType: "recurring_pattern",
        memoryId: `mem_${firmClientId}_recurring_${fingerprint}`,
        confidenceScore: confidence,
        entityType: "vendor",
        entityId: g.vendorId,
        payload: {
          fingerprint_hash: fingerprint,
          vendor_id: g.vendorId,
          vendor_name: g.vendorName,
          account_id: g.accountId,
          amount: g.bucket,
          cadence: match.label,
          day_of_month: dayOfMonth,
          sample_count: sorted.length,
          next_expected_date: nextExpected,
          confidence,
          source,
        },
      });
      count++;
    }
    return { patterns_written: count };
  }
}
