/**
 * JE-3D — Read-only pre-dispatch checklist (Patent #6 custody gate).
 * No mutation. No provider calls. Mocks-only in tests.
 */

import {
  JE_3D_SANDBOX_QBO_API_BASE,
  isJe3dCreateCapabilityEnabled,
  isJe3dVerifyCapabilityEnabled,
  type Je3dActivationPolicyView,
} from "./je3d-activation-policy";
import {
  isVerifiedDemoAIdentityMatch,
  JE_3D_VERIFIED_DEMO_A_IDENTITY,
  resolveJe3dActivationPolicy,
} from "./je3d-first-controlled-create-activation";
import {
  FIRST_RUN_ACCOUNTS_REVIEWED_AND_APPROVED,
  FIRST_RUN_STAGED_ACCRUED_LIABILITY_ACCOUNT_ID,
  FIRST_RUN_STAGED_EXPENSE_ACCOUNT_ID,
  resolveFirstRunExplicitAccountEvidence,
} from "./je3d-first-run-account-authority";
import {
  FIRST_RUN_EXECUTION_REVIEWED_AND_APPROVED,
  FIRST_RUN_STAGED_EXECUTION_ID,
  isFirstRunDispatchAuthorized,
  resolveFirstRunExecutionIdentityEvidence,
} from "./je3d-first-run-execution-authority";
import type { ResolvedSandboxActivationAllowlist } from "./je3d-sandbox-company-authority";
import { classifyQbEnvironment } from "./je3d-sandbox-environment";
import type { GovernedJeActivationInspection } from "./je3d-activation-inspection";

export type Je3dPreDispatchChecklistReport = {
  candidate_execution_id: string | null;
  candidate_expense_account_id: string | null;
  candidate_accrued_liability_account_id: string | null;
  execution_reviewed_and_approved: boolean;
  accounts_reviewed_and_approved: boolean;
  dispatch_authorized: boolean;
  demo_a_company_authority_resolved: boolean;
  canonical_connection_exact: boolean;
  realm_exact: boolean;
  qb_environment_sandbox: boolean;
  sandbox_api_base_exact: string;
  execution_ready_to_post: boolean | null;
  proposal_immutable: boolean | null;
  provider_request_hash_exact: boolean | null;
  correlation_marker_exact: boolean | null;
  provider_attempt_absent_or_reserved_not_sent: boolean | null;
  no_previous_provider_create_attempt: boolean | null;
  je_balanced_exactly: boolean | null;
  create_capability_on: boolean;
  verify_capability_off: boolean;
  memory_off: boolean;
  worker_off: boolean;
  governed_auto_off: boolean;
  production_allowed_off: boolean;
  kill_switch_blocks_dispatch: boolean;
  qbo_post_made: false;
  qbo_get_made: false;
  all_activation_gates_pass: boolean;
};

