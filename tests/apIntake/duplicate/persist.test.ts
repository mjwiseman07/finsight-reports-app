import { describe, it, expect, vi } from "vitest";
import { persistDuplicateMatch, summarizeStrategies } from "@/lib/ap-intake/duplicate/persist";
import type { DuplicateMatch } from "@/lib/ap-intake/duplicate/schema";

describe("persist duplicate matches", () => {
  it("upserts with ignoreDuplicates on conflict", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      from: () => ({ upsert }),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;

    await persistDuplicateMatch({
      supabase,
      firmId: "f1",
      firmClientId: "fc1",
      billId: "b1",
      quarantined: true,
      match: {
        matched_bill_id: "b2",
        strategy_id: "S1_exact_content_hash",
        confidence: 1,
        severity: "HIGH",
        evidence: { content_hash: "x" },
      },
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ bill_id: "b1", matched_bill_id: "b2" }),
      { onConflict: "bill_id,matched_bill_id,strategy_id", ignoreDuplicates: true },
    );
  });

  it("summarizeStrategies counts by strategy_id", () => {
    const hits: DuplicateMatch[] = [
      {
        matched_bill_id: "a",
        strategy_id: "S1_exact_content_hash",
        confidence: 1,
        severity: "HIGH",
        evidence: {},
      },
      {
        matched_bill_id: "b",
        strategy_id: "S1_exact_content_hash",
        confidence: 1,
        severity: "HIGH",
        evidence: {},
      },
      {
        matched_bill_id: "c",
        strategy_id: "S4_fuzzy_amount_window",
        confidence: 0.75,
        severity: "MEDIUM",
        evidence: {},
      },
    ];
    expect(summarizeStrategies(hits)).toEqual({
      S1_exact_content_hash: 2,
      S2_amount_vendor_date: 0,
      S3_invoice_number_vendor: 0,
      S4_fuzzy_amount_window: 1,
    });
  });
});
