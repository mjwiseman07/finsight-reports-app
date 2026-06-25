/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsGovernmentContractData: true
 */

import type { ExecCompCapResolution, GovConEscalationAudit } from "./__init__/types";

export const EXEC_COMP_CAP_CY2025 = 671_000;
export const EXEC_COMP_CAP_CY2026_EST = 695_000;

const CY2026_ESCALATION_MESSAGE =
  "OFPP CY 2026 memo pending — using estimated $695,000 ceiling";

export function createEscalationAudit(code: string, message: string): GovConEscalationAudit {
  return { channel: "escalation-audit", code, message };
}

export function resolveExecCompCap(calendarYear: number): ExecCompCapResolution {
  if (calendarYear === 2025) {
    return {
      calendarYear,
      amount: EXEC_COMP_CAP_CY2025,
      confirmed: true,
      escalationAudits: [],
    };
  }

  if (calendarYear === 2026) {
    return {
      calendarYear,
      amount: EXEC_COMP_CAP_CY2026_EST,
      confirmed: false,
      escalationAudits: [CY2026_ESCALATION_MESSAGE],
    };
  }

  const audits = [
    createEscalationAudit(
      "GOVCON_EXEC_COMP_CAP_YEAR_UNSUPPORTED",
      `Executive compensation cap year ${calendarYear} is not registered in GC-1`,
    ),
  ];

  return {
    calendarYear,
    amount: EXEC_COMP_CAP_CY2025,
    confirmed: false,
    escalationAudits: audits.map((a) => a.message),
  };
}

export function assertCompensationWithinCap(
  calendarYear: number,
  compensationUsd: number,
): { allowed: boolean; escalationAudits: GovConEscalationAudit[] } {
  const resolution = resolveExecCompCap(calendarYear);
  const escalationAudits = resolution.escalationAudits.map((message) =>
    createEscalationAudit("GOVCON_EXEC_COMP_CAP_ESTIMATE", message),
  );

  if (compensationUsd > resolution.amount) {
    return {
      allowed: false,
      escalationAudits: [
        ...escalationAudits,
        createEscalationAudit(
          "GOVCON_EXEC_COMP_CAP_EXCEEDED",
          `Compensation $${compensationUsd.toLocaleString("en-US")} exceeds cap $${resolution.amount.toLocaleString("en-US")} for CY${calendarYear}`,
        ),
      ],
    };
  }

  return { allowed: true, escalationAudits };
}
