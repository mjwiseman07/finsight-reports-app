/**
 * JE-3D — First-run pre-POST review object (read/preparation authority only).
 * Does not mutate provider state. Does not authorize turning the kill switch off.
 */

import {
  isJe3dCreateCapabilityEnabled,
  isJe3dVerifyCapabilityEnabled,
  type Je3dActivationPolicyView,
} from "./je3d-activation-policy";
import { resolveJe3dActivationPolicy } from "./je3d-first-controlled-create-activation";
import {
  FIRST_RUN_ACCOUNTS_REVIEWED_AND_APPROVED,
  FIRST_RUN_ACCRUED_LIABILITY_ACCOUNT_ID,
  FIRST_RUN_EXPENSE_ACCOUNT_ID,
  FIRST_RUN_JE_AMOUNT_CENTS,
  FIRST_RUN_JE_CURRENCY,
} from "./je3d-first-run-account-authority";
import {
  FIRST_RUN_APPROVED_EXECUTION_ID,
  FIRST_RUN_EXECUTION_REVIEWED_AND_APPROVED,
} from "./je3d-first-run-execution-authority";
import type { GovernedJeActivationInspection } from "./je3d-activation-inspection";

export type FirstRunPrePostReview = {
  create_capability_enabled: boolean;
  verify_capability_enabled: boolean;
  sandbox_dispatch_kill_switch: boolean;
  memory_write_allowed: boolean;
  worker_allowed: boolean;
  governed_auto_allowed: boolean;
  first_run_expense_account_id: string | null;
  first_run_accrued_liability_account_id: string | null;
  first_run_accounts_reviewed_and_approved: boolean;
  first_run_approved_execution_id: string | null;
  first_run_execution_reviewed_and_approved: boolean;
  first_run_amount_cents: number;
  first_run_currency: string;
  public_create_can_reach_provider_post: false;
  kill_switch_blocks_dispatch: boolean;
  custody: GovernedJeActivationInspection | null;
  preflight_blockers: string[];
  SAFE_TO_REQUEST_POST_APPROVAL: boolean;
};

/**
 * Build the first-run review package ChatGPT uses before any kill-switch release.
 * When no staged custody exists yet, returns blockers and SAFE=false.
 */
export function buildFirstRunPrePostReview(args?: {
  policy?: Je3dActivationPolicyView;
  custody?: GovernedJeActivationInspection | null;
  extraBlockers?: string[];
}): FirstRunPrePostReview {
  const policy = args?.policy ?? resolveJe3dActivationPolicy();
  const custody = args?.custody ?? null;
  const blockers: string[] = [...(args?.extraBlockers ?? [])];

  if (!isJe3dCreateCapabilityEnabled(policy)) {
    blockers.push("CREATE_SANDBOX_JE is OFF");
  }
  if (isJe3dVerifyCapabilityEnabled(policy)) {
    blockers.push("VERIFY_SANDBOX_JE must remain OFF for first controlled create");
  }
  if (!policy.sandboxDispatchKillSwitch) {
    blockers.push(
      "sandboxDispatchKillSwitch is OFF — must stay ON until ChatGPT authorizes the single POST",
    );
  }
  if (!FIRST_RUN_EXPENSE_ACCOUNT_ID) {
    blockers.push("FIRST_RUN_EXPENSE_ACCOUNT_ID is not set");
  }
  if (!FIRST_RUN_ACCRUED_LIABILITY_ACCOUNT_ID) {
    blockers.push("FIRST_RUN_ACCRUED_LIABILITY_ACCOUNT_ID is not set");
  }
  if (!FIRST_RUN_ACCOUNTS_REVIEWED_AND_APPROVED) {
    blockers.push("FIRST_RUN_ACCOUNTS_REVIEWED_AND_APPROVED is false");
  }
  if (!FIRST_RUN_APPROVED_EXECUTION_ID) {
    blockers.push("FIRST_RUN_APPROVED_EXECUTION_ID is not set");
  }
  if (!FIRST_RUN_EXECUTION_REVIEWED_AND_APPROVED) {
    blockers.push("FIRST_RUN_EXECUTION_REVIEWED_AND_APPROVED is false");
  }
  if (!custody) {
    blockers.push("No staged Patent #6 custody package exists yet");
  } else {
    if (custody.dispatch_receipt_id) {
      blockers.push("dispatch receipt already exists — not a first controlled create");
    }
    if (custody.qbo_je_id) {
      blockers.push("qbo_je_id already exists — provider mutation already occurred");
    }
    if (custody.qbo_post_made) {
      blockers.push("qbo_post_made is true");
    }
    if (
      custody.attempt_status &&
      custody.attempt_status !== "RESERVED"
    ) {
      blockers.push(
        `provider attempt status is ${custody.attempt_status}, expected RESERVED`,
      );
    }
    if (
      custody.commit_certainty &&
      custody.commit_certainty !== "NOT_SENT"
    ) {
      blockers.push(
        `commit_certainty is ${custody.commit_certainty}, expected NOT_SENT`,
      );
    }
  }

  const uniqueBlockers = [...new Set(blockers)];
  return {
    create_capability_enabled: isJe3dCreateCapabilityEnabled(policy),
    verify_capability_enabled: isJe3dVerifyCapabilityEnabled(policy),
    sandbox_dispatch_kill_switch: Boolean(policy.sandboxDispatchKillSwitch),
    memory_write_allowed: Boolean(policy.memoryWriteAllowed),
    worker_allowed: Boolean(policy.workerAllowed),
    governed_auto_allowed: Boolean(policy.governedAutoAllowed),
    first_run_expense_account_id: FIRST_RUN_EXPENSE_ACCOUNT_ID,
    first_run_accrued_liability_account_id:
      FIRST_RUN_ACCRUED_LIABILITY_ACCOUNT_ID,
    first_run_accounts_reviewed_and_approved:
      FIRST_RUN_ACCOUNTS_REVIEWED_AND_APPROVED,
    first_run_approved_execution_id: FIRST_RUN_APPROVED_EXECUTION_ID,
    first_run_execution_reviewed_and_approved:
      FIRST_RUN_EXECUTION_REVIEWED_AND_APPROVED,
    first_run_amount_cents: FIRST_RUN_JE_AMOUNT_CENTS,
    first_run_currency: FIRST_RUN_JE_CURRENCY,
    public_create_can_reach_provider_post: false,
    kill_switch_blocks_dispatch: Boolean(policy.sandboxDispatchKillSwitch),
    custody,
    preflight_blockers: uniqueBlockers,
    SAFE_TO_REQUEST_POST_APPROVAL: uniqueBlockers.length === 0,
  };
}
