import { describe, expect, it } from "vitest";
import { decideJournalEntryProposal } from "../approval-service";
import type { DecideJeApprovalDeps } from "../approval-service";
import {
  DEFAULT_JE_APPROVAL_POLICY,
  JE_APPROVAL_ERROR,
  type JeApprovalPolicy,
  type JeAuthenticationAssurance,
  type JournalEntryApprovalRow,
} from "../approval-types";
import type { JournalEntryProposalRow } from "../types";
import { hashJeApprovalIdempotencyKey, hashJeApprovalPolicy } from "../approval-hash";
import { evaluateApprovalValidity } from "../approval-validity";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PROP = "11111111-1111-1111-1111-111111111111";
const CO = "22222222-2222-2222-2222-222222222222";
const ENG = "33333333-3333-3333-3333-333333333333";
const CC = "44444444-4444-4444-4444-444444444444";
const SYNC = "55555555-5555-5555-5555-555555555555";
const PROPOSER = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const REVIEWER = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const HASH_P = "a".repeat(64);
const HASH_POL = "b".repeat(64);

function proposal(over: Partial<JournalEntryProposalRow> = {}): JournalEntryProposalRow {
  return {
    id: PROP,
    company_id: CO,
    engagement_id: ENG,
    firm_client_id: "fc-1",
    period_end: "2026-07-31",
    source_continuous_close_run_id: CC,
    source_accounting_sync_id: SYNC,
    source_recon_run_ids: ["run-ar"],
    origin_type: "ACCRUAL",
    reason_code: "accrue_expense",
    memo: "test",
    currency: "USD",
    txn_date: "2026-07-31",
    lines: [
      { sequence: 1, accountId: "exp-1", debitCents: 50_000, creditCents: 0 },
      { sequence: 2, accountId: "liab-1", debitCents: 0, creditCents: 50_000 },
    ],
    total_debits_cents: 50_000,
    total_credits_cents: 50_000,
    expected_effects: [],
    policy_snapshot: {},
    policy_hash: HASH_POL,
    proposal_hash: HASH_P,
    status: "SUBMITTED",
    proposed_by: PROPOSER,
    proposed_at: "2026-08-20T12:00:00.000Z",
    idempotency_key: "c".repeat(64),
    ...over,
  };
}

function policy(over: Partial<JeApprovalPolicy> = {}): JeApprovalPolicy {
  return { ...DEFAULT_JE_APPROVAL_POLICY, ...over };
}

function assurance(
  over: Partial<JeAuthenticationAssurance> = {},
): JeAuthenticationAssurance {
  return {
    satisfied: true,
    level: "aal2",
    verifiedAt: "2026-08-21T04:00:00.000Z",
    method: "totp",
    source: "mfa_step_up_cookie",
    ...over,
  };
}

