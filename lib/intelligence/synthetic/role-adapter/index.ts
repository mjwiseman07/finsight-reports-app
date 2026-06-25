export { adaptTreatmentForRole } from "./treatmentRoleAdapter";
export { adaptTreatmentForRolePure } from "./adaptTreatmentForRolePure";
export type { BuildArgs } from "./adaptTreatmentForRolePure";
export { evaluateEscalation } from "./evaluateEscalation";
export { evaluateEscalationPure } from "./evaluateEscalationPure";
export type {
  EscalationEvaluationInput,
  EscalationEvaluationResult,
  EscalationDecisionOutcome,
  MaterialityTier,
  ComplexityTier,
} from "./evaluateEscalationPure";
export { selectEscalationTarget, getEscalationRegistrySize } from "./escalationRegistry";
export type {
  RoleHandle,
  RoleEnvelope,
  RoleAdapterResult,
  RoleAdapterOptions,
  ResolvedRoleContext,
  UnresolvedRoleContext,
  FailClosedRoleContext,
  FrameworkDisambiguationTask,
  EscalationTarget,
  TreatmentResolution,
} from "./types";
export type { EscalationEvaluatedEntry } from "../standards/audit/types";
