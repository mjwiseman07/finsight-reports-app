/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsGovernmentContractData: true
 *
 * FPRA → PBR → Final → ICS rate-state machine (all 4 pools per Q2=A).
 */

import type { GcAuditEmitter } from "../audit/gc-audit-emitter";
import { emitEscalationAudit } from "../audit/gc-audit-emitter";
import { RateStateViolation } from "../errors";
import type { IndirectRatePool, RateState } from "./types";
import { DCAA_ICS_VARIANCE_THRESHOLD } from "./types";

function baseState(pool: IndirectRatePool, state: RateState["state"], rate: number): RateState {
  return {
    pool,
    state,
    rate,
    timestampMs: Date.now(),
    icsFinalized: false,
    containsGovernmentContractData: true,
  };
}

export function transitionFPRAtoPBR(
  fpra: RateState,
  pbrRate: number,
  varianceDocumented: boolean,
  emitter: GcAuditEmitter,
  subSegmentId: RateState["pool"] extends never ? never : "C" | "N" | "S" | "R" | "F" | "T" = "C",
): RateState {
  if (fpra.state !== "FPRA") throw RateStateViolation("Source must be FPRA");
  if (pbrRate > (fpra.fpraCeiling ?? fpra.rate) && !varianceDocumented) {
    emitEscalationAudit(emitter, {
      code: "GOVCON_PBR_EXCEEDS_FPRA",
      message: "PBR exceeds FPRA ceiling without documented variance",
      subSegmentId,
      handleId: "DCMA_MAN_2201_01_FPRA",
    });
    emitter.emitDcaaRateAudit({
      subSegmentId,
      decisionType: "fpra-to-pbr-transition",
      evidence: { pbrRate, fpraCeiling: fpra.fpraCeiling ?? fpra.rate },
      outcome: "rejected-escalation",
      handleId: "DCMA_MAN_2201_01_FPRA",
    });
    throw RateStateViolation("PBR exceeds FPRA without variance");
  }
  const next = { ...baseState(fpra.pool, "PBR", pbrRate), fpraCeiling: fpra.fpraCeiling ?? fpra.rate };
  emitter.emitDcaaRateAudit({
    subSegmentId,
    decisionType: "fpra-to-pbr-transition",
    evidence: { pool: fpra.pool, pbrRate },
    outcome: "allowed",
    handleId: "DCMA_MAN_2201_01_FPRA",
  });
  return next;
}

export function transitionPBRtoFinal(
  pbr: RateState,
  finalRate: number,
  emitter: GcAuditEmitter,
  subSegmentId: "C" | "N" | "S" | "R" | "F" | "T" = "C",
): RateState {
  if (pbr.state !== "PBR") throw RateStateViolation("Source must be PBR");
  const next = { ...baseState(pbr.pool, "FINAL", finalRate), pbrPredecessorId: `pbr-${pbr.pool}-${pbr.timestampMs}` };
  emitter.emitDcaaRateAudit({
    subSegmentId,
    decisionType: "pbr-to-final-transition",
    evidence: { pool: pbr.pool, finalRate },
    outcome: "allowed",
    handleId: "DCMA_MAN_2201_03",
  });
  return next;
}

export function reconcileFinaltoICS(
  final: RateState,
  icsRate: number,
  emitter: GcAuditEmitter,
  subSegmentId: "C" | "N" | "S" | "R" | "F" | "T" = "C",
): RateState {
  if (final.state !== "FINAL") throw RateStateViolation("Source must be FINAL");
  if (!final.pbrPredecessorId) {
    emitEscalationAudit(emitter, {
      code: "GOVCON_ORPHAN_FINAL",
      message: "Final state without PBR predecessor",
      subSegmentId,
      handleId: "FAR_52_216_7_D_ICS_SUBMISSION",
    });
    throw RateStateViolation("Orphan final");
  }
  const variance = Math.abs(icsRate - final.rate) / final.rate;
  if (variance > DCAA_ICS_VARIANCE_THRESHOLD) {
    emitEscalationAudit(emitter, {
      code: "GOVCON_ICS_VARIANCE",
      message: `ICS variance ${variance} exceeds threshold`,
      subSegmentId,
      handleId: "DCAA_ICE_MODEL",
    });
    emitter.emitDcaaRateAudit({
      subSegmentId,
      decisionType: "final-to-ics-reconciliation",
      evidence: { variance, icsRate, finalRate: final.rate },
      outcome: "rejected-escalation",
      handleId: "DCAA_ICE_MODEL",
    });
    throw RateStateViolation("ICS variance exceeds threshold");
  }
  const next = { ...baseState(final.pool, "ICS", icsRate), pbrPredecessorId: final.pbrPredecessorId, icsFinalized: true };
  emitter.emitDcaaRateAudit({
    subSegmentId,
    decisionType: "final-to-ics-reconciliation",
    evidence: { pool: final.pool, icsRate },
    outcome: "allowed",
    handleId: "DCAA_ICE_MODEL",
  });
  return next;
}

export function assertNoPostIcsMutation(state: RateState, newRate: number): void {
  if (state.icsFinalized && newRate !== state.rate) {
    throw RateStateViolation("No state mutation post-ICS-finalization");
  }
}

export function assertTimestampMonotonicity(priorMs: number, nextMs: number): void {
  if (nextMs < priorMs) throw RateStateViolation("No backdating — timestamp monotonicity violated");
}
