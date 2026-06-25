/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsGovernmentContractData: true
 *
 * GC-1 Gate exports — consumed by scripts/verify-gc-1.js
 */

export type GateCase = {
  id: string;
  gate: "A" | "B" | "C" | "D" | "E";
  poison: boolean;
  run: () => { pass: boolean; reason: string; escalationAudits?: string[] };
};
