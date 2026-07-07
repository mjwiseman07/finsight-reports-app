/**
 * Phase D6.5 Part 2 — Block 4: Multi-strategy duplicate detection orchestrator.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { publishEvent } from "@/lib/events/publisher";
import { logAiAction } from "@/lib/ai/action-logger";
import { runS1ContentHash } from "@/lib/ap-intake/duplicate/strategies/s1-content-hash";
import { runS2AmountVendorDate } from "@/lib/ap-intake/duplicate/strategies/s2-amount-vendor-date";
import { runS3InvoiceNumberVendor } from "@/lib/ap-intake/duplicate/strategies/s3-invoice-number-vendor";
import { runS4FuzzyAmountWindow } from "@/lib/ap-intake/duplicate/strategies/s4-fuzzy-amount-window";
import { persistDuplicateMatch, summarizeStrategies } from "@/lib/ap-intake/duplicate/persist";
import type {
  DuplicateDetectionResult,
  DuplicateMatch,
  DuplicateSignal,
} from "@/lib/ap-intake/duplicate/schema";

export async function detectDuplicates(args: {
  supabase: SupabaseClient;
  firmId: string;
  firmClientId: string;
  vendorId: string;
  billId: string;
  contentHash: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  invoiceAmountCents: number | null;
}): Promise<DuplicateDetectionResult> {
  const s1 = await runS1ContentHash({
    supabase: args.supabase,
    firmClientId: args.firmClientId,
    vendorId: args.vendorId,
    billId: args.billId,
    contentHash: args.contentHash,
  });

  const s2 = await runS2AmountVendorDate({
    supabase: args.supabase,
    firmClientId: args.firmClientId,
    vendorId: args.vendorId,
    billId: args.billId,
    invoiceAmountCents: args.invoiceAmountCents,
    invoiceDate: args.invoiceDate,
  });

  const s3 = await runS3InvoiceNumberVendor({
    supabase: args.supabase,
    firmClientId: args.firmClientId,
    vendorId: args.vendorId,
    billId: args.billId,
    invoiceNumber: args.invoiceNumber,
  });

  const highHits = [...s1, ...s2, ...s3];
  const highIds = new Set(highHits.map((h) => h.matched_bill_id));

  const s4 = await runS4FuzzyAmountWindow({
    supabase: args.supabase,
    firmClientId: args.firmClientId,
    vendorId: args.vendorId,
    billId: args.billId,
    invoiceAmountCents: args.invoiceAmountCents,
    invoiceDate: args.invoiceDate,
    excludeMatchedBillIds: [...highIds],
  });

  const bestByMatched = new Map<string, DuplicateMatch>();
  for (const h of [...highHits, ...s4]) {
    const key = h.matched_bill_id;
    const existing = bestByMatched.get(key);
    if (!existing || h.confidence > existing.confidence) {
      bestByMatched.set(key, h);
    }
  }

  const hits = Array.from(bestByMatched.values());
  const shouldQuarantine = hits.some((h) => h.severity === "HIGH");

  for (const h of [...highHits, ...s4]) {
    await persistDuplicateMatch({
      supabase: args.supabase,
      firmId: args.firmId,
      firmClientId: args.firmClientId,
      billId: args.billId,
      match: h,
      quarantined: shouldQuarantine && h.severity === "HIGH",
    });
  }

  const signals: DuplicateSignal[] = hits.map((h) => ({
    code: h.severity === "HIGH" ? "duplicate_detected" : "duplicate_flagged",
    severity: h.severity,
    evidence: {
      strategy_id: h.strategy_id,
      matched_bill_id: h.matched_bill_id,
      confidence: h.confidence,
      ...h.evidence,
    },
  }));

  if (hits.length > 0) {
    await publishEvent(
      {
        eventType: shouldQuarantine ? "bill.duplicate_detected" : "bill.duplicate_flagged",
        eventCategory: "ap",
        firmId: args.firmId,
        firmClientId: args.firmClientId,
        aggregateType: "bill",
        aggregateId: args.billId,
        actorType: "system",
        payload: {
          firm_client_id: args.firmClientId,
          vendor_id: args.vendorId,
          hit_count: hits.length,
          strategies: summarizeStrategies(hits),
        },
      },
      args.supabase,
    );

    await logAiAction({
      firmClientId: args.firmClientId,
      actionType: "duplicate_detection",
      actionCategory: "duplicate_detection",
      modelName: "rule-engine-l5",
      modelProvider: "local",
      input: {
        content_hash_present: args.contentHash !== null,
        invoice_number_present: args.invoiceNumber !== null,
        invoice_date_present: args.invoiceDate !== null,
        invoice_amount_present: args.invoiceAmountCents !== null,
      },
      output: {
        hit_count: hits.length,
        high_severity_count: hits.filter((h) => h.severity === "HIGH").length,
        should_quarantine: shouldQuarantine,
      },
    });
  }

  return {
    hits,
    highSeverityHits: hits.filter((h) => h.severity === "HIGH"),
    shouldQuarantine,
    signals,
  };
}
