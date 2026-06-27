/**
 * @audit-channel arr-mrr-audit
 * @framework us-gaap | ifrs
 * @sub-segments P | H | U | F | V
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */

import type { SaasSubSegmentId } from "../../lib/intelligence/synthetic/libraries/saas/types";

export const SAAS_SUB_SEGMENTS: SaasSubSegmentId[] = ["P", "H", "U", "F", "V"];
export const SAAS_FRAMEWORKS = ["US_GAAP", "IFRS"] as const;

export const saasWave1Profile = {
  vertical: "saas",
  wave: 1,
  subSegments: SAAS_SUB_SEGMENTS,
  frameworks: SAAS_FRAMEWORKS,
  applicableStandards: ["ASC 606", "ASC 340-40", "ASC 985-605", "ASC 350-40", "IFRS 15", "IFRS 16", "IAS 38"],
  auditPosture: "reconnaissance",
  staticOnly: true,
  auditChannelActive: "arr-mrr-audit",
  subSegmentPosture: {
    P: { platform: true },
    H: { hosting: true },
    U: { usageBased: true },
    F: { finserv: true },
    V: { vertical: true },
  },
};


import { classifySaaSSubSegment } from "../../lib/intelligence/synthetic/industry/saas/sub-segment-classifier";

/** Back-compat shim — new consumers use runtime classifier (SAAS-2). */
export function resolveSaasSubSegment(input: {
  naicsCode: string;
  revenueMix?: Partial<Record<"P" | "H" | "U" | "F" | "V", number>>;
  containsSaaSARRData?: boolean;
}) {
  return classifySaaSSubSegment({ ...input, containsSaaSARRData: true });
}


import { classifySaaSSubSegment } from "../../lib/intelligence/synthetic/industry/saas/sub-segment-classifier";

/** Back-compat shim — new consumers use runtime classifier (SAAS-2). */
export function resolveSaaSSubSegment(input: {
  naicsCode?: string;
  hostingOnly?: boolean;
  subscriptionPricing?: boolean;
  onPremLicense?: boolean;
  revenueMix?: Partial<Record<"P" | "H" | "U" | "F" | "V", number>>;
  containsSaaSARRData?: boolean;
}) {
  return classifySaaSSubSegment({ ...input, containsSaaSARRData: true });
}
