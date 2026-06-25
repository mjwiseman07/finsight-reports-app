/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsGovernmentContractData: true
 */

import type { GovConCitationHandle, GovConSubSegmentKernel } from "./__init__/types";
import {
  GovConSubSegmentNotFound,
  GovConSubSegmentIsolationViolation,
} from "./errors";

const FAR_31_SUBPARTS = ["FAR_31_SUBPART_2", "FAR_31_201_1", "FAR_31_201_2_ALLOWABILITY"] as const;

const CAS_IN_SCOPE = [
  "CAS_401_CONSISTENCY_ESTIMATING",
  "CAS_402",
  "CAS_403",
  "CAS_405",
  "CAS_406",
  "CAS_410",
  "CAS_418",
  "CAS_420",
] as const;

const DFARS_BUSINESS_SYSTEMS = [
  "DFARS_252_242_7006",
  "DFARS_252_242_7005",
  "DFARS_252_215_7002",
  "DFARS_215_407_3",
] as const;

export const GOVCON_SUB_SEGMENT_KERNELS: Record<
  GovConSubSegmentKernel["subSegmentId"],
  GovConSubSegmentKernel
> = {
  C: {
    subSegmentId: "C",
    description: "CAS-Covered — full FAR 31 + all in-scope CAS standards; DS-1/DS-2 required",
    applicableFARSubparts: [...FAR_31_SUBPARTS, "FAR_31_204"],
    applicableCASStandards: [...CAS_IN_SCOPE, "CASB_DS_1_FORM", "CASB_DS_2_FORM"],
    applicableDFARS: [...DFARS_BUSINESS_SYSTEMS],
  },
  N: {
    subSegmentId: "N",
    description: "Non-CAS — FAR 31 only; most common SBIR / small-business path",
    applicableFARSubparts: [...FAR_31_SUBPARTS],
    applicableCASStandards: [],
    applicableDFARS: ["DFARS_252_242_7006"],
  },
  S: {
    subSegmentId: "S",
    description: "Small Business — FAR 31 + SBA size standards; self-certification path",
    applicableFARSubparts: [...FAR_31_SUBPARTS, "SBA_SIZE_STANDARDS_13_CFR_121"],
    applicableCASStandards: [],
    applicableDFARS: [],
  },
  R: {
    subSegmentId: "R",
    description: "R&D / SBIR — FAR 31 + 13 C.F.R. 121; Phase I/II/III isolation",
    applicableFARSubparts: [...FAR_31_SUBPARTS, "FAR_31_205_18_IRAD_BP"],
    applicableCASStandards: ["CAS_420_IRAD_BP"],
    applicableDFARS: ["DFARS_252_215_7002"],
  },
  F: {
    subSegmentId: "F",
    description: "FFP-Heavy — FAR 31 reasonableness only; limited DCAA touch",
    applicableFARSubparts: ["FAR_31_201_3_REASONABLENESS"],
    applicableCASStandards: [],
    applicableDFARS: [],
  },
  T: {
    subSegmentId: "T",
    description: "T&M — FAR 31 + 52.232-7; hour-rate / cost-of-materials split; MAAR 6 critical",
    applicableFARSubparts: [...FAR_31_SUBPARTS, "FAR_16_601_TM", "FAR_52_232_7"],
    applicableCASStandards: ["CAS_418_DIRECT_INDIRECT"],
    applicableDFARS: ["DFARS_252_242_7006"],
  },
};

export function getGovConSubSegmentKernel(
  subSegmentId: GovConSubSegmentKernel["subSegmentId"],
): GovConSubSegmentKernel {
  const kernel = GOVCON_SUB_SEGMENT_KERNELS[subSegmentId];
  if (!kernel) {
    throw GovConSubSegmentNotFound(subSegmentId);
  }
  return kernel;
}
export function listGovConSubSegmentIds(): GovConSubSegmentKernel["subSegmentId"][] {
  return Object.keys(GOVCON_SUB_SEGMENT_KERNELS) as GovConSubSegmentKernel["subSegmentId"][];
}

export function assertSubSegmentIsolation(
  entitySubSegment: GovConSubSegmentKernel["subSegmentId"],
  requestedHandle: string,
  allowedHandles: readonly string[],
): { allowed: boolean; escalationAudits: { channel: "escalation-audit"; code: string; message: string }[] } {
  if (!allowedHandles.includes(requestedHandle)) {
    const err = GovConSubSegmentIsolationViolation(entitySubSegment, requestedHandle);
    return { allowed: false, escalationAudits: err.escalationAudits };
  }
  return { allowed: true, escalationAudits: [] };
}

export type { GovConCitationHandle };
export * from "./doctrine";
export * from "./execCompCap";
export * from "./handles";
export * from "./errors";
