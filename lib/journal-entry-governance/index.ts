export {
  createContinuousCloseJournalEntryProposal,
  createDefaultJeProposalDeps,
  DEFAULT_JE_PROPOSAL_POLICY,
} from "./service";
export type { CreateJeProposalDeps } from "./service";
export {
  hashJeProposal,
  hashJeProposalIdempotencyKey,
  hashJeProposalPolicy,
  canonicalizeJeProposal,
  canonicalizeJeProposalPolicy,
} from "./proposal-hash";
export {
  JE_PROPOSAL_ERROR,
  JE_PROPOSAL_ORIGINS,
  JE_SOURCE_RECON_KINDS,
} from "./types";
export type {
  CreateJeProposalInput,
  CreateJeProposalResult,
  JeExpectedEffect,
  JeProposalExecutionContext,
  JeProposalLine,
  JeProposalOriginType,
  JeProposalPolicy,
  JournalEntryProposalRow,
} from "./types";

export {
  decideJournalEntryProposal,
  createDefaultJeApprovalDeps,
  DEFAULT_JE_APPROVAL_POLICY,
} from "./approval-service";
export type { DecideJeApprovalDeps } from "./approval-service";
export {
  hashJeApprovalPolicy,
  hashJeApprovalIdempotencyKey,
  canonicalizeJeApprovalPolicy,
} from "./approval-hash";
export { evaluateApprovalValidity } from "./approval-validity";
export {
  JE_APPROVAL_ERROR,
  JE_APPROVAL_DECISIONS,
  JE_APPROVAL_MODES,
} from "./approval-types";
export type {
  DecideJeApprovalInput,
  DecideJeApprovalResult,
  JeApprovalExecutionContext,
  JeApprovalPolicy,
  JeAuthenticationAssurance,
  JournalEntryApprovalRow,
  JeApprovalValidity,
} from "./approval-types";

export {
  prepareGovernedJournalEntryExecution,
  createDefaultJeExecutionDeps,
  DEFAULT_JE_EXECUTION_POLICY,
} from "./execution-service";
export type { PrepareJeExecutionDeps } from "./execution-service";
export {
  hashJeExecutionPolicy,
  hashJeExecution,
  hashJeExecutionIdempotencyKey,
  canonicalizeJeExecutionPolicy,
} from "./execution-hash";
export {
  assertJeExecutionTransition,
  isJeExecutionTransitionAllowed,
  classifyJeExecutionRetry,
  assertUnknownCommitCannotBlindRetry,
} from "./execution-state";
export {
  buildJeCorrelationMarker,
  composeJePrivateNote,
  parseJeCorrelationMarker,
  QBO_PRIVATE_NOTE_MAX_CHARS,
} from "./execution-correlation";
export { mapGovernedProposalToQboPayload } from "./execution-payload";
export { evaluateJeExecutionEligibility } from "./execution-eligibility";
export {
  JE_EXECUTION_ERROR,
  JE_EXECUTION_STATUSES,
  JE_GOVERNED_EXECUTION_FEATURE_BOUNDARY,
  UNKNOWN_COMMIT_INVARIANT,
} from "./execution-types";
export type {
  JeExecutionContext,
  JeExecutionEligibility,
  JeExecutionPolicy,
  JeExecutionStatus,
  JePreflightResult,
  JeRetryClassification,
  JournalEntryExecutionRow,
  PrepareJeExecutionInput,
  PrepareJeExecutionResult,
} from "./execution-types";
