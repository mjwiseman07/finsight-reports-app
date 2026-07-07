import type { SupabaseClient } from "@supabase/supabase-js";
import type { VendorBaseline } from "./schema";

export async function getVendorBaseline(args: {
  supabase: SupabaseClient;
  firmClientId: string;
  vendorId: string;
  windowDays?: number;
}): Promise<VendorBaseline | null> {
  const windowDays = args.windowDays ?? 180;
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await args.supabase
    .from("bill_history")
    .select("invoice_amount_cents, received_at")
    .eq("firm_client_id", args.firmClientId)
    .eq("vendor_id", args.vendorId)
    .eq("quarantined", false)
    .gte("received_at", since)
    .order("received_at", { ascending: false })
    .limit(500);

  if (error) return null;
  const rows = (data ?? []).filter(
    (r): r is { invoice_amount_cents: number; received_at: string } =>
      typeof r.invoice_amount_cents === "number" && typeof r.received_at === "string",
  );
  if (rows.length < 5) return null;

  const amounts = rows.map((r) => r.invoice_amount_cents);
  const mean = amounts.reduce((s, v) => s + v, 0) / amounts.length;
  const variance = amounts.reduce((s, v) => s + (v - mean) ** 2, 0) / amounts.length;
  const stddev = Math.sqrt(variance);

  const sorted = [...amounts].sort((a, b) => a - b);
  const percentile = (p: number): number => {
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
    return sorted[idx];
  };

  const hours = rows.map((r) => new Date(r.received_at).getUTCHours());
  const hourMean = hours.reduce((s, v) => s + v, 0) / hours.length;
  const hourVar = hours.reduce((s, v) => s + (v - hourMean) ** 2, 0) / hours.length;
  const hourStd = Math.sqrt(hourVar);

  const roundCount = amounts.filter((a) => a % 10000 === 0).length;
  const roundRatio = roundCount / amounts.length;

  return {
    sample_size: amounts.length,
    amount_mean_cents: Math.round(mean),
    amount_stddev_cents: Math.round(stddev),
    amount_p25_cents: percentile(25),
    amount_p75_cents: percentile(75),
    avg_arrival_hour_utc: Number(hourMean.toFixed(2)),
    arrival_hour_stddev: Number(hourStd.toFixed(2)),
    round_amount_ratio: Number(roundRatio.toFixed(3)),
  };
}
