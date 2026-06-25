/**
 * Phase 42.7D.1-audit — Org-Edge Reconciliation Audit Retrofit
 * Doctrine:
 *  - builderNeverAuthorsContent: true (no business content authored by builder)
 *  - isNotReplacementForHuman: true (reconciliation supports, not replaces, controller judgment)
 *  - humanWorkerParityDoctrine: true (org authority modeled on attested elections)
 *  - failClosedOnAuditWriteFailure: true (inherited from 42.7E E7)
 *  - pureInnerCoreUntouched: true (deterministic logic byte-identical to 20b4bdf)
 *  - complianceClass: SOC1 + SOC2-T2 + HIPAA
 */
import type { ActorRef } from "../../audit/types";
import type { OrgEdgeReconciliationEntry } from "../../audit/types";
import { validateOrgEdgeReconciliationEntry } from "../../audit/validators";
import {
  deriveOrgEdgeReconciliationContextPure,
  type ReconciliationInput,
} from "./deriveOrgEdgeReconciliationContextPure";
import { detectDisagreementPure } from "./orgStandardsEdgePure";
import type { OrgEdgeDecision, OrgEdgeOptions } from "./types";

const SYSTEM_ACTOR: ActorRef = {
  kind: "system",
  id: "org-standards-edge-reconcile",
  via: "org-edge",
};

function resolveTenantClassification(
  input: ReconciliationInput,
  options: OrgEdgeOptions,
): ReconciliationInput["callerIdentity"]["tenantClassification"] {
  if (!options.tenantClassifier) {
    throw new Error("tenantClassifier required when auditLogWriter is configured");
  }
  if (options.knownTenantIds && !options.knownTenantIds.has(input.callerIdentity.tenantId)) {
    throw new Error(`tenant not in known registry: ${input.callerIdentity.tenantId}`);
  }
  const classified = options.tenantClassifier.classify(input.callerIdentity.tenantId);
  if (classified !== input.callerIdentity.tenantClassification) {
    throw new Error(
      "callerIdentity.tenantClassification does not match tenantClassifier result",
    );
  }
  return classified;
}

export function reconcileOrgStandards(
  input: ReconciliationInput,
  options: OrgEdgeOptions = {},
): OrgEdgeDecision {
  const result = detectDisagreementPure(input.election, input.projection);

  if (!options.auditLogWriter) {
    return result;
  }

  resolveTenantClassification(input, options);
  const auditPayload: OrgEdgeReconciliationEntry = deriveOrgEdgeReconciliationContextPure(
    input,
    result,
  );
  validateOrgEdgeReconciliationEntry(auditPayload);

  options.auditLogWriter.append({
    kind: "orgEdge.reconciliation",
    actor: SYSTEM_ACTOR,
    subject: {
      orgId: input.callerIdentity.tenantId,
      tenantId: input.callerIdentity.tenantId,
    },
    payload: {
      ...auditPayload,
      auditNamespace:
        auditPayload.tenantClassification === "phi-covered" ? "phi-covered" : "standard",
    },
  });

  return result;
}

export type { ReconciliationInput };
