import { adaptTreatmentForRolePure, type BuildArgs } from "./adaptTreatmentForRolePure";
import type { RoleAdapterResult, RoleEnvelope, RoleHandle, TreatmentResolution } from "./types";

export type MaterialityTier = "low" | "medium" | "high" | "critical";
export type ComplexityTier = "simple" | "moderate" | "complex" | "novel";

export type EscalationDecisionOutcome =
  | "no-escalation"
  | "escalate-tier-up"
  | "escalate-to-founder"
  | "decline-out-of-scope";

export interface EscalationEvaluationInput {
  readonly callerPersonaHandle: RoleHandle;
  readonly callerTenantId: string;
  readonly callerSessionId: string;
  readonly callerOrgHandle: string;
  readonly materialityTier: MaterialityTier;
  readonly complexityTier: ComplexityTier;
  readonly topicHandle: string;
  readonly industryHandle: string;
  readonly jurisdictionCountry: string;
  readonly resolution: TreatmentResolution;
  readonly envelope: RoleEnvelope;
}

export interface EscalationEvaluationResult {
  readonly decisionOutcome: EscalationDecisionOutcome;
  readonly targetPersonaHandle: string | null;
  readonly citationHandlesConsulted: readonly string[];
  readonly matchedRules: readonly string[];
  readonly unresolvedConflicts: readonly string[];
  readonly adapterResult: RoleAdapterResult;
}

const TIER_UP: Partial<Record<RoleHandle, RoleHandle>> = {
  "ai-staff-accountant": "ai-senior-accountant",
  "ai-senior-accountant": "ai-accounting-manager",
  "ai-accounting-manager": "ai-controller-helper",
  "ai-controller-helper": "ai-cfo-helper",
  "ai-staff-auditor": "ai-senior-auditor",
  "ai-senior-auditor": "ai-audit-manager-helper",
  "ai-audit-manager-helper": "ai-partner-helper",
};

function buildArgs(input: EscalationEvaluationInput): BuildArgs {
  return {
    resolution: input.resolution,
    envelope: input.envelope,
    jurisdictionCountry: input.jurisdictionCountry,
    industryCode: input.industryHandle,
  };
}

function extractCitationHandles(resolution: TreatmentResolution): string[] {
  const extended = resolution as TreatmentResolution & { citationHandlesConsulted?: string[] };
  return Array.from(new Set(extended.citationHandlesConsulted ?? resolution.matchedRules));
}

function extractUnresolvedConflictIds(resolution: TreatmentResolution): string[] {
  const extended = resolution.unresolvedConflicts as Array<{ ruleId?: string; conflictId?: string }>;
  const ids = extended
    .map((conflict) => conflict.ruleId ?? conflict.conflictId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  return ids.length > 0 ? ids : resolution.matchedRules;
}

export function evaluateEscalationPure(input: EscalationEvaluationInput): EscalationEvaluationResult {
  const args = buildArgs(input);
  const adapterResult = adaptTreatmentForRolePure(args);
  const citationHandlesConsulted = extractCitationHandles(input.resolution);
  const matchedRules = [...input.resolution.matchedRules];
  const unresolvedConflicts = extractUnresolvedConflictIds(input.resolution);

  if (adapterResult.outcome === "resolved") {
    return {
      decisionOutcome: "no-escalation",
      targetPersonaHandle: null,
      citationHandlesConsulted,
      matchedRules,
      unresolvedConflicts,
      adapterResult,
    };
  }

  if (adapterResult.outcome === "fail_closed") {
    return {
      decisionOutcome: "decline-out-of-scope",
      targetPersonaHandle: null,
      citationHandlesConsulted,
      matchedRules,
      unresolvedConflicts,
      adapterResult,
    };
  }

  const founderFallback =
    adapterResult.escalationTarget.contactRef === "mwiseman@advisacor.com" ||
    adapterResult.escalationTarget.role === "founder";

  const tierUpTarget = TIER_UP[input.callerPersonaHandle] ?? null;
  const materialityRequiresTierUp =
    input.materialityTier === "high" || input.materialityTier === "critical";

  if (!founderFallback && materialityRequiresTierUp && tierUpTarget) {
    return {
      decisionOutcome: "escalate-tier-up",
      targetPersonaHandle: tierUpTarget,
      citationHandlesConsulted,
      matchedRules,
      unresolvedConflicts,
      adapterResult,
    };
  }

  if (founderFallback) {
    return {
      decisionOutcome: "escalate-to-founder",
      targetPersonaHandle: "ai-partner-helper",
      citationHandlesConsulted,
      matchedRules,
      unresolvedConflicts,
      adapterResult,
    };
  }

  return {
    decisionOutcome: "escalate-tier-up",
    targetPersonaHandle: tierUpTarget,
    citationHandlesConsulted,
    matchedRules,
    unresolvedConflicts,
    adapterResult,
  };
}
