/**
 * @audit-channel arr-mrr-audit
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
import { assertContainsSaaSARRData } from "../../lib/intelligence/synthetic/standards/doctrine/containsSaaSARRData";

export function build(ctx: { containsSaaSARRData?: boolean }) {
  assertContainsSaaSARRData(ctx);
 return { variant: "deferred-revenue-rollforward", frameworks: ["US_GAAP", "IFRS"] }; }
