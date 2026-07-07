import { createServiceClient } from "@/lib/supabase/service";
import { registerAssertion } from "./registry";

export async function evaluateVendorResolvedOrQuarantined(subject: Record<string, unknown>) {
  const firmId = subject.firm_id as string;
  const billId = subject.bill_id as string;
  if (!firmId || !billId) {
    return { status: "error" as const, reason: "missing_subject_fields" };
  }
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("ap_intake_bills")
    .select("vendor_resolution_method, resolved_vendor_id")
    .eq("firm_id", firmId)
    .eq("id", billId)
    .maybeSingle();
  if (error || !data) {
    return { status: "error" as const, reason: "bill_row_missing" };
  }
  const method = data.vendor_resolution_method as string | null;
  if (method === "exact" && data.resolved_vendor_id) {
    return { status: "pass" as const, evidence: { method } };
  }
  if (method === "fuzzy_candidate") {
    return { status: "pass" as const, evidence: { method } };
  }
  if (method === "no_match") {
    return { status: "pass" as const, evidence: { method, via: "quarantine_signal" } };
  }
  return { status: "fail" as const, severity: "HIGH" as const, evidence: { method } };
}

registerAssertion({
  id: "vendor_resolved_or_quarantined",
  layer: "L1",
  evaluate: evaluateVendorResolvedOrQuarantined,
});
