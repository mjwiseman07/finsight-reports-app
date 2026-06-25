/**
 * Phase 42.7B.1 — Escalation Audit Retrofit
 * Doctrine:
 *  - builderNeverAuthorsContent: true (no business content authored by builder)
 *  - isNotReplacementForHuman: true (escalation decisions support, not replace, controller judgment)
 *  - humanWorkerParityDoctrine: true (persona authority modeled on AICPA CGMA framework)
 *  - failClosedOnAuditWriteFailure: true (inherited from 42.7E E7)
 *  - pureInnerCoreUntouched: true (escalation deterministic logic byte-identical to 1a3e09e)
 *  - complianceClass: SOC1 + SOC2-T2 + HIPAA
 */
import type { ActorRef } from "../standards/audit/types";
import {
  validateEscalationEvaluatedEntry,
  type EscalationEvaluatedEntry,
} from "../standards/audit/types";
import type { TenantClassification } from "../standards/resolver/memory/types";
import { evaluateEscalationPure } from "./evaluateEscalationPure";
import type { EscalationEvaluationInput, EscalationEvaluationResult } from "./evaluateEscalationPure";
import type { RoleAdapterOptions } from "./types";

const SYSTEM_ACTOR: ActorRef = {
  kind: "system",
  id: "role-adapter-evaluate-escalation",
  via: "role-adapter",
};

function resolveTenantClassification(
  input: EscalationEvaluationInput,
  options: RoleAdapterOptions,
): TenantClassification {
  if (!options.tenantClassifier) {
    throw new Error("tenantClassifier required when auditLogWriter is configured");
  }
  if (options.knownTenantIds && !options.knownTenantIds.has(input.callerTenantId)) {
    throw new Error(`tenant not in known registry: ${input.callerTenantId}`);
  }
  return options.tenantClassifier.classify(input.callerTenantId);
}

function buildAuditPayload(
  input: EscalationEvaluationInput,
  result: EscalationEvaluationResult,
  tenantClassification: TenantClassification,
): EscalationEvaluatedEntry {
  const entry: EscalationEvaluatedEntry = {
    event: "escalation-evaluated",
    callerPersonaHandle: input.callerPersonaHandle,
    callerTenantId: input.callerTenantId,
    callerSessionId: input.callerSessionId,
    callerOrgHandle: input.callerOrgHandle,
    materialityTier: input.materialityTier,
    complexityTier: input.complexityTier,
    topicHandle: input.topicHandle,
    industryHandle: input.industryHandle,
    decisionOutcome: result.decisionOutcome,
    targetPersonaHandle: result.targetPersonaHandle,
    citationHandlesConsulted: [...result.citationHandlesConsulted],
    matchedRules: [...result.matchedRules],
    unresolvedConflicts: [...result.unresolvedConflicts],
    tenantClassification,
  };
  validateEscalationEvaluatedEntry(entry);
  return entry;
}

export function evaluateEscalation(
  input: EscalationEvaluationInput,
  options: RoleAdapterOptions = {},
): EscalationEvaluationResult {
  if (options.auditLogWriter) {
    const tenantClassification = resolveTenantClassification(input, options);
    const result = evaluateEscalationPure(input);
    const auditPayload = buildAuditPayload(input, result, tenantClassification);

    options.auditLogWriter.append({
      kind: "escalation.evaluated",
      actor: SYSTEM_ACTOR,
      subject: {
        orgId: input.callerOrgHandle,
        tenantId: input.callerTenantId,
      },
      payload: {
        ...auditPayload,
        auditNamespace:
          tenantClassification === "phi-covered" ? "phi-covered" : "standard",
      },
    });

    return result;
  }

  return evaluateEscalationPure(input);
}
