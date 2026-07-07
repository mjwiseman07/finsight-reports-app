import type { SupabaseClient } from "@supabase/supabase-js";
import { getVendorBaseline } from "./baseline";
import { detectUnitPriceDrift } from "./detectors/unit-price-drift";
import { detectThresholdSplitting } from "./detectors/threshold-splitting";
import { detectRoundNumberClustering } from "./detectors/round-number";
import { detectOffHoursSubmission } from "./detectors/off-hours";
import type { AnomalyDetectionResult, AnomalySignal } from "./schema";

export async function detectAnomalies(args: {
  supabase: SupabaseClient;
  firmId: string;
  firmClientId: string;
  vendorId: string;
  billId: string;
  invoiceAmountCents: number | null;
  receivedAt: string;
  approvalThresholdCents: number | null;
}): Promise<AnomalyDetectionResult> {
  const baseline = await getVendorBaseline({
    supabase: args.supabase,
    firmClientId: args.firmClientId,
    vendorId: args.vendorId,
  });

  const signals: AnomalySignal[] = [];

  if (baseline) {
    const s1 = detectUnitPriceDrift({
      invoiceAmountCents: args.invoiceAmountCents,
      baseline,
    });
    if (s1) signals.push(s1);

    const s3 = detectRoundNumberClustering({
      invoiceAmountCents: args.invoiceAmountCents,
      baseline,
    });
    if (s3) signals.push(s3);

    const s4 = detectOffHoursSubmission({
      receivedAt: args.receivedAt,
      baseline,
    });
    if (s4) signals.push(s4);
  }

  // Threshold splitting does not require baseline — always run
  const s2 = await detectThresholdSplitting({
    supabase: args.supabase,
    firmClientId: args.firmClientId,
    vendorId: args.vendorId,
    invoiceAmountCents: args.invoiceAmountCents,
    approvalThresholdCents: args.approvalThresholdCents,
  });
  if (s2) signals.push(s2);

  return {
    signals,
    hasHighSeverity: signals.some((s) => s.severity === "HIGH"),
  };
}
