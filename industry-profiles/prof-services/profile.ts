/**
 * @doctrine containsProfessionalEngagementData: true
 * @audit-channel engagement-letter-audit (introduced in PS-2 — emitted via factory once channel exists)
 * @framework us-gaap | ifrs (resolved at runtime via LOCK-41.5 treatment-resolver — switch wired in PS-2)
 * @sub-segments L | A | M | I | E | K
 * @last-verified 2026-06-26
 * @spec Phase_PS_1_Recon_Spec.md v1.0
 */

import type { ProfServicesSubSegmentId } from "../../lib/intelligence/synthetic/libraries/prof-services/types";

export const PROF_SERVICES_SUB_SEGMENTS: ProfServicesSubSegmentId[] = ["L", "A", "M", "I", "E", "K"];

export const PROF_SERVICES_FRAMEWORKS = ["US_GAAP", "IFRS"] as const;

export const profServicesWave1Profile = {
  vertical: "prof-services",
  wave: 1,
  subSegments: PROF_SERVICES_SUB_SEGMENTS,
  frameworks: PROF_SERVICES_FRAMEWORKS,
  applicableStandards: ["ASC 606", "ASC 340-40", "IFRS 15", "IFRS 16", "IAS 38", "IAS 37"],
  auditPosture: "reconnaissance",
  staticOnly: true,
  auditChannelReserved: "engagement-letter-audit",
  subSegmentPosture: {
    L: { engagementLetter: true, coi: "structural" },
    A: { engagementLetter: true, coi: "structural", independence: true },
    M: { engagementLetter: true, coi: "conditional" },
    I: { engagementLetter: true, socHipaaGdpr: true },
    E: { engagementLetter: true, peSeal: true },
    K: { engagementLetter: true, workForHire: true },
  },
};


import { classifyProfServicesSubSegment } from "../../lib/intelligence/synthetic/industry/prof-services/sub-segment-classifier";

/** Back-compat shim — new consumers use runtime classifier (PS-2). */
export function resolveProfServicesSubSegment(input: {
  naicsCode: string;
  revenueMix?: Partial<Record<"L" | "A" | "M" | "I" | "E" | "K", number>>;
  containsProfessionalEngagementData?: boolean;
}) {
  return classifyProfServicesSubSegment({ ...input, containsProfessionalEngagementData: true });
}
