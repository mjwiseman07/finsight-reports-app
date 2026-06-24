import type { FrameworkCode, TreatmentResolution } from "../standards/resolver/types";

export type RoleHandle =
  | "ai-staff-accountant"
  | "ai-senior-accountant"
  | "ai-accounting-manager"
  | "ai-controller-helper"
  | "ai-cfo-helper"
  | "ai-staff-auditor"
  | "ai-senior-auditor"
  | "ai-audit-manager-helper"
  | "ai-partner-helper";

export interface RoleEnvelope {
  role: RoleHandle;
  companyId: string;
  taskId: string;
  requestedAt: string;
}

export interface ResolvedRoleContext {
  outcome: "resolved";
  role: RoleHandle;
  companyId: string;
  taskId: string;
  chosenFramework: FrameworkCode;
  applicableBasisRef: string;
  precedenceReasoning: string;
  citationHandles: string[];
  contextHash: string;
}

export interface UnresolvedRoleContext {
  outcome: "unresolved";
  role: RoleHandle;
  companyId: string;
  taskId: string;
  disambiguationTask: FrameworkDisambiguationTask;
  escalationTarget: EscalationTarget;
  contextHash: string;
}

export interface FailClosedRoleContext {
  outcome: "fail_closed";
  role: RoleHandle;
  companyId: string;
  taskId: string;
  reason: string;
  disambiguationTask: FrameworkDisambiguationTask;
  contextHash: string;
}

export type RoleAdapterResult =
  | ResolvedRoleContext
  | UnresolvedRoleContext
  | FailClosedRoleContext;

export interface FrameworkDisambiguationTask {
  taskType: "framework_disambiguation";
  candidateFrameworks: FrameworkCode[];
  conflictingRuleIds: string[];
  conflictingCitations: string[];
  jurisdictionCountry: string;
  industryCode: string;
  reasoning: string;
  workerInstructions: string;
}

export interface EscalationTarget {
  attestedBy: string;
  attestedAt: string;
  role: string;
  scope: "universal" | "industry" | "jurisdiction" | "company";
  contactRef: string;
  citationHandle: string | null;
}

export type { TreatmentResolution } from "../standards/resolver/types";
