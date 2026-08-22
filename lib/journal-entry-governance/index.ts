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
  assertJe3aDbTransitionEventPair,
  assertJe3aEventPayloadStatusMatches,
  assertJe3b1DbTransitionEventPair,
  assertJe3b1EventPayloadStatusMatches,
  isJe3aDbTransitionAuthorized,
  isJe3b1DbTransitionAuthorized,
  JE_3A_DB_TRANSITION_EVENT_MATRIX,
  JE_3B1_DB_TRANSITION_EVENT_MATRIX,
} from "./execution-state";
export {
  extractJeExecutionImmutableBinding,
  jeExecutionBindingsEqual,
  assertExactExecutionBindingMatch,
} from "./execution-binding";
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

export {
  reserveGovernedProviderAttempt,
  recoverUnknownJournalEntryExecution,
  assertGovernedProviderPostNotEnabled,
  assertProviderAttemptWriteAuthority,
  revalidateCanonicalExecutionConnection,
  assertPersistedProviderRequestHashGate,
  createDefaultProviderAttemptDeps,
} from "./provider-attempt-service";
export type { ProviderAttemptServiceDeps } from "./provider-attempt-service";
export {
  classifyJeProviderCreateOutcome,
  mapCreateOutcomeToJe3b2TerminalAction,
  JE_DOCNUMBER_RECOMMENDATION,
  JE_PROVIDER_ATTEMPT_ERROR,
  JE_COMMIT_CERTAINTIES,
  JE_PROVIDER_ATTEMPT_STATUSES,
  JE_PROVIDER_ERROR_CLASSES,
} from "./provider-attempt-types";
export type {
  JeCommitCertainty,
  JeProviderAttemptStatus,
  JeProviderErrorClass,
  JeProviderNetworkAttemptResult,
  Je3b2DispatchTerminalAction,
  JournalEntryProviderAttemptRow,
} from "./provider-attempt-types";
export {
  JE_3B2_FEATURE_GATE,
  JE_3B2_GATE_ERROR,
  assertJe3b2GovernedCreateEnabled,
  assertJe3b2LivePostNotEnabled,
  assertJe3b2MemoryWriteNotEnabled,
  isJe3b2GovernedCreateEnabled,
} from "./je3b2-feature-gate";
export {
  JE_MEMORY_PROJECTION_CONTRACT,
  buildVerifiedJeMemoryProjectionDraft,
} from "./memory-projection-contract";
export { executeGovernedJournalEntryCreate } from "./provider-create-service";
export type {
  ExecuteGovernedJeCreateInput,
  ExecuteGovernedJeCreateResult,
} from "./provider-create-service";
export {
  toGovernedQboJournalEntryWireBody,
  assertWirePrivateNoteContainsMarker,
} from "./provider-qbo-create-wire";
export {
  normalizeQboJournalEntry,
  hashNormalizedProviderJe,
  providerJeMatchesExpectedEconomics,
  qboAmountToCents,
} from "./provider-je-normalize";
export type { NormalizedProviderJe } from "./provider-je-normalize";
export {
  readJournalEntryById,
  findJournalEntryByCorrelationMarker,
  queryJournalEntriesByTxnDateWindow,
  mayRecordDiscoveredNotFound,
  JE_CRASH_RECOVERY_CONTRACT,
} from "./provider-qbo-read";
