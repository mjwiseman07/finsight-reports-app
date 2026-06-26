/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsGovernmentContractData: true
 *
 * Industry-layer doctrine — structural enforcement (GC-2).
 * Imports scattered flag from standards-layer GC-1; no global DoctrineBinding union.
 */

import {
  GOVCON_DOCTRINE_FLAGS,
  assertGovConDoctrineFlag,
} from "../../../standards/govcon/doctrine";

export const INDUSTRY_GOVCON_DOCTRINE = {
  ...GOVCON_DOCTRINE_FLAGS,
  /** Structural assertion: every public GC-2 function emits dcaa-rate-audit or escalation-audit */
  structuralEnforcement: true as const,
};

export { assertGovConDoctrineFlag };

export function assertStructuralGovernmentContractData(): true {
  if (!INDUSTRY_GOVCON_DOCTRINE.containsGovernmentContractData) {
    throw new Error("containsGovernmentContractData must be structurally true");
  }
  return true;
}