function makeHarness(opts?: {
  proposal?: JournalEntryProposalRow | null;
  superseded?: boolean;
  syncMissing?: boolean;
  reconMissing?: boolean;
  priorRejected?: boolean;
  closePeriodId?: string | null;
  syncPeriodStart?: string | null;
  approver?: {
    userId: string;
    scope: "company" | "firm" | "super_admin";
    role: string;
    canApprove: true;
    firmCanApproveFlag: boolean | null;
  } | null;
  assurance?: JeAuthenticationAssurance;
  persistImpl?: DecideJeApprovalDeps["persist"];
}) {
  const rows: JournalEntryApprovalRow[] = [];
  const persistCalls: unknown[] = [];
  const closePeriodLookups: unknown[] = [];

  const deps: DecideJeApprovalDeps = {
    async loadProposal(id) {
      if (opts && "proposal" in opts && opts.proposal === null) {
        const { JeApprovalCustodyError } = await import("../approval-custody");
        throw new JeApprovalCustodyError(
          JE_APPROVAL_ERROR.PROPOSAL_NOT_FOUND,
          "missing",
        );
      }
      const row = opts?.proposal ?? proposal();
      if (row.id !== id && opts?.proposal) {
        const { JeApprovalCustodyError } = await import("../approval-custody");
        throw new JeApprovalCustodyError(
          JE_APPROVAL_ERROR.PROPOSAL_NOT_FOUND,
          "id mismatch",
        );
      }
      return row;
    },
    async loadSourceCc(args) {
      return {
        id: args.runId,
        engagementId: args.expectedEngagementId,
        companyId: args.expectedCompanyId,
        accountingSyncId: args.expectedAccountingSyncId,
        periodEnd: "2026-07-31",
        readiness: "READY",
        status: "completed",
        mode: "OBSERVE",
      };
    },
    async assertNotSuperseded() {
      if (opts?.superseded) {
        const { JeApprovalCustodyError } = await import("../approval-custody");
        throw new JeApprovalCustodyError(
          JE_APPROVAL_ERROR.SOURCE_CC_SUPERSEDED,
          "superseded",
        );
      }
    },
    async assertSyncExists() {
      if (opts?.syncMissing) {
        const { JeApprovalCustodyError } = await import("../approval-custody");
        throw new JeApprovalCustodyError(
          JE_APPROVAL_ERROR.SOURCE_SYNC_MISSING,
          "missing sync",
        );
      }
    },
    async assertReconsExist() {
      if (opts?.reconMissing) {
        const { JeApprovalCustodyError } = await import("../approval-custody");
        throw new JeApprovalCustodyError(
          JE_APPROVAL_ERROR.SOURCE_RECON_MISSING,
          "missing recon",
        );
      }
    },
    async loadPriorRejection() {
      return Boolean(opts?.priorRejected);
    },
    async resolveApprover({ userId }) {
      if (opts && "approver" in opts && opts.approver === null) {
        const { JeApprovalAuthorityError } = await import("../approval-authority");
        throw new JeApprovalAuthorityError(
          JE_APPROVAL_ERROR.ENGAGEMENT_ACCESS_DENIED,
          "denied",
        );
      }
      return (
        opts?.approver ?? {
          userId,
          scope: "firm" as const,
          role: "firm_admin",
          canApprove: true as const,
          firmCanApproveFlag: true,
        }
      );
    },
    async resolveAssurance() {
      return opts?.assurance ?? assurance();
    },
    async loadFirmId() {
      return "firm-1";
    },
    async resolveClosePeriodId(args) {
      closePeriodLookups.push(args);
      // Default: no exact close period (null). Tests override via closePeriodId.
      if ("closePeriodId" in (opts || {})) return opts!.closePeriodId ?? null;
      return null;
    },
    async persist(input) {
      persistCalls.push(input);
      if (opts?.persistImpl) return opts.persistImpl(input);
      const existing = rows.find(
        (r) => r.idempotency_key === input.row.idempotency_key,
      );
      if (existing) {
        return { reused: true, row: existing, ledgerEventId: null };
      }
      rows.push(input.row);
      return { reused: false, row: input.row, ledgerEventId: "evt-1" };
    },
    newId: () => "approval-1",
    nowIso: () => "2026-08-21T04:30:00.000Z",
  };

  return { deps, rows, persistCalls, closePeriodLookups };
}

