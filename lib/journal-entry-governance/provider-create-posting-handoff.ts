/**
 * JE-3D / JE-3B2 — Governed READY_TO_POST → POSTING handoff before provider dispatch.
 *
 * Establishes the Patent #6 posting_started boundary atomically. Never issues QBO POST.
 */

import type { JeExecutionContext, JournalEntryExecutionRow } from "./execution-types";
import { JE_PROVIDER_ATTEMPT_ERROR } from "./provider-attempt-types";
import type { JournalEntryProviderAttemptRow } from "./provider-attempt-types";
import { loadProviderAttemptByExecutionId } from "./provider-attempt-repository";
import {
  loadExactExecution,
  reserveGovernedProviderAttempt,
  type ProviderAttemptServiceDeps,
} from "./provider-attempt-service";

export type EstablishGovernedPostingStartedHandoffResult =
  | {
      ok: true;
      execution: JournalEntryExecutionRow;
      attempt: JournalEntryProviderAttemptRow;
      postingStartedLedgerEventId: string | null;
    }
  | { ok: false; code: string; message: string };

function fail(
  code: string,
  message: string,
): Extract<EstablishGovernedPostingStartedHandoffResult, { ok: false }> {
  return { ok: false, code, message };
}

function assertAttemptPreDispatchCustody(
  attempt: JournalEntryProviderAttemptRow | null,
): Extract<EstablishGovernedPostingStartedHandoffResult, { ok: false }> | null {
  if (!attempt) {
    return fail(
      JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT,
      "Provider attempt must exist before governed posting handoff.",
    );
  }
  if (attempt.status !== "RESERVED" || attempt.commit_certainty !== "NOT_SENT") {
    return fail(
      JE_PROVIDER_ATTEMPT_ERROR.NO_GOVERNED_POST,
      "Posting handoff requires provider attempt RESERVED + NOT_SENT.",
    );
  }
  return null;
}

/**
 * After all first-run gates pass, atomically establish posting_started when needed.
 * Re-loads custody before returning. Does not call QBO.
 */
export async function establishGovernedPostingStartedHandoff(
  input: { executionId: string; ctx: JeExecutionContext },
  options?: { deps?: Partial<ProviderAttemptServiceDeps> },
): Promise<EstablishGovernedPostingStartedHandoffResult> {
  const loadAttempt = options?.deps?.loadAttempt || loadProviderAttemptByExecutionId;
  const execution = await loadExactExecution(input.executionId);
  if (!execution) {
    return fail("je_execution_not_found", "Execution not found.");
  }

  const preAttempt = await loadAttempt(input.executionId);
  const preAttemptError = assertAttemptPreDispatchCustody(preAttempt);
  if (preAttemptError) return preAttemptError;

  let postingStartedLedgerEventId: string | null = null;

  if (execution.status === "READY_TO_POST") {
    const reserved = await reserveGovernedProviderAttempt(
      { executionId: input.executionId },
      input.ctx,
      { publishPostingStarted: true, deps: options?.deps },
    );
    if (!reserved.ok) {
      return fail(reserved.code, reserved.message);
    }
    postingStartedLedgerEventId = reserved.ledgerEventId ?? null;
  } else if (execution.status !== "POSTING") {
    return fail(
      JE_PROVIDER_ATTEMPT_ERROR.EXECUTION_STATUS_INVALID,
      `Posting handoff requires READY_TO_POST or POSTING; found ${execution.status}`,
    );
  }

  const reloadedExecution = await loadExactExecution(input.executionId);
  if (!reloadedExecution) {
    return fail("je_execution_not_found", "Execution not found after posting_started.");
  }
  if (reloadedExecution.status !== "POSTING") {
    return fail(
      JE_PROVIDER_ATTEMPT_ERROR.EXECUTION_STATUS_INVALID,
      `Expected execution POSTING after posting_started; found ${reloadedExecution.status}`,
    );
  }

  const reloadedAttempt = await loadAttempt(input.executionId);
  const postAttemptError = assertAttemptPreDispatchCustody(reloadedAttempt);
  if (postAttemptError) return postAttemptError;

  return {
    ok: true,
    execution: reloadedExecution,
    attempt: reloadedAttempt!,
    postingStartedLedgerEventId,
  };
}
