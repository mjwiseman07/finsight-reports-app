/**
 * Phase D6.5 Part 2 — Block 4: Strategy S2 — exact vendor + exact cents + date ±3 days.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DuplicateMatch } from "@/lib/ap-intake/duplicate/schema";

export async function runS2AmountVendorDate(args: {
  supabase: SupabaseClient;
  firmClientId: string;
  vendorId: string;
  billId: string;
  invoiceAmountCents: number | null;
  invoiceDate: string | null;
}): Promise<DuplicateMatch[]> {
  if (args.invoiceAmountCents === null || !args.invoiceDate) return [];

  const base = new Date(args.invoiceDate + "T00:00:00Z");
  const min = new Date(base);
  min.setUTCDate(base.getUTCDate() - 3);
  const max = new Date(base);
  max.setUTCDate(base.getUTCDate() + 3);
  const minIso = min.toISOString().slice(0, 10);
  const maxIso = max.toISOString().slice(0, 10);

  const { data, error } = await args.supabase
    .from("ap_intake_bills")
    .select("id, invoice_date, invoice_amount_cents")
    .eq("firm_client_id", args.firmClientId)
    .eq("resolved_vendor_id", args.vendorId)
    .eq("invoice_amount_cents", args.invoiceAmountCents)
    .gte("invoice_date", minIso)
    .lte("invoice_date", maxIso)
    .neq("id", args.billId);

  if (error) throw error;

  const rows = data ?? [];
  return rows.map((r) => ({
    matched_bill_id: r.id as string,
    strategy_id: "S2_amount_vendor_date" as const,
    confidence: 0.95,
    severity: "HIGH" as const,
    evidence: {
      matched_invoice_amount_cents: r.invoice_amount_cents,
      matched_invoice_date: r.invoice_date,
      window_days: 3,
    },
  }));
}
