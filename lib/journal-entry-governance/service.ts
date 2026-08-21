/**
 * JE-1 — create Continuous-Close–sourced journal entry proposals.
 *
 * No provider write. No approval. No GOVERNED_AUTO. No worker.
 */

import { randomUUID } from "node:crypto";
import { resolveEngagementActorForVerifiedUser } from "@/lib/audit-ready/server-auth";
import {
  canonicalizeJeProposalPolicy,
  hashJeProposal,
  hashJeProposalIdempotencyKey,
  hashJeProposalPolicy,
} from "./proposal-hash";
import { persistJournalEntryProposal } from "./repository";
import {
  assertClosePeriodNotLocked,
  loadAccountsFromCoaMirror,
  loadEngagementCustody,
  loadExactAuthoritativeReconRun,
  loadExactContinuousCloseRun,
  loadExactSourceAccountingSync,
  resolveAuthoritativeCcReconSlot,
} from "./source-custody";
import {
  DEFAULT_JE_PROPOSAL_POLICY,
  JE_PROPOSAL_ERROR,
  type CreateJeProposalInput,
  type CreateJeProposalResult,
  type JeProposalExecutionContext,
  type JeProposalPolicy,
  type JournalEntryProposalRow,
} from "./types";
import {
  assertTxnDateInPeriod,
  JeProposalValidationError,
  rejectControlAccounts,
  validateAndNormalizeLines,
  validateCurrency,
  validateExpectedEffects,
  validateMemo,
  validateOriginClass,
} from "./validation";
import { JeProposalCustodyError } from "./source-custody";
import { JeProposalPersistError } from "./repository";

const SECRET_JSON_RE =
  /access[_-]?token|refresh[_-]?token|"authorization"|authorization:/i;

const FORBIDDEN_CALLER_KEYS = [
  "companyId",
  "firmClientId",
  "sourceAccountingSyncId",
  "realmId",
  "connectionId",
  "proposedBy",
  "providerToken",
  "accessToken",
  "providerJournalId",
] as const;

export type CreateJeProposalDeps = {
  resolveActor: typeof resolveEngagementActorForVerifiedUser;
  loadEngagement: typeof loadEngagementCustody;
  loadCcRun: typeof loadExactContinuousCloseRun;
  loadSync: typeof loadExactSourceAccountingSync;
  resolveCcReconSlot: typeof resolveAuthoritativeCcReconSlot;
  loadRecon: typeof loadExactAuthoritativeReconRun;
  loadAccounts: typeof loadAccountsFromCoaMirror;
  assertPeriodNotLocked: typeof assertClosePeriodNotLocked;
  persist: typeof persistJournalEntryProposal;
  newId: () => string;
  nowIso: () => string;
};

export function createDefaultJeProposalDeps(): CreateJeProposalDeps {
  return {
    resolveActor: resolveEngagementActorForVerifiedUser,
    loadEngagement: loadEngagementCustody,
    loadCcRun: loadExactContinuousCloseRun,
    loadSync: loadExactSourceAccountingSync,
    resolveCcReconSlot: resolveAuthoritativeCcReconSlot,
    loadRecon: loadExactAuthoritativeReconRun,
    loadAccounts: loadAccountsFromCoaMirror,
    assertPeriodNotLocked: assertClosePeriodNotLocked,
    persist: persistJournalEntryProposal,
    newId: () => randomUUID(),
    nowIso: () => new Date().toISOString(),
  };
}

function requireVerifiedUser(
  executionContext: JeProposalExecutionContext | null | undefined,
): { userId: string } {
  if (!executionContext?.principal) {
    throw new JeProposalValidationError(
      JE_PROPOSAL_ERROR.PRINCIPAL_REQUIRED,
      "A verified execution principal is required.",
    );
  }
  if (executionContext.principal.type !== "user") {
    throw new JeProposalValidationError(
      JE_PROPOSAL_ERROR.UNSUPPORTED_PRINCIPAL,
      "JE-1 supports verified user principals only.",
    );
  }
  const userId = String(executionContext.principal.userId || "").trim();
  if (!userId) {
    throw new JeProposalValidationError(
      JE_PROPOSAL_ERROR.PRINCIPAL_REQUIRED,
      "Verified principal.userId is required.",
    );
  }
  return { userId };
}

function requireExplicitPolicy(policy: JeProposalPolicy | null | undefined): JeProposalPolicy {
  if (!policy || typeof policy !== "object") {
    throw new JeProposalValidationError(
      JE_PROPOSAL_ERROR.POLICY_REQUIRED,
      "proposalPolicy is required. DEFAULT_JE_PROPOSAL_POLICY is not a silent launch default.",
    );
  }
  return policy;
}

