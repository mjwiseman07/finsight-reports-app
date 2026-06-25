/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsPHI: true
 *
 * K-H HIPAA controls + PHI guards.
 */

import type { HCAuditEmitter } from "../audit/hc-audit-emitter";
import { emitEscalationAudit, emitPanelDecisionAudit } from "../audit/hc-audit-emitter";
import {
  CrossTenantPHIViolation,
  PHIDerivedTaggingViolation,
  PHIDisclosureViolation,
  Part2ConfidentialityViolation,
} from "../kernel/errors";
import { assertNoPhiInErrorContext, classifyPayload } from "../kernel/hc-phi-classifier";

const tenantPhiMemory = new Map<string, Map<string, unknown>>();

export function touchPhiWithAudit(
  emitter: HCAuditEmitter,
  params: {
    tenantId: string;
    entityId: string;
    capabilityKey: string;
    payload: Record<string, unknown>;
    phiAccessAuditEmitted: boolean;
  },
): void {
  if (!params.phiAccessAuditEmitted) {
    throw PHIDisclosureViolation("PHI touch without phi-access-audit emission");
  }
  const classification = classifyPayload(params.payload);
  if (classification === "non-phi") return;

  const key = `${params.tenantId}:${params.capabilityKey}`;
  if (!tenantPhiMemory.has(params.tenantId)) {
    tenantPhiMemory.set(params.tenantId, new Map());
  }
  tenantPhiMemory.get(params.tenantId)!.set(key, {
    phiDerived: true,
    token: `phi-mem:${key}`,
  });
}

export function writePhiDerivedMemory(
  tenantId: string,
  capabilityKey: string,
  value: unknown,
  phiDerived: boolean,
): void {
  if (!phiDerived && value !== null && typeof value === "object") {
    throw PHIDerivedTaggingViolation("PHI-derived memory write missing phiDerived tag");
  }
  if (!tenantPhiMemory.has(tenantId)) tenantPhiMemory.set(tenantId, new Map());
  tenantPhiMemory.get(tenantId)!.set(`${tenantId}:${capabilityKey}`, { value, phiDerived });
}

export function readCrossTenantPhi(
  readerTenantId: string,
  ownerTenantId: string,
  capabilityKey: string,
  emitter: HCAuditEmitter,
  entityId: string,
): unknown {
  if (readerTenantId !== ownerTenantId) {
    emitEscalationAudit(emitter, {
      entityId,
      tenantId: readerTenantId,
      reason: "Cross-tenant PHI memory access blocked",
      severity: "critical",
      violationType: "CrossTenantPHIViolation",
    });
    throw CrossTenantPHIViolation(
      `Tenant ${readerTenantId} cannot read PHI memory for ${ownerTenantId}`,
    );
  }
  return tenantPhiMemory.get(ownerTenantId)?.get(`${ownerTenantId}:${capabilityKey}`);
}

export function assertPhiNotInError(message: string): void {
  assertNoPhiInErrorContext(message);
}

export function assertPart2Confidentiality(
  subSegment: string,
  confidentialityFlag: boolean,
): void {
  if (subSegment === "B" && !confidentialityFlag) {
    throw Part2ConfidentialityViolation(
      "42 CFR Part 2 record accessed without confidentiality flag",
    );
  }
}

export function evaluateBaaRequiredVendorRequest(
  emitter: HCAuditEmitter,
  params: { entityId: string; tenantId: string; vendorId: string },
): void {
  emitPanelDecisionAudit(emitter, {
    entityId: params.entityId,
    tenantId: params.tenantId,
    decision: "BAA required for external vendor PHI access",
    multiPartySignatures: ["compliance-officer", "privacy-officer"],
    flag: "baa-required",
  });
}

export function evaluateScopeCreep(
  emitter: HCAuditEmitter,
  params: {
    entityId: string;
    tenantId: string;
    declaredScope: string;
    requestedScope: string;
  },
): void {
  if (params.requestedScope.length > params.declaredScope.length + 10) {
    emitPanelDecisionAudit(emitter, {
      entityId: params.entityId,
      tenantId: params.tenantId,
      decision: "PHI scope creep detected",
      multiPartySignatures: ["privacy-officer", "cfo"],
      flag: "scope-creep",
    });
  }
}

export function resetTenantPhiMemory(): void {
  tenantPhiMemory.clear();
}
