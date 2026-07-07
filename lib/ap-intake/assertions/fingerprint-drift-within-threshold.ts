import { createServiceClient } from "@/lib/supabase/service";
import {
  computeDrift,
  DRIFT_THRESHOLDS,
  type FingerprintPayload,
} from "@/lib/ap-intake/fingerprint/extractor";
import { registerAssertion } from "./registry";

function rowToPayload(row: Record<string, unknown>): FingerprintPayload {
  return {
    layout_bboxes: row.layout_bboxes as FingerprintPayload["layout_bboxes"],
    font_families: row.font_families as string[],
    color_palette: row.color_palette as FingerprintPayload["color_palette"],
    phash: Buffer.from(row.phash as Uint8Array),
    dhash: Buffer.from(row.dhash as Uint8Array),
    extractor_version: row.extractor_version as string,
  };
}

export async function evaluateFingerprintDriftWithinThreshold(subject: {
  firm_id: string;
  vendor_id: string;
  version: number;
}) {
  const { firm_id, vendor_id, version } = subject;
  if (version < 2) {
    return { status: "pass" as const, reason: "first_version_no_prior" };
  }

  const supabase = createServiceClient();
  const [{ data: cur }, { data: prev }] = await Promise.all([
    supabase
      .from("vendor_invoice_fingerprints")
      .select("*")
      .eq("firm_id", firm_id)
      .eq("vendor_id", vendor_id)
      .eq("version", version)
      .maybeSingle(),
    supabase
      .from("vendor_invoice_fingerprints")
      .select("*")
      .eq("firm_id", firm_id)
      .eq("vendor_id", vendor_id)
      .eq("version", version - 1)
      .maybeSingle(),
  ]);

  if (!cur || !prev) {
    return { status: "error" as const, reason: "fingerprint_row_missing" };
  }

  const drift = computeDrift(rowToPayload(prev), rowToPayload(cur));
  return drift.within_threshold
    ? { status: "pass" as const, evidence: drift }
    : {
        status: "fail" as const,
        severity: "HIGH" as const,
        evidence: drift,
        thresholds: DRIFT_THRESHOLDS,
      };
}

registerAssertion({
  id: "fingerprint_drift_within_threshold",
  layer: "L4",
  evaluate: evaluateFingerprintDriftWithinThreshold,
});
