/**
 * Phase 42.7D.1-audit — Org-Edge Reconciliation Audit Retrofit
 * Doctrine:
 *  - builderNeverAuthorsContent: true
 *  - failClosedOnAuditWriteFailure: true (inherited from 42.7E E7)
 *  - complianceClass: SOC1 + SOC2-T2 + HIPAA
 */
import { isLockedCitationHandle } from "../../panel-consumer/locked-citation-handles";
import type {
  AttestationLink,
  CallerIdentity,
  OrgEdgeReconciliationEntry,
  ReconciliationDiff,
} from "./types";

export function validateCallerIdentity(identity: CallerIdentity): void {
  if (typeof identity.personaHandle !== "string" || identity.personaHandle.length === 0) {
    throw new Error("CallerIdentity missing personaHandle");
  }
  if (typeof identity.tenantId !== "string" || identity.tenantId.length === 0) {
    throw new Error("CallerIdentity missing tenantId");
  }
  if (
    identity.tenantClassification !== "standard" &&
    identity.tenantClassification !== "phi-covered"
  ) {
    throw new Error("CallerIdentity invalid tenantClassification");
  }
  if (!identity.invocationContext || typeof identity.invocationContext !== "object") {
    throw new Error("CallerIdentity missing invocationContext");
  }
  if (
    typeof identity.invocationContext.requestId !== "string" ||
    identity.invocationContext.requestId.length === 0
  ) {
    throw new Error("CallerIdentity missing invocationContext.requestId");
  }
  if (!Object.prototype.hasOwnProperty.call(identity.invocationContext, "parentRequestId")) {
    throw new Error("CallerIdentity missing invocationContext.parentRequestId");
  }
  if (
    typeof identity.invocationContext.invokedAt !== "string" ||
    identity.invocationContext.invokedAt.length === 0
  ) {
    throw new Error("CallerIdentity missing invocationContext.invokedAt");
  }
}

function validateAttestationLink(link: AttestationLink): void {
  if (typeof link.attestedBy !== "string" || link.attestedBy.length === 0) {
    throw new Error("AttestationLink missing attestedBy");
  }
  if (typeof link.attestedAt !== "string" || link.attestedAt.length === 0) {
    throw new Error("AttestationLink missing attestedAt");
  }
  if (typeof link.attestationHandle !== "string" || link.attestationHandle.length === 0) {
    throw new Error("AttestationLink missing attestationHandle");
  }
}

function validateReconciliationDiff(diff: ReconciliationDiff, outcome: OrgEdgeReconciliationEntry["outcome"]): void {
  if (outcome === "agreement" && diff.kind !== "none") {
    throw new Error("OrgEdgeReconciliationEntry agreement outcome requires diff.kind none");
  }
  if (outcome === "disagreement" && diff.kind !== "override-applied") {
    throw new Error("OrgEdgeReconciliationEntry disagreement outcome requires diff.kind override-applied");
  }
  if (diff.kind === "none") {
    return;
  }
  const requiredFields: Array<keyof Extract<ReconciliationDiff, { kind: "override-applied" }>> = [
    "orgPolicyHandle",
    "panelFrameworkHandle",
    "resolvedFrameworkHandle",
    "attestationChain",
    "resolutionRule",
  ];
  for (const field of requiredFields) {
    const value = diff[field];
    if (value === undefined || value === null) {
      throw new Error(`ReconciliationDiff override-applied missing ${field}`);
    }
  }
  if (!Array.isArray(diff.attestationChain) || diff.attestationChain.length === 0) {
    throw new Error("ReconciliationDiff override-applied requires non-empty attestationChain");
  }
  for (const link of diff.attestationChain) {
    validateAttestationLink(link);
  }
}

export function validateOrgEdgeReconciliationEntry(entry: OrgEdgeReconciliationEntry): void {
  if (entry.event !== "orgEdge.reconciliation") {
    throw new Error(`OrgEdgeReconciliationEntry invalid event: ${entry.event}`);
  }
  if (entry.version !== 1) {
    throw new Error(`OrgEdgeReconciliationEntry invalid version: ${entry.version}`);
  }
  if (
    entry.tenantClassification !== "standard" &&
    entry.tenantClassification !== "phi-covered"
  ) {
    throw new Error("OrgEdgeReconciliationEntry invalid tenantClassification");
  }
  validateCallerIdentity(entry.callerIdentity);
  if (entry.tenantClassification !== entry.callerIdentity.tenantClassification) {
    throw new Error(
      "OrgEdgeReconciliationEntry tenantClassification must match callerIdentity.tenantClassification",
    );
  }
  if (entry.outcome !== "agreement" && entry.outcome !== "disagreement") {
    throw new Error(`OrgEdgeReconciliationEntry invalid outcome: ${entry.outcome}`);
  }
  if (!Array.isArray(entry.citationHandles)) {
    throw new Error("OrgEdgeReconciliationEntry citationHandles must be array");
  }
  for (const handle of entry.citationHandles) {
    if (!isLockedCitationHandle(handle)) {
      throw new Error(`OrgEdgeReconciliationEntry citation handle outside locked set: ${handle}`);
    }
  }
  validateReconciliationDiff(entry.diff, entry.outcome);
}
