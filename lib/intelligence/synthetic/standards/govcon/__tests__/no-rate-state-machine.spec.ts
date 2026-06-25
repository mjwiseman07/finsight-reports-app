/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsGovernmentContractData: true
 *
 * GC-1 negative guard — no FPRA→PBR→Final→ICS rate-state machine in Wave 1.
 */

export const GOVCON_RATE_STATE_MACHINE_FORBIDDEN = true;

export function assertNoRateStateMachineInSource(source: string): {
  pass: boolean;
  reason: string;
} {
  const forbidden = ["RateState", "FPRA_TO_PBR", "rate-state-machine", "dcaa-rate-reconcile"];
  const hit = forbidden.find((token) => source.includes(token));
  if (hit) {
    return { pass: false, reason: `forbidden token present: ${hit}` };
  }
  return { pass: true, reason: "no rate-state machine scaffolding" };
}
