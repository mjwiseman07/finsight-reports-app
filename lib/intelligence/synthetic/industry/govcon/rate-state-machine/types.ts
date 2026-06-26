/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsGovernmentContractData: true
 */

import type { GovConSubSegmentId } from "../../../standards/govcon/__init__/types";
import type { IndirectRatePool, RateLifecycleState, RateState } from "../types";

export type { RateState, IndirectRatePool, RateLifecycleState };

export const INDIRECT_RATE_POOLS: IndirectRatePool[] = [
  "overhead",
  "g_and_a",
  "fringe",
  "materials_handling",
];

export const DCAA_ICS_VARIANCE_THRESHOLD = 0.02;
