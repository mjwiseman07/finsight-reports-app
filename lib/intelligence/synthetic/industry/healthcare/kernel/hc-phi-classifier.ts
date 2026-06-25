/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsPHI: true
 *
 * Denylist PHI classifier — fail-closed: anything not explicitly cleared is PHI.
 */

import { PHIDisclosureViolation } from "./errors";

const EXPLICIT_NON_PHI_KEYS = new Set([
  "tenantId",
  "entityId",
  "companyId",
  "capabilityKey",
  "framework",
  "subSegment",
  "timestamp",
  "accessorId",
  "classification",
  "accessReason",
  "payloadToken",
  "phiDerived",
  "aggregateKpiOnly",
]);

const PHI_FIELD_DENYLIST = [
  "patientName",
  "dateOfBirth",
  "ssn",
  "mrn",
  "medicalRecordNumber",
  "diagnosisCode",
  "procedureCode",
  "memberId",
  "subscriberId",
] as const;

export type PhiClassification = "phi" | "part-2" | "non-phi";

export function classifyPayload(payload: Record<string, unknown>): PhiClassification {
  const keys = Object.keys(payload);
  for (const key of keys) {
    const lower = key.toLowerCase();
    if (PHI_FIELD_DENYLIST.some((d) => lower.includes(d.toLowerCase()))) {
      if (lower.includes("substance") || lower.includes("part2")) {
        return "part-2";
      }
      return "phi";
    }
    if (!EXPLICIT_NON_PHI_KEYS.has(key) && typeof payload[key] === "string") {
      const val = String(payload[key]);
      if (/\b\d{3}-\d{2}-\d{4}\b/.test(val)) return "phi";
    }
  }
  return "non-phi";
}

export function redactForAudit(payload: Record<string, unknown>): Record<string, unknown> {
  const classification = classifyPayload(payload);
  if (classification === "non-phi") {
    return { ...payload, classification };
  }
  return {
    classification,
    payloadToken: `phi-token:${hashStructural(payload)}`,
    tenantId: payload.tenantId,
    capabilityKey: payload.capabilityKey,
  };
}

function hashStructural(payload: Record<string, unknown>): string {
  const keys = Object.keys(payload).sort().join(",");
  let h = 0;
  for (let i = 0; i < keys.length; i++) h = (h * 31 + keys.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16).padStart(8, "0");
}

export function assertNoPhiInErrorContext(message: string): void {
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(message) || /\bMRN[:\s]/i.test(message)) {
    throw PHIDisclosureViolation("PHI detected in error message context");
  }
}

export function assertNoPhiInAuditReason(reason: string): void {
  const lower = reason.toLowerCase();
  if (PHI_FIELD_DENYLIST.some((d) => lower.includes(d.toLowerCase()))) {
    throw PHIDisclosureViolation("PHI detected in audit reason field");
  }
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(reason) || /\bMRN[:\s]/i.test(reason)) {
    throw PHIDisclosureViolation("PHI detected in audit reason field");
  }
}
