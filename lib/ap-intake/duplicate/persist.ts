/**
 * Phase D6.5 Part 2 — Block 4: idempotent insert into ap_intake_bill_duplicates.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DuplicateMatch, DuplicateStrategyId } from "@/lib/ap-intake/duplicate/schema";

export async function persistDuplicateMatch(args: {
  supabase: SupabaseClient;
  firmId: string;
  firmClientId: string;
  billId: string;
  match: DuplicateMatch;
  quarantined: boolean;
}): Promise<void> {
  const { error } = await args.supabase.from("ap_intake_bill_duplicates").upsert(
    {
      firm_id: args.firmId,
      firm_client_id: args.firmClientId,
      bill_id: args.billId,
      matched_bill_id: args.match.matched_bill_id,
      strategy_id: args.match.strategy_id,
      confidence: args.match.confidence,
      severity: args.match.severity,
      evidence: args.match.evidence,
      quarantined: args.quarantined,
    },
    { onConflict: "bill_id,matched_bill_id,strategy_id", ignoreDuplicates: true },
  );

  if (error) throw error;
}

export function summarizeStrategies(hits: DuplicateMatch[]): Record<DuplicateStrategyId, number> {
  const out: Record<string, number> = {
    S1_exact_content_hash: 0,
    S2_amount_vendor_date: 0,
    S3_invoice_number_vendor: 0,
    S4_fuzzy_amount_window: 0,
  };
  for (const h of hits) out[h.strategy_id] = (out[h.strategy_id] ?? 0) + 1;
  return out as Record<DuplicateStrategyId, number>;
}

export async function listDuplicatesForBill(
  supabase: SupabaseClient,
  billId: string,
): Promise<unknown[]> {
  const { data, error } = await supabase
    .from("ap_intake_bill_duplicates")
    .select("*")
    .eq("bill_id", billId)
    .order("detected_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Phase TCP1 W2.5 Block 7 — period-scoped duplicate reader for Review Assist.
 * Read-only. Returns the rows deposited by persistDuplicateMatch during the
 * close period, filtered to a given firm_client_id.
 */
export async function listDuplicatesForPeriod(
  supabase: SupabaseClient,
  args: { firmClientId: string; periodStart: string; periodEnd: string },
): Promise<Array<{
  bill_id: string;
  matched_bill_id: string;
  strategy_id: string;
  confidence: number | null;
  severity: string;
  evidence: unknown;
  quarantined: boolean;
  detected_at: string;
}>> {
  const { data, error } = await supabase
    .from("ap_intake_bill_duplicates")
    .select(
      "bill_id, matched_bill_id, strategy_id, confidence, severity, evidence, quarantined, detected_at",
    )
    .eq("firm_client_id", args.firmClientId)
    .gte("detected_at", args.periodStart)
    .lte("detected_at", args.periodEnd + "T23:59:59.999Z")
    .order("detected_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Array<{
    bill_id: string;
    matched_bill_id: string;
    strategy_id: string;
    confidence: number | null;
    severity: string;
    evidence: unknown;
    quarantined: boolean;
    detected_at: string;
  }>;
}
