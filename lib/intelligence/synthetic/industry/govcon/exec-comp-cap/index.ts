/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsGovernmentContractData: true
 */

import type { GcAuditEmitter } from "../audit/gc-audit-emitter";
import type { ExecCompInput, ExecCompResult } from "../types";
import {
  EXEC_COMP_CAP_CY2025,
  EXEC_COMP_CAP_CY2026_EST,
  resolveExecCompCap,
} from "../../../standards/govcon/execCompCap";
import { emitEscalationAudit } from "../audit/gc-audit-emitter";
import { ExecCompViolation } from "../errors";

export { EXEC_COMP_CAP_CY2025, EXEC_COMP_CAP_CY2026_EST };

export function applyExecCompCap(input: ExecCompInput, emitter: GcAuditEmitter): ExecCompResult {
  const resolution = resolveExecCompCap(input.calendarYear);
  const escalationAudits: string[] = [...resolution.escalationAudits];
  let dcaaEventsEmitted = 0;

  if (input.spansCyBoundary) {
    emitter.emitDcaaRateAudit({
      subSegmentId: input.subSegmentId,
      decisionType: "exec-comp-cap-check",
      evidence: { calendarYear: input.calendarYear - 1, boundary: "cy-start" },
      outcome: "allowed",
      handleId: "EXEC_COMP_CAP_CY2025",
    });
    emitter.emitDcaaRateAudit({
      subSegmentId: input.subSegmentId,
      decisionType: "exec-comp-cap-check",
      evidence: { calendarYear: input.calendarYear, boundary: "cy-end" },
      outcome: resolution.confirmed ? "allowed" : "rejected-escalation",
      handleId: "EXEC_COMP_CAP_CY2026_EST",
    });
    dcaaEventsEmitted = 2;
  }

  if (input.compensationUsd > resolution.amount) {
    const msg = `Compensation $${input.compensationUsd} exceeds cap $${resolution.amount} for CY${input.calendarYear}`;
    emitEscalationAudit(emitter, {
      code: "GOVCON_EXEC_COMP_CAP_EXCEEDED",
      message: msg,
      subSegmentId: input.subSegmentId,
      handleId: "FAR_31_205_6_COMPENSATION",
    });
    emitter.emitDcaaRateAudit({
      subSegmentId: input.subSegmentId,
      decisionType: "exec-comp-cap-check",
      evidence: { compensationUsd: input.compensationUsd, cap: resolution.amount },
      outcome: "rejected-escalation",
      handleId: "EXEC_COMP_CAP_CY2025",
    });
    dcaaEventsEmitted += 1;
    throw ExecCompViolation(msg);
  }

  if (!input.spansCyBoundary) {
    emitter.emitDcaaRateAudit({
      subSegmentId: input.subSegmentId,
      decisionType: "exec-comp-cap-check",
      evidence: { compensationUsd: input.compensationUsd, cap: resolution.amount },
      outcome: "allowed",
      handleId: resolution.confirmed ? "EXEC_COMP_CAP_CY2025" : "EXEC_COMP_CAP_CY2026_EST",
    });
    dcaaEventsEmitted += 1;
  }

  return { allowed: true, escalationAudits, dcaaEventsEmitted };
}
