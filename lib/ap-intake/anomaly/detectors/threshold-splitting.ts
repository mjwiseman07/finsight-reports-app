import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnomalySignal } from "../schema";

export async function detectThresholdSplitting(args: {
  supabase: SupabaseClient;
  firmClientId: string;
  vendorId: string;
  invoiceAmountCents: number | null;
  approvalThresholdCents: number | null;
}): Promise<AnomalySignal | null> {
  if (args.invoiceAmountCents == null) return null;
  const threshold = args.approvalThresholdCents ?? 1_000_000; // default $10,000
  const lower = Math.floor(threshold * 0.9);
  if (args.invoiceAmountCents < lower || args.invoiceAmountCents >= threshold) return null;

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await args.supabase
    .from("bill_history")
    .select("invoice_amount_cents, received_at")
    .eq("firm_client_id", args.firmClientId)
    .eq("vendor_id", args.vendorId)
    .gte("received_at", since)
    .gte("invoice_amount_cents", lower)
    .lt("invoice_amount_cents", threshold);

  if (error) return null;
  const priorCount = (data ?? []).length;
  if (priorCount < 1) return null;

  return {
    code: "threshold_splitting",
    severity: "HIGH",
    evidence: {
      invoice_amount_cents: args.invoiceAmountCents,
      approval_threshold_cents: threshold,
      lower_band_cents: lower,
      prior_matches_14d: priorCount,
    },
  };
}
