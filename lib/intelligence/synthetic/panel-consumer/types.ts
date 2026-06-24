// ---------- Persona identity ----------
export type AIPersonaId =
  | "ai-staff-accountant"
  | "ai-senior-accountant"
  | "ai-accounting-manager"
  | "ai-controller-helper"
  | "ai-cfo-helper"
  | "ai-staff-auditor"
  | "ai-senior-auditor"
  | "ai-audit-manager-helper"
  | "ai-partner-helper";

export const AI_PERSONA_IDS: readonly AIPersonaId[] = [
  "ai-staff-accountant",
  "ai-senior-accountant",
  "ai-accounting-manager",
  "ai-controller-helper",
  "ai-cfo-helper",
  "ai-staff-auditor",
  "ai-senior-auditor",
  "ai-audit-manager-helper",
  "ai-partner-helper",
] as const;

export const PERSONA_SENIORITY: Record<AIPersonaId, number> = {
  "ai-staff-accountant": 1,
  "ai-staff-auditor": 1,
  "ai-senior-accountant": 2,
  "ai-senior-auditor": 2,
  "ai-accounting-manager": 3,
  "ai-audit-manager-helper": 3,
  "ai-controller-helper": 4,
  "ai-cfo-helper": 5,
  "ai-partner-helper": 5,
};

// ---------- Capability matrix ----------
export interface HumanParityAssertion {
  readonly parityClaim: string;
  readonly humanOnlyForNow: boolean;
  readonly gapReason?: string;
  readonly roadmapPointer?: string;
  readonly competencyFrameworkRef: string;
}

export interface CapabilityClaim {
  readonly capabilityId: string;
  readonly summary: string;
  readonly phase39ModuleRefs: readonly number[];
  readonly citationHandles: readonly string[];
  readonly humanParity: HumanParityAssertion;
  readonly externalIO: "none" | "phase38-only";
}

export interface RestrictionClause {
  readonly restrictionId: string;
  readonly summary: string;
  readonly phase39ModuleRefs: readonly number[];
  readonly citationHandles: readonly string[];
  readonly hardStop: boolean;
}

export interface EscalationTrigger {
  readonly triggerId: string;
  readonly condition: string;
  readonly targetScope: "universal" | AIPersonaId;
  readonly citationHandles: readonly string[];
}

export interface FounderAttestation {
  readonly attestedBy: string;
  readonly attestedAt: string;
  readonly attestationVersion: string;
  readonly governanceNote: string;
}

export interface BaselineJobDescription {
  readonly personaId: AIPersonaId;
  readonly displayName: string;
  readonly tier: 1;
  readonly isNotReplacementForHuman: true;
  readonly revenueNote: string;
  readonly capabilities: readonly CapabilityClaim[];
  readonly restrictions: readonly RestrictionClause[];
  readonly escalationTriggers: readonly EscalationTrigger[];
  readonly attestation: FounderAttestation;
}

export interface CompanyJobDescriptionOverlay {
  readonly companyId: string;
  readonly personaId: AIPersonaId;
  readonly tier: 2;
  readonly narrows: {
    readonly disabledCapabilityIds: readonly string[];
    readonly addedRestrictions: readonly RestrictionClause[];
    readonly tightenedEscalationTriggers: readonly EscalationTrigger[];
  };
  readonly companyAttestation: {
    readonly attestedBy: string;
    readonly attestedAt: string;
    readonly note: string;
  };
}

export interface EffectiveJobDescription {
  readonly personaId: AIPersonaId;
  readonly source: "baseline-only" | "baseline+overlay";
  readonly companyId: string | null;
  readonly capabilities: readonly CapabilityClaim[];
  readonly restrictions: readonly RestrictionClause[];
  readonly escalationTriggers: readonly EscalationTrigger[];
  readonly attestation: FounderAttestation;
  readonly companyAttestation?: CompanyJobDescriptionOverlay["companyAttestation"];
}

export type IntakeSource = "phase39-email" | "phase39-dashboard-queue";

export interface WorkItem {
  readonly workItemId: string;
  readonly source: IntakeSource;
  readonly receivedAt: string;
  readonly requestedPersonaId: AIPersonaId | null;
  readonly requestedCapabilityId: string | null;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly companyId: string | null;
  readonly phase39ProvenanceRef: string;
}

export interface HireUpRecommendationPayload {
  readonly recommendationId: string;
  readonly currentPersonaId: AIPersonaId;
  readonly recommendedPersonaId: AIPersonaId;
  readonly capabilityId: string;
  readonly rationale: string;
  readonly citationHandles: readonly string[];
  readonly humanFallbackAvailable: true;
  readonly revenuePathway: {
    readonly suggestedTier: string;
    readonly note: string;
  };
}

export interface EscalationTicketRef {
  readonly registryEntryId: string;
  readonly reason: string;
  readonly targetScope: "universal" | AIPersonaId;
  readonly humanFallback: { email: "mwiseman@advisacor.com"; available: true };
}

export type RoutingDecision =
  | {
      readonly kind: "execute";
      readonly personaId: AIPersonaId;
      readonly capabilityId: string;
      readonly effectiveJD: EffectiveJobDescription;
    }
  | { readonly kind: "hire-up"; readonly recommendation: HireUpRecommendationPayload }
  | { readonly kind: "escalate"; readonly escalationTicket: EscalationTicketRef };

export interface ExecutionOutcome {
  readonly workItemId: string;
  readonly decision: RoutingDecision;
  readonly outcome: "completed" | "hire-up-emitted" | "escalated" | "failed-closed";
  readonly reason: string;
  readonly externalIOInvoked: "phase38" | "none";
  readonly parityDisclosure: string | null;
}

export interface ParityChecklistItem {
  readonly personaId: AIPersonaId;
  readonly capabilityId: string;
  readonly humanOnlyForNow: boolean;
  readonly parityClaim: string;
  readonly competencyFrameworkRef: string;
}

export interface ParityChecklist {
  readonly schemaVersion: string;
  readonly generatedFrom: string;
  readonly items: readonly ParityChecklistItem[];
}

export interface WorkerJobDescriptionsDocument {
  readonly schemaVersion: string;
  readonly attestation: FounderAttestation;
  readonly isNotReplacementForHuman: true;
  readonly humanWorkerParityDoctrine: true;
  readonly personas: readonly BaselineJobDescription[];
}
