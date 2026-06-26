/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsGovernmentContractData: true
 */

import type { GovConSubSegmentId } from "../../../standards/govcon/__init__/types";

export interface AllowabilityInput {
  subSegmentId: GovConSubSegmentId;
  costCategory: string;
  amountUsd: number;
  structuralPreconditionsMet: boolean;
  perDiemCitationHandleId?: string;
  compensationUsd?: number;
  compensationCalendarYear?: number;
}

export interface AllowabilityResult {
  allowed: boolean;
  handleId: string;
  escalationAudits: string[];
}

export interface CasEvaluationInput {
  subSegmentId: GovConSubSegmentId;
  structuralPreconditionsMet: boolean;
}

export interface CasEvaluationResult {
  compliant: boolean;
  handleId: string;
}

export type IndirectRatePool = "overhead" | "g_and_a" | "fringe" | "materials_handling";

export type RateLifecycleState = "FPRA" | "PBR" | "FINAL" | "ICS";

export interface RateState {
  pool: IndirectRatePool;
  state: RateLifecycleState;
  rate: number;
  fpraCeiling?: number;
  pbrPredecessorId?: string;
  timestampMs: number;
  icsFinalized: boolean;
  containsGovernmentContractData: true;
}

export interface MAAR6Input {
  subSegmentId: GovConSubSegmentId;
  laborRateUsd: number;
  maar6EvidenceHandleId?: string;
  timekeepingIntegrityVerified: boolean;
}

export interface MAAR6Result {
  compliant: boolean;
  escalationAudits: string[];
}

export interface ExecCompInput {
  subSegmentId: GovConSubSegmentId;
  compensationUsd: number;
  calendarYear: number;
  spansCyBoundary?: boolean;
}

export interface ExecCompResult {
  allowed: boolean;
  escalationAudits: string[];
  dcaaEventsEmitted: number;
}
