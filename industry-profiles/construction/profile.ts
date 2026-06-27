/**
 * @doctrine containsConstructionContractData: true
 * @audit-channel poc-progress-audit (introduced in CON-2 — emitted via factory once channel exists)
 * @framework us-gaap | ifrs (resolved at runtime via LOCK-41.5 treatment-resolver — switch wired in CON-2)
 * @sub-segments G | S | R | C | H | D
 * @last-verified 2026-06-26
 * @spec Phase_CON_1_Recon_Spec.md v1.0
 */

import type { ConstructionSubSegmentId } from "../../lib/intelligence/synthetic/libraries/construction/types";

export const CONSTRUCTION_SUB_SEGMENTS: ConstructionSubSegmentId[] = ["G", "S", "R", "C", "H", "D"];

export const CONSTRUCTION_FRAMEWORKS = ["US_GAAP", "IFRS"] as const;

export const constructionWave1Profile = {
  vertical: "construction",
  wave: 1,
  subSegments: CONSTRUCTION_SUB_SEGMENTS,
  frameworks: CONSTRUCTION_FRAMEWORKS,
  applicableStandards: [
    "ASC 606", "ASC 340-40", "ASC 842", "ASC 460", "ASC 810", "ASC 323", "ASC 360",
    "IFRS 15", "IFRS 16", "IFRIC 12", "AICPA AAG-CON", "AIA G702/G703",
  ],
  auditPosture: "reconnaissance",
  staticOnly: true,
  auditChannelReserved: "poc-progress-audit",
};


import { classifyConstructionSubSegment } from "../../lib/intelligence/synthetic/industry/construction/sub-segment-classifier";

/** Back-compat shim — new consumers use runtime classifier (CON-2). */
export function resolveConstructionSubSegment(input: {
  naicsCode: string;
  backlogUsd?: number;
  designBuildEngagement?: boolean;
  containsConstructionContractData?: boolean;
}) {
  return classifyConstructionSubSegment({ ...input, containsConstructionContractData: true });
}
