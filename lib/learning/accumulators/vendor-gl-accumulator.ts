import { upsertMemory } from "@/lib/memory/client-memory-service";
import { wilsonScoreLower } from "../confidence";
import type { Accumulator, LearnedLine, LearningSource } from "../types";

type VendorTotals = {
  total: number;
  byAccount: Map<string, number>;
  accountNames: Map<string, string>;
  vendorName: string;
  firstSeen: string;
  lastSeen: string;
};

export class VendorGLAccumulator implements Accumulator {
  private map = new Map<string, VendorTotals>();

  add(line: LearnedLine) {
    if (!line.vendor_id) return;
    const v = this.map.get(line.vendor_id) ?? {
      total: 0,
      byAccount: new Map<string, number>(),
      accountNames: new Map<string, string>(),
      vendorName: line.vendor_name ?? "",
      firstSeen: line.txn_date,
      lastSeen: line.txn_date,
    };
    v.total += 1;
    v.byAccount.set(line.account_id, (v.byAccount.get(line.account_id) ?? 0) + 1);
    if (line.account_name) v.accountNames.set(line.account_id, line.account_name);
    if (line.txn_date && line.txn_date < v.firstSeen) v.firstSeen = line.txn_date;
    if (line.txn_date && line.txn_date > v.lastSeen) v.lastSeen = line.txn_date;
    this.map.set(line.vendor_id, v);
  }

  async flush(firmClientId: string, source: LearningSource) {
    let count = 0;
    for (const [vendorId, v] of this.map) {
      for (const [accountId, matching] of v.byAccount) {
        const confidence = wilsonScoreLower(matching, v.total);
        const weak = matching < 3 || confidence < 0.5;
        await upsertMemory({
          firmClientId,
          memoryType: "vendor_gl_mapping",
          memoryId: `mem_${firmClientId}_vendor_gl_${vendorId}_${accountId}`,
          confidenceScore: confidence,
          entityType: "vendor",
          entityId: vendorId,
          payload: {
            vendor_id: vendorId,
            vendor_name: v.vendorName,
            account_id: accountId,
            account_name: v.accountNames.get(accountId) ?? "",
            sample_count: v.total,
            matching_count: matching,
            confidence: Number(confidence.toFixed(3)),
            weak,
            first_seen_date: v.firstSeen,
            last_seen_date: v.lastSeen,
            source,
          },
        });
        count++;
      }
    }
    return { patterns_written: count };
  }
}