export function buildJe3dPreDispatchChecklistReport(args: {
  policy?: Je3dActivationPolicyView;
  allowlist?: ResolvedSandboxActivationAllowlist | null;
  inspection?: GovernedJeActivationInspection | null;
  qbEnvironment?: string | null;
}): Je3dPreDispatchChecklistReport {
  const policy = args.policy ?? resolveJe3dActivationPolicy();
  const qbEnv = args.qbEnvironment ?? process.env.QB_ENVIRONMENT ?? null;
  const demoA = args.allowlist?.demoA ?? null;
  const inspection = args.inspection ?? null;
  const identityEvidence = resolveFirstRunExecutionIdentityEvidence();
  const accountEvidence = resolveFirstRunExplicitAccountEvidence();

  const authorityResolved =
    args.allowlist?.allowlistResolution === "resolved" &&
    demoA != null &&
    isVerifiedDemoAIdentityMatch({
      companyId: demoA.companyId,
      accountingConnectionId: demoA.accountingConnectionId,
      realmId: demoA.realmId,
      providerEnvironment: demoA.providerEnvironment,
      demoRole: demoA.demoRole,
    });

  const canonicalConnectionExact =
    demoA != null &&
    demoA.accountingConnectionId ===
      JE_3D_VERIFIED_DEMO_A_IDENTITY.accountingConnectionId;

  const realmExact =
    demoA != null && demoA.realmId === JE_3D_VERIFIED_DEMO_A_IDENTITY.realmId;

  const qbSandbox = classifyQbEnvironment(qbEnv ?? undefined).ok;

  const createOn = isJe3dCreateCapabilityEnabled(policy);
  const verifyOff = !isJe3dVerifyCapabilityEnabled(policy);
  const memoryOff = !policy.memoryWriteAllowed;
  const workerOff = !policy.workerAllowed;
  const governedAutoOff = !policy.governedAutoAllowed;
  const productionOff = !policy.productionAllowed;
  const killSwitchBlocks = Boolean(policy.sandboxDispatchKillSwitch);

  const executionReviewed = FIRST_RUN_EXECUTION_REVIEWED_AND_APPROVED;
  const accountsReviewed = FIRST_RUN_ACCOUNTS_REVIEWED_AND_APPROVED;
  const dispatchAuthorized = isFirstRunDispatchAuthorized({
    identityEvidence,
    accountEvidence,
    killSwitchActive: policy.sandboxDispatchKillSwitch,
  });

  let executionReady: boolean | null = null;
  let proposalImmutable: boolean | null = null;
  let requestHashExact: boolean | null = null;
  let markerExact: boolean | null = null;
  let attemptCustodyOk: boolean | null = null;
  let noPriorCreate: boolean | null = null;
  let jeBalanced: boolean | null = null;

  if (inspection) {
    executionReady = inspection.execution_status === "READY_TO_POST";
    proposalImmutable =
      inspection.proposal_hash.length > 0 &&
      inspection.execution_hash.length > 0 &&
      inspection.provider_request_hash_reconstructs;
    requestHashExact =
      inspection.provider_request_hash != null &&
      inspection.provider_request_hash.length > 0;
    markerExact =
      inspection.correlation_marker.startsWith("ADVJE:") &&
      inspection.private_note_contains_marker;
    attemptCustodyOk =
      inspection.provider_attempt_id == null ||
      (inspection.attempt_status === "RESERVED" &&
        inspection.commit_certainty === "NOT_SENT");
    noPriorCreate =
      inspection.qbo_je_id == null &&
      inspection.dispatch_receipt_id == null &&
      inspection.provider_outcome_receipt_id == null;
    jeBalanced =
      inspection.total_debits_cents === inspection.total_credits_cents &&
      inspection.total_debits_cents > 0;
  }

  const activationGatesPass =
    authorityResolved &&
    canonicalConnectionExact &&
    realmExact &&
    qbSandbox &&
    createOn &&
    verifyOff &&
    memoryOff &&
    workerOff &&
    governedAutoOff &&
    productionOff &&
    killSwitchBlocks &&
    !dispatchAuthorized;

  return {
    candidate_execution_id: FIRST_RUN_STAGED_EXECUTION_ID,
    candidate_expense_account_id: FIRST_RUN_STAGED_EXPENSE_ACCOUNT_ID,
    candidate_accrued_liability_account_id:
      FIRST_RUN_STAGED_ACCRUED_LIABILITY_ACCOUNT_ID,
    execution_reviewed_and_approved: executionReviewed,
    accounts_reviewed_and_approved: accountsReviewed,
    dispatch_authorized: dispatchAuthorized,
    demo_a_company_authority_resolved: authorityResolved,
    canonical_connection_exact: canonicalConnectionExact,
    realm_exact: realmExact,
    qb_environment_sandbox: qbSandbox,
    sandbox_api_base_exact: JE_3D_SANDBOX_QBO_API_BASE,
    execution_ready_to_post: executionReady,
    proposal_immutable: proposalImmutable,
    provider_request_hash_exact: requestHashExact,
    correlation_marker_exact: markerExact,
    provider_attempt_absent_or_reserved_not_sent: attemptCustodyOk,
    no_previous_provider_create_attempt: noPriorCreate,
    je_balanced_exactly: jeBalanced,
    create_capability_on: createOn,
    verify_capability_off: verifyOff,
    memory_off: memoryOff,
    worker_off: workerOff,
    governed_auto_off: governedAutoOff,
    production_allowed_off: productionOff,
    kill_switch_blocks_dispatch: killSwitchBlocks,
    qbo_post_made: false,
    qbo_get_made: false,
    all_activation_gates_pass: activationGatesPass,
  };
}