describe("decideJournalEntryProposal", () => {
  it("requires verified user principal and rejects non-user principal", async () => {
    const h = makeHarness();
    const missing = await decideJournalEntryProposal(
      { proposalId: PROP, decision: "APPROVED" },
      { principal: { type: "user", userId: "" } },
      policy(),
      h.deps,
    );
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.code).toBe(JE_APPROVAL_ERROR.PRINCIPAL_REQUIRED);

    const system = await decideJournalEntryProposal(
      { proposalId: PROP, decision: "APPROVED" },
      {
        principal: { type: "system", userId: REVIEWER },
      } as never,
      policy(),
      h.deps,
    );
    expect(system.ok).toBe(false);
    if (!system.ok) expect(system.code).toBe(JE_APPROVAL_ERROR.UNSUPPORTED_PRINCIPAL);
  });

  it("requires exact proposal and SUBMITTED status", async () => {
    const missing = await decideJournalEntryProposal(
      { proposalId: PROP, decision: "APPROVED" },
      { principal: { type: "user", userId: REVIEWER } },
      policy(),
      makeHarness({ proposal: null }).deps,
    );
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.code).toBe(JE_APPROVAL_ERROR.PROPOSAL_NOT_FOUND);
  });

  it("rejects invalid decision", async () => {
    const h = makeHarness();
    const result = await decideJournalEntryProposal(
      { proposalId: PROP, decision: "POSTED" as "APPROVED" },
      { principal: { type: "user", userId: REVIEWER } },
      policy(),
      h.deps,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(JE_APPROVAL_ERROR.DECISION_INVALID);
  });

  it("requires explicit approval policy", async () => {
    const h = makeHarness();
    const result = await decideJournalEntryProposal(
      { proposalId: PROP, decision: "APPROVED" },
      { principal: { type: "user", userId: REVIEWER } },
      null as unknown as JeApprovalPolicy,
      h.deps,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(JE_APPROVAL_ERROR.POLICY_REQUIRED);
  });

  it("binds stored proposal_hash and does not take caller economics", async () => {
    const h = makeHarness();
    const result = await decideJournalEntryProposal(
      { proposalId: PROP, decision: "APPROVED" },
      { principal: { type: "user", userId: REVIEWER } },
      policy({ mfaRequiredAboveCents: null, alwaysRequireMfa: false }),
      h.deps,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.approval.proposal_hash).toBe(HASH_P);
    expect(result.approval.proposal_hash).toBe(proposal().proposal_hash);
    expect(h.persistCalls[0]).toMatchObject({
      row: expect.objectContaining({ proposal_hash: HASH_P }),
    });
  });

  it("persists approval policy hash distinct from proposal policy hash", async () => {
    const h = makeHarness();
    const pol = policy({ mfaRequiredAboveCents: null });
    const expected = hashJeApprovalPolicy(pol);
    const result = await decideJournalEntryProposal(
      { proposalId: PROP, decision: "APPROVED" },
      { principal: { type: "user", userId: REVIEWER } },
      pol,
      h.deps,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.approval.policy_hash).toBe(expected);
    expect(result.approval.policy_hash).not.toBe(HASH_POL);
  });

  it("enforces SoD: proposer may not approve under default policy", async () => {
    const h = makeHarness({
      approver: {
        userId: PROPOSER,
        scope: "firm",
        role: "firm_admin",
        canApprove: true,
        firmCanApproveFlag: true,
      },
    });
    const result = await decideJournalEntryProposal(
      { proposalId: PROP, decision: "APPROVED" },
      { principal: { type: "user", userId: PROPOSER } },
      policy(),
      h.deps,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(JE_APPROVAL_ERROR.SOD_VIOLATION);
  });

  it("accepts distinct reviewer under SoD", async () => {
    const h = makeHarness();
    const result = await decideJournalEntryProposal(
      { proposalId: PROP, decision: "APPROVED" },
      { principal: { type: "user", userId: REVIEWER } },
      policy({ mfaRequiredAboveCents: null }),
      h.deps,
    );
    expect(result.ok).toBe(true);
  });

  it("self-approval cannot be enabled by caller input (only policy)", async () => {
    const h = makeHarness({
      approver: {
        userId: PROPOSER,
        scope: "firm",
        role: "firm_admin",
        canApprove: true,
        firmCanApproveFlag: true,
      },
    });
    const denied = await decideJournalEntryProposal(
      { proposalId: PROP, decision: "APPROVED" },
      { principal: { type: "user", userId: PROPOSER } },
      policy({ proposerMayApprove: false }),
      h.deps,
    );
    expect(denied.ok).toBe(false);

    const allowed = await decideJournalEntryProposal(
      { proposalId: PROP, decision: "APPROVED" },
      { principal: { type: "user", userId: PROPOSER } },
      policy({ proposerMayApprove: true, mfaRequiredAboveCents: null }),
      h.deps,
    );
    expect(allowed.ok).toBe(true);
  });

  it("requires trusted MFA at/above threshold and for alwaysRequireMfa", async () => {
    const above = await decideJournalEntryProposal(
      { proposalId: PROP, decision: "APPROVED" },
      { principal: { type: "user", userId: REVIEWER } },
      policy({ mfaRequiredAboveCents: 10_000, alwaysRequireMfa: false }),
      makeHarness({
        proposal: proposal({ total_debits_cents: 50_000, total_credits_cents: 50_000 }),
        assurance: assurance({ satisfied: false, level: "none", source: "none" }),
      }).deps,
    );
    expect(above.ok).toBe(false);
    if (!above.ok) expect(above.code).toBe(JE_APPROVAL_ERROR.MFA_NOT_SATISFIED);

    const always = await decideJournalEntryProposal(
      { proposalId: PROP, decision: "APPROVED" },
      { principal: { type: "user", userId: REVIEWER } },
      policy({ alwaysRequireMfa: true, mfaRequiredAboveCents: null }),
      makeHarness({
        assurance: assurance({ satisfied: false, level: "none", source: "none" }),
      }).deps,
    );
    expect(always.ok).toBe(false);

    const trusted = await decideJournalEntryProposal(
      { proposalId: PROP, decision: "APPROVED" },
      { principal: { type: "user", userId: REVIEWER } },
      policy({ alwaysRequireMfa: true }),
      makeHarness({ assurance: assurance({ satisfied: true, level: "aal2" }) }).deps,
    );
    expect(trusted.ok).toBe(true);
  });

  it("below threshold without always-MFA does not require MFA", async () => {
    const h = makeHarness({
      proposal: proposal({ total_debits_cents: 1_000, total_credits_cents: 1_000 }),
      assurance: assurance({ satisfied: false, level: "none", source: "none" }),
    });
    const result = await decideJournalEntryProposal(
      { proposalId: PROP, decision: "APPROVED" },
      { principal: { type: "user", userId: REVIEWER } },
      policy({ mfaRequiredAboveCents: 100_000, alwaysRequireMfa: false }),
      h.deps,
    );
    expect(result.ok).toBe(true);
  });

  it("rejects superseded source CC when policy requires current", async () => {
    const h = makeHarness({ superseded: true });
    const result = await decideJournalEntryProposal(
      { proposalId: PROP, decision: "APPROVED" },
      { principal: { type: "user", userId: REVIEWER } },
      policy({ requireSourceCcNotSuperseded: true, mfaRequiredAboveCents: null }),
      h.deps,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(JE_APPROVAL_ERROR.SOURCE_CC_SUPERSEDED);
  });

  it("allows source CC when not superseded", async () => {
    const h = makeHarness({ superseded: false });
    const result = await decideJournalEntryProposal(
      { proposalId: PROP, decision: "APPROVED" },
      { principal: { type: "user", userId: REVIEWER } },
      policy({ requireSourceCcNotSuperseded: true, mfaRequiredAboveCents: null }),
      h.deps,
    );
    expect(result.ok).toBe(true);
  });

  it("does not silently substitute a newer CC run", async () => {
    const h = makeHarness();
    const result = await decideJournalEntryProposal(
      { proposalId: PROP, decision: "APPROVED" },
      { principal: { type: "user", userId: REVIEWER } },
      policy({ mfaRequiredAboveCents: null }),
      h.deps,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const call = h.persistCalls[0] as { eventPayload: Record<string, unknown> };
    expect(call.eventPayload.source_continuous_close_run_id).toBe(CC);
  });

  it("persists APPROVED and REJECTED without mutating proposal", async () => {
    const approved = await decideJournalEntryProposal(
      { proposalId: PROP, decision: "APPROVED" },
      { principal: { type: "user", userId: REVIEWER } },
      policy({ mfaRequiredAboveCents: null }),
      makeHarness().deps,
    );
    expect(approved.ok).toBe(true);

    const rejected = await decideJournalEntryProposal(
      { proposalId: PROP, decision: "REJECTED" },
      { principal: { type: "user", userId: REVIEWER } },
      policy({ mfaRequiredAboveCents: null }),
      makeHarness().deps,
    );
    expect(rejected.ok).toBe(true);
    if (!rejected.ok) return;
    expect(rejected.approval.decision).toBe("REJECTED");
  });

  it("fail-closed after prior REJECTED when reconsideration disabled", async () => {
    const h = makeHarness({ priorRejected: true });
    const result = await decideJournalEntryProposal(
      { proposalId: PROP, decision: "APPROVED" },
      { principal: { type: "user", userId: REVIEWER } },
      policy({
        allowReconsiderationAfterRejection: false,
        mfaRequiredAboveCents: null,
      }),
      h.deps,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(JE_APPROVAL_ERROR.PRIOR_REJECTION);
  });

  it("idempotent exact repeat returns existing without second event", async () => {
    const h = makeHarness();
    const first = await decideJournalEntryProposal(
      { proposalId: PROP, decision: "APPROVED" },
      { principal: { type: "user", userId: REVIEWER } },
      policy({ mfaRequiredAboveCents: null }),
      h.deps,
    );
    const second = await decideJournalEntryProposal(
      { proposalId: PROP, decision: "APPROVED" },
      { principal: { type: "user", userId: REVIEWER } },
      policy({ mfaRequiredAboveCents: null }),
      h.deps,
    );
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.reused).toBe(true);
    expect(second.ledgerEventId).toBeNull();
    expect(first.approval.idempotency_key).toBe(second.approval.idempotency_key);
  });

  it("policy change yields new idempotency key", async () => {
    const polA = policy({ mfaRequiredAboveCents: null });
    const polB = policy({ mfaRequiredAboveCents: 1 });
    expect(hashJeApprovalPolicy(polA)).not.toBe(hashJeApprovalPolicy(polB));
    const k1 = hashJeApprovalIdempotencyKey({
      proposalId: PROP,
      proposalHash: HASH_P,
      approvalPolicyHash: hashJeApprovalPolicy(polA),
      reviewerUserId: REVIEWER,
      decision: "APPROVED",
    });
    const k2 = hashJeApprovalIdempotencyKey({
      proposalId: PROP,
      proposalHash: HASH_P,
      approvalPolicyHash: hashJeApprovalPolicy(polB),
      reviewerUserId: REVIEWER,
      decision: "APPROVED",
    });
    expect(k1).not.toBe(k2);
  });

  it("publishes journal_entry.approved / rejected with custody fields", async () => {
    const h = makeHarness();
    await decideJournalEntryProposal(
      { proposalId: PROP, decision: "APPROVED" },
      { principal: { type: "user", userId: REVIEWER } },
      policy({ mfaRequiredAboveCents: null }),
      h.deps,
    );
    const call = h.persistCalls[0] as {
      eventType: string;
      eventPayload: Record<string, unknown>;
      closePeriodId: string | null;
    };
    expect(call.eventType).toBe("journal_entry.approved");
    expect(call.eventPayload.proposal_hash).toBe(HASH_P);
    expect(call.eventPayload.approval_policy_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(call.eventPayload.reviewer_user_id).toBe(REVIEWER);
    expect(call.eventPayload.sod_satisfied).toBe(true);
    expect(call.eventPayload.period_end).toBe("2026-07-31");
    expect(call.closePeriodId).toBeNull();
    expect(call.eventPayload.close_period_id).toBeNull();
    expect(call.closePeriodId).not.toBe("2026-07-31");
    expect(JSON.stringify(call.eventPayload)).not.toMatch(/token|secret|password/i);

    const h2 = makeHarness();
    await decideJournalEntryProposal(
      { proposalId: PROP, decision: "REJECTED" },
      { principal: { type: "user", userId: REVIEWER } },
      policy({ mfaRequiredAboveCents: null }),
      h2.deps,
    );
    expect((h2.persistCalls[0] as { eventType: string }).eventType).toBe(
      "journal_entry.rejected",
    );
    expect((h2.persistCalls[0] as { closePeriodId: string | null }).closePeriodId).toBeNull();
  });

  it("passes exact close_periods.id when resolved; never period_end", async () => {
    const CLOSE = "cp-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const h = makeHarness({ closePeriodId: CLOSE });
    const result = await decideJournalEntryProposal(
      { proposalId: PROP, decision: "APPROVED" },
      { principal: { type: "user", userId: REVIEWER } },
      policy({ mfaRequiredAboveCents: null }),
      h.deps,
    );
    expect(result.ok).toBe(true);
    const call = h.persistCalls[0] as {
      closePeriodId: string | null;
      eventPayload: Record<string, unknown>;
    };
    expect(call.closePeriodId).toBe(CLOSE);
    expect(call.closePeriodId).not.toBe("2026-07-31");
    expect(call.eventPayload.close_period_id).toBe(CLOSE);
    expect(call.eventPayload.period_end).toBe("2026-07-31");
    expect(h.closePeriodLookups[0]).toMatchObject({
      firmClientId: "fc-1",
      periodEnd: "2026-07-31",
      sourceAccountingSyncId: SYNC,
    });
  });

  it("succeeds with closePeriodId null when no exact close period", async () => {
    const h = makeHarness({ closePeriodId: null });
    const result = await decideJournalEntryProposal(
      { proposalId: PROP, decision: "APPROVED" },
      { principal: { type: "user", userId: REVIEWER } },
      policy({ mfaRequiredAboveCents: null }),
      h.deps,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      (h.persistCalls[0] as { closePeriodId: string | null }).closePeriodId,
    ).toBeNull();
  });

  it("rejects if closePeriodId falsely equals period_end", async () => {
    const h = makeHarness({ closePeriodId: "2026-07-31" });
    const result = await decideJournalEntryProposal(
      { proposalId: PROP, decision: "APPROVED" },
      { principal: { type: "user", userId: REVIEWER } },
      policy({ mfaRequiredAboveCents: null }),
      h.deps,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(JE_APPROVAL_ERROR.PERSIST_FAILED);
  });

  it("ledger failure rolls back (persist error surfaces)", async () => {
    const h = makeHarness({
      persistImpl: async () => {
        const { JeApprovalPersistError } = await import("../approval-repository");
        throw new JeApprovalPersistError(
          JE_APPROVAL_ERROR.LEDGER_PUBLISH_FAILED,
          "ledger failed",
        );
      },
    });
    const result = await decideJournalEntryProposal(
      { proposalId: PROP, decision: "APPROVED" },
      { principal: { type: "user", userId: REVIEWER } },
      policy({ mfaRequiredAboveCents: null }),
      h.deps,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(JE_APPROVAL_ERROR.LEDGER_PUBLISH_FAILED);
  });

  it("denies engagement access when approver cannot resolve", async () => {
    const h = makeHarness({ approver: null });
    const result = await decideJournalEntryProposal(
      { proposalId: PROP, decision: "APPROVED" },
      { principal: { type: "user", userId: REVIEWER } },
      policy({ mfaRequiredAboveCents: null }),
      h.deps,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(JE_APPROVAL_ERROR.ENGAGEMENT_ACCESS_DENIED);
    }
  });

  it("evaluateApprovalValidity exposes JE-3 contract", () => {
    const row: JournalEntryApprovalRow = {
      id: "ap1",
      proposal_id: PROP,
      company_id: CO,
      engagement_id: ENG,
      proposal_hash: HASH_P,
      policy_hash: hashJeApprovalPolicy(policy()),
      decision: "APPROVED",
      approval_mode: "REVIEW_REQUIRED",
      reviewer_user_id: REVIEWER,
      reviewer_role: "firm_admin",
      mfa_level: "aal2",
      mfa_verified_at: "2026-08-21T04:00:00.000Z",
      decision_reason: null,
      policy_snapshot: {},
      approved_at: "2026-08-21T04:30:00.000Z",
      idempotency_key: "d".repeat(64),
    };
    const v = evaluateApprovalValidity({
      approval: row,
      proposalHash: HASH_P,
      approvalPolicyHash: row.policy_hash,
      sodSatisfied: true,
      mfaSatisfied: true,
      policy: policy({ maxApprovalAgeHours: 24 }),
    });
    expect(v.valid).toBe(true);
    expect(v.decisionId).toBe("ap1");
    expect(v.expiresAt).toBeTruthy();
  });

  it("does not import provider poster or GOVERNED_AUTO / worker", () => {
    const files = [
      "approval-service.ts",
      "approval-repository.ts",
      "approval-custody.ts",
      "approval-authority.ts",
      "approval-types.ts",
    ];
    for (const file of files) {
      const src = readFileSync(
        join(process.cwd(), "lib/journal-entry-governance", file),
        "utf8",
      );
      expect(src, file).not.toContain("qboJournalEntryPoster");
      expect(src, file).not.toMatch(/GOVERNED_AUTO\s*=/);
      expect(src, file).not.toContain("je_post_attempt");
      expect(src, file).not.toContain("journal_entry_executions");
      expect(src, file).not.toMatch(/from ["']@\/lib\/pulse/);
      expect(src, file).not.toMatch(/from ["']@\/lib\/recurring/);
    }
  });
});
