/**
 * Phase D6.5 Part 2 — Block 4: Strategy S4 — same vendor + amount ±5% + date ±14d (MEDIUM).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DuplicateMatch } from "@/lib/ap-intake/duplicate/schema";

export async function runS4FuzzyAmountWindow(args: {
  supabase: SupabaseClient;
  firmClientId: string;
  vendorId: string;
  billId: string;
  invoiceAmountCents: number | null;
  invoiceDate: string | null;
  excludeMatchedBillIds: string[];
}): Promise<DuplicateMatch[]> {
  if (args.invoiceAmountCents === null || !args.invoiceDate) return [];

  const min = Math.floor(args.invoiceAmountCents * 0.95);
  const max = Math.ceil(args.invoiceAmountCents * 1.05);
  const dateBase = new Date(args.invoiceDate + "T00:00:00Z");
  const dMin = new Date(dateBase);
  dMin.setUTCDate(dateBase.getUTCDate() - 14);
  const dMax = new Date(dateBase);
  dMax.setUTCDate(dateBase.getUTCDate() + 14);
  const dMinIso = dMin.toISOString().slice(0, 10);
  const dMaxIso = dMax.toISOString().slice(0, 10);

  const { data, error } = await args.supabase
    .from("ap_intake_bills")
    .select("id, invoice_amount_cents, invoice_date")
    .eq("firm_client_id", args.firmClientId)
    .eq("resolved_vendor_id", args.vendorId)
    .gte("invoice_amount_cents", min)
    .lte("invoice_amount_cents", max)
    .gte("invoice_date", dMinIso)
    .lte("invoice_date", dMaxIso)
    .neq("id", args.billId);

  if (error) throw error;

  const excludeSet = new Set(args.excludeMatchedBillIds);
  const rows = (data ?? []).filter((r) => !excludeSet.has(r.id as string));

  return rows.map((r) => ({
    matched_bill_id: r.id as string,
    strategy_id: "S4_fuzzy_amount_window" as const,
    confidence: 0.75,
    severity: "MEDIUM" as const,
    evidence: {
      matched_amount_cents: r.invoice_amount_cents,
      matched_date: r.invoice_date,
      amount_window_pct: 5,
      date_window_days: 14,
    },
  }));
}
