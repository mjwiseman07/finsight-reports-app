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
  assertJe3cDbTransitionEventPair,
  assertJe3cEventPayloadStatusMatches,
  isJe3aDbTransitionAuthorized,
  isJe3b1DbTransitionAuthorized,
  isJe3cDbTransitionAuthorized,
  JE_3A_DB_TRANSITION_EVENT_MATRIX,
  JE_3B1_DB_TRANSITION_EVENT_MATRIX,
  JE_3C_DB_TRANSITION_EVENT_MATRIX,
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
  JE_3C_FEATURE_GATE,
  JE_3C_GATE_ERROR,
  assertJe3cVerificationEnabled,
  assertJe3cLiveGetNotEnabled,
  assertJe3cMemoryWriteNotEnabled,
  isJe3cVerificationEnabled,
} from "./je3c-feature-gate";
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
  JE_3D_ACTIVATION_POLICY,
  JE_3D_ACTIVATION_ERROR,
  JE_3D_SANDBOX_QBO_API_BASE,
  Je3dActivationError,
  assertJe3dMemoryWriteNotEnabled,
  isJe3dCreateCapabilityEnabled,
  isJe3dVerifyCapabilityEnabled,
} from "./je3d-activation-policy";
export {
  classifyQbEnvironment,
  assertJe3dSandboxQboEnvironment,
  rejectCallerTransportOverrides,
} from "./je3d-sandbox-environment";
export {
  resolveSandboxActivationAllowlist,
  buildSandboxAllowlistFromRows,
  assertExecutionOnAllowlistedSandbox,
  assertTokenRealmMatchesConnection,
  JE_ACTIVATION_DEMO_ROLE_DEMO_A,
} from "./je3d-sandbox-company-authority";
export type {
  ResolvedSandboxActivationAllowlist,
  SandboxActivationAuthorityRow,
  SandboxAllowlistResolution,
} from "./je3d-sandbox-company-authority";
export {
  assertJe3dCreateActivationPolicy,
  assertJe3dVerifyActivationPolicy,
  assertJe3dSandboxExecutionCustody,
  assertJe3dSandboxInspectionCustody,
} from "./je3d-activation-guards";
export {
  inspectGovernedJeActivationCustody,
  buildActivationInspectionFromCustody,
} from "./je3d-activation-inspection";
export {
  JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY,
  JE_3D_VERIFIED_DEMO_A_IDENTITY,
  resolveJe3dActivationPolicy,
  isVerifiedDemoAIdentityMatch,
} from "./je3d-first-controlled-create-activation";
export {
  buildJe3dPreDispatchChecklistReport,
} from "./je3d-pre-dispatch-checklist";
export type { Je3dPreDispatchChecklistReport } from "./je3d-pre-dispatch-checklist";
export { JE_3D_FIRST_RUN_PROPOSED_CANDIDATE } from "./je3d-first-run-proposed-candidate";
export {
  FIRST_RUN_STAGED_EXPENSE_ACCOUNT_ID,
  FIRST_RUN_STAGED_ACCRUED_LIABILITY_ACCOUNT_ID,
  FIRST_RUN_EXPENSE_ACCOUNT_ID,
  FIRST_RUN_ACCRUED_LIABILITY_ACCOUNT_ID,
  FIRST_RUN_ACCOUNTS_REVIEWED_AND_APPROVED,
  FIRST_RUN_ACCOUNT_APPROVAL_RECOMMENDATION,
  FIRST_RUN_JE_AMOUNT_CENTS,
  FIRST_RUN_JE_CURRENCY,
  buildFirstRunAccountCandidate,
  buildFirstRunAccountCandidateReport,
  classifyFirstRunAccountExclusions,
  isEligibleAccruedLiabilityAccount,
  isEligibleOrdinaryExpenseAccount,
  resolveFirstRunExplicitAccountEvidence,
  resolveFirstRunStagedAccountEvidence,
  validateExplicitFirstRunAccounts,
  validateStagedFirstRunAccounts,
} from "./je3d-first-run-account-authority";
export type {
  CoaMirrorAccountRow,
  FirstRunAccountCandidate,
  FirstRunAccountCandidateReport,
  FirstRunAccountExclusion,
} from "./je3d-first-run-account-authority";
export {
  FIRST_RUN_STAGED_EXECUTION_ID,
  FIRST_RUN_APPROVED_EXECUTION_ID,
  FIRST_RUN_EXECUTION_REVIEWED_AND_APPROVED,
  isFirstRunDispatchAuthorized,
  FIRST_RUN_REASON_CODE,
  FIRST_RUN_EXECUTION_AUTHORITY_ERROR,
  evaluateFirstRunCreateAuthority,
  evaluateFirstRunExecutionEconomicsGate,
  evaluateFirstRunExecutionIdentityGate,
  resolveFirstRunExecutionIdentityEvidence,
} from "./je3d-first-run-execution-authority";
export type {
  GovernedJeActivationInspection,
  GovernedJeActivationLineInspection,
} from "./je3d-activation-inspection";
export { verifyGovernedJournalEntry } from "./provider-verification-service";
export type {
  VerifyGovernedJeInput,
  VerifyGovernedJeResult,
} from "./provider-verification-service";
export {
  toGovernedQboJournalEntryWireBody,
  assertWirePrivateNoteContainsMarker,
} from "./provider-qbo-create-wire";
export {
  normalizeQboJournalEntry,
  hashNormalizedProviderJe,
  providerJeMatchesExpectedEconomics,
  compareProviderJeEconomics,
  privateNoteContainsExactCorrelationMarker,
  qboAmountToCents,
  normalizeCurrency,
} from "./provider-je-normalize";
export type {
  NormalizedProviderJe,
  JeEconomicMismatchDimension,
} from "./provider-je-normalize";
export {
  readJournalEntryById,
  findJournalEntryByCorrelationMarker,
  queryJournalEntriesByTxnDateWindow,
  mayRecordDiscoveredNotFound,
  JE_CRASH_RECOVERY_CONTRACT,
} from "./provider-qbo-read";