function assertNoCallerAuthorityOverride(input: CreateJeProposalInput): void {
  const raw = input as Record<string, unknown>;
  for (const key of FORBIDDEN_CALLER_KEYS) {
    if (raw[key] !== undefined && raw[key] !== null) {
      throw new JeProposalValidationError(
        JE_PROPOSAL_ERROR.CALLER_AUTHORITY_OVERRIDE,
        `Caller must not supply ${key}; custody loads authority fields.`,
      );
    }
  }
}

function assertNoSecrets(value: unknown, label: string): void {
  const text = JSON.stringify(value);
  if (SECRET_JSON_RE.test(text)) {
    throw new JeProposalValidationError(
      JE_PROPOSAL_ERROR.PERSIST_FAILED,
      `${label} must not contain secrets.`,
    );
  }
}

export async function createContinuousCloseJournalEntryProposal(
  input: CreateJeProposalInput,
  executionContext: JeProposalExecutionContext,
  proposalPolicy: JeProposalPolicy,
  deps?: Partial<CreateJeProposalDeps>,
): Promise<CreateJeProposalResult> {
  const resolved: CreateJeProposalDeps = {
    ...createDefaultJeProposalDeps(),
    ...deps,
  };

  try {
    const policy = requireExplicitPolicy(proposalPolicy);
    const { userId } = requireVerifiedUser(executionContext);
    assertNoCallerAuthorityOverride(input);

    const engagementId = String(input.engagementId || "").trim();
    if (!engagementId) {
      return {
        ok: false,
        code: JE_PROPOSAL_ERROR.WRITE_FORBIDDEN,
        message: "engagementId is required.",
      };
    }

    const actor = await resolved.resolveActor({
      engagementId,
      userId,
    });
    if (!actor || actor.userId !== userId || !actor.canWrite) {
      return {
        ok: false,
        code: JE_PROPOSAL_ERROR.WRITE_FORBIDDEN,
        message: "Verified user cannot write this engagement.",
      };
    }

    const engagement = await resolved.loadEngagement(engagementId);
    const ccRun = await resolved.loadCcRun({
      runId: input.sourceContinuousCloseRunId,
      expectedEngagementId: engagementId,
      expectedCompanyId: engagement.companyId,
    });

    const sync = await resolved.loadSync({
      accountingSyncId: ccRun.accountingSyncId,
      expectedCompanyId: engagement.companyId,
      expectedPeriodEnd: ccRun.periodEnd,
    });

    const reasonCode = String(input.reasonCode || "").trim();
    if (!reasonCode) {
      return {
        ok: false,
        code: JE_PROPOSAL_ERROR.REASON_REQUIRED,
        message: "reasonCode is required.",
      };
    }

    const currency = validateCurrency(input.currency);
    const memo = validateMemo(input.memo, policy);
    const lineResult = validateAndNormalizeLines(input.lines, policy);
    const expectedEffects = validateExpectedEffects(input.expectedEffects, policy);

    assertTxnDateInPeriod({
      txnDate: String(input.txnDate || "").slice(0, 10),
      periodEnd: ccRun.periodEnd,
      periodStart: sync.periodStart,
      allowCrossPeriod: false,
    });
    await resolved.assertPeriodNotLocked({
      firmClientId: engagement.firmClientId ?? ccRun.firmClientId,
      txnDate: String(input.txnDate || "").slice(0, 10),
    });

    const firmClientId = engagement.firmClientId ?? ccRun.firmClientId;
    if (!firmClientId) {
      return {
        ok: false,
        code: JE_PROPOSAL_ERROR.ACCOUNT_NOT_FOUND,
        message: "firm_client_id is required to validate accounts from qbo_coa_mirror.",
      };
    }

    const accounts = await resolved.loadAccounts({
      firmClientId,
      accountIds: lineResult.lines.map((l) => l.accountId),
    });
    rejectControlAccounts({
      lines: lineResult.lines,
      accounts,
      engagementControlAccountIds: {
        ar: engagement.arControlAccountId,
        ap: engagement.apControlAccountId,
        inventory: engagement.inventoryControlAccountId,
      },
      policy,
    });
    validateOriginClass({
      originType: input.originType,
      lines: lineResult.lines,
      accounts,
      policy,
    });

    const requestedReconIds = [...new Set((input.sourceReconRunIds || []).map(String))];
    if (policy.requireAuthoritativeReconSource && requestedReconIds.length === 0) {
      return {
        ok: false,
        code: JE_PROPOSAL_ERROR.RECON_REQUIRED,
        message: "At least one authoritative source recon run is required.",
      };
    }
    const validatedReconIds: string[] = [];
    for (const runId of requestedReconIds) {
      const slot = resolved.resolveCcReconSlot({
        observationSummary: ccRun.observationSummary,
        requestedRunId: runId,
        sourceAccountingSyncId: sync.id,
      });
      const recon = await resolved.loadRecon({
        runId,
        expectedEngagementId: engagementId,
        expectedPeriodEnd: ccRun.periodEnd,
        expectedBaselineSyncId: sync.id,
        expectedKind: slot.expectedKind,
      });
      validatedReconIds.push(recon.id);
    }
    validatedReconIds.sort((a, b) => a.localeCompare(b));

    const policyHash = hashJeProposalPolicy(policy);
    const proposalHash = hashJeProposal({
      companyId: engagement.companyId,
      engagementId,
      firmClientId,
      periodEnd: ccRun.periodEnd,
      sourceContinuousCloseRunId: ccRun.id,
      sourceAccountingSyncId: sync.id,
      sourceReconRunIds: validatedReconIds,
      originType: input.originType,
      reasonCode,
      memo,
      currency,
      txnDate: String(input.txnDate).slice(0, 10),
      lines: lineResult.lines,
      totalDebitsCents: lineResult.totalDebitsCents,
      totalCreditsCents: lineResult.totalCreditsCents,
      expectedEffects,
      policyHash,
    });
    const idempotencyKey = hashJeProposalIdempotencyKey({
      companyId: engagement.companyId,
      engagementId,
      sourceContinuousCloseRunId: ccRun.id,
      proposalHash,
    });

    const proposedAt = resolved.nowIso();
    const proposalId = resolved.newId();
    const row: JournalEntryProposalRow = {
      id: proposalId,
      company_id: engagement.companyId,
      engagement_id: engagementId,
      firm_client_id: firmClientId,
      period_end: ccRun.periodEnd,
      source_continuous_close_run_id: ccRun.id,
      source_accounting_sync_id: sync.id,
      source_recon_run_ids: validatedReconIds,
      origin_type: input.originType,
      reason_code: reasonCode,
      memo,
      currency,
      txn_date: String(input.txnDate).slice(0, 10),
      lines: lineResult.lines,
      total_debits_cents: lineResult.totalDebitsCents,
      total_credits_cents: lineResult.totalCreditsCents,
      expected_effects: expectedEffects,
      policy_snapshot: canonicalizeJeProposalPolicy(policy),
      policy_hash: policyHash,
      proposal_hash: proposalHash,
      status: "SUBMITTED",
      proposed_by: actor.userId,
      proposed_at: proposedAt,
      idempotency_key: idempotencyKey,
    };

    const eventPayload = {
      proposal_id: row.id,
      company_id: row.company_id,
      engagement_id: row.engagement_id,
      source_continuous_close_run_id: row.source_continuous_close_run_id,
      source_accounting_sync_id: row.source_accounting_sync_id,
      source_recon_run_ids: row.source_recon_run_ids,
      origin_type: row.origin_type,
      reason_code: row.reason_code,
      policy_hash: row.policy_hash,
      proposal_hash: row.proposal_hash,
      total_debits_cents: row.total_debits_cents,
      total_credits_cents: row.total_credits_cents,
    };
    assertNoSecrets(row, "proposal");
    assertNoSecrets(eventPayload, "ledger event payload");

    const persisted = await resolved.persist({
      row,
      eventPayload,
      firmId: engagement.firmId,
      firmClientId,
      engagementId,
      closePeriodId: null,
      actorId: actor.userId,
    });

    return {
      ok: true,
      proposal: persisted.row,
      reused: persisted.reused,
      ledgerEventId: persisted.ledgerEventId,
    };
  } catch (error) {
    if (
      error instanceof JeProposalValidationError ||
      error instanceof JeProposalCustodyError ||
      error instanceof JeProposalPersistError
    ) {
      return { ok: false, code: error.code, message: error.message };
    }
    return {
      ok: false,
      code: JE_PROPOSAL_ERROR.PERSIST_FAILED,
      message: error instanceof Error ? error.message : "unknown error",
    };
  }
}

export { DEFAULT_JE_PROPOSAL_POLICY };
