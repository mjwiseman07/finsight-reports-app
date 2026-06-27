/**
 * @audit-channel arr-mrr-audit
 * @framework us-gaap | ifrs
 * @sub-segments P | H | U | F | V
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */

import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { resolveSaasCitationHandle } from "../handles";
import { SaasViolation } from "../errors";

export const MODULE_HANDLES = ["ASC.985-20-25-1", "ASC.985-20-25-2"] as const;

export function resolveModuleHandles(ctx: { containsSaaSARRData?: boolean }) {
  assertContainsSaaSARRData(ctx);
  return MODULE_HANDLES.map((id) => resolveSaasCitationHandle(id));
}

export function classifyHostingVsLicense(ctx: { containsSaaSARRData?: boolean }, input: { treatedAs: "hosting" | "license"; hostingIndicators: boolean }) {
  assertContainsSaaSARRData(ctx);
  if (input.hostingIndicators && input.treatedAs === "license") {
    throw SaasViolation("SAAS_HOSTING_LICENSE_MISCLASS", "Hosting arrangement misclassified as license");
  }
  return { classification: input.treatedAs };
}
