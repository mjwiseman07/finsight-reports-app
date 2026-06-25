/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsGovernmentContractData: true
 *
 * Scattered doctrine flag — HC-2 containsPHI parity (GAP-2=A).
 * No global doctrine-binding union introduced in GC-1.
 */

import type { GovConDoctrineFlag } from "./__init__/types";

export const GOVCON_DOCTRINE_FLAGS = {
  containsVerticalComplianceLogic: true as const,
  builderNeverAuthorsContent: true as const,
  isNotReplacementForHuman: true as const,
  humanWorkerParityDoctrine: true as const,
  containsGovernmentContractData: true as const,
};

export type GovConDoctrineBinding = keyof typeof GOVCON_DOCTRINE_FLAGS;

export function assertGovConDoctrineFlag(flag: GovConDoctrineFlag): true {
  if (!GOVCON_DOCTRINE_FLAGS[flag]) {
    throw Object.assign(new Error(`GovCon doctrine flag missing: ${flag}`), {
      name: "GovConDoctrineViolation",
      code: "GOVCON_DOCTRINE_MISSING",
      escalationAudits: [
        {
          channel: "escalation-audit" as const,
          code: "GOVCON_DOCTRINE_MISSING",
          message: `Required doctrine flag ${flag} is not declared true`,
        },
      ],
    });
  }
  return true;
}

export function govConDoctrineHeaderPresent(source: string): boolean {
  return (
    source.includes("containsGovernmentContractData: true") &&
    source.includes("containsVerticalComplianceLogic: true") &&
    source.includes("builderNeverAuthorsContent: true")
  );
}
