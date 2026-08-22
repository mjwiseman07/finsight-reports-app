import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  prepareGovernedJournalEntryExecution,
  type PrepareJeExecutionDeps,
} from "../execution-service";
import {
  DEFAULT_JE_EXECUTION_POLICY,
  JE_EXECUTION_ERROR,
  JE_GOVERNED_EXECUTION_FEATURE_BOUNDARY,
  type JeExecutionPolicy,
  type JournalEntryExecutionRow,
} from "../execution-types";
import type { JournalEntryApprovalRow } from "../approval-types";
import type { JournalEntryProposalRow } from "../types";
import { JeExecutionCustodyError } from "../execution-custody";
import { JeApprovalCustodyError } from "../approval-custody";
import { JE_APPROVAL_ERROR } from "../approval-types";

const HASH = (ch: string) => ch.repeat(64);
const PROPOSER = "user-proposer";
const APPROVER = "user-approver";
const EXECUTOR = "user-executor";
const CONN_ID = "conn-canonical-1";

function baseProposal(
  over: Partial<JournalEntryProposalRow> = {},
): JournalEntryProposalRow {
  return {
    id: "prop-1",
    company_id: "co-1",
    engagement_id: "eng-1",
    firm_client_id: "fc-1",
    period_end: "2026-03-31",
    source_continuous_close_run_id: "cc-1",
    source_accounting_sync_id: "sync-1",
    source_recon_run_ids: ["recon-1"],
    origin_type: "ACCRUAL",
    reason_code: "ACCRUAL_EXPENSE",
    memo: "memo",
    currency: "USD",
    txn_date: "2026-03-31",
    lines: [
      { sequence: 1, accountId: "60", debitCents: 5000, creditCents: 0 },
      { sequence: 2, accountId: "70", debitCents: 0, creditCents: 5000 },
    ],
    total_debits_cents: 5000,
    total_credits_cents: 5000,
    expected_effects: [{ type: "CC_EXCEPTION_CLEAR", exceptionCode: "X" }],
    policy_snapshot: {},
    policy_hash: HASH("1"),
    proposal_hash: HASH("2"),
    status: "SUBMITTED",
    proposed_by: PROPOSER,
    proposed_at: "2026-03-30T12:00:00.000Z",
    idempotency_key: HASH("3"),
    ...over,
  };
}

function baseApproval(
  over: Partial<JournalEntryApprovalRow> = {},
): JournalEntryApprovalRow {
  return {
    id: "appr-1",
    proposal_id: "prop-1",
    company_id: "co-1",
    engagement_id: "eng-1",
    proposal_hash: HASH("2"),
    policy_hash: HASH("4"),
    decision: "APPROVED",
    approval_mode: "REVIEW_REQUIRED",
    reviewer_user_id: APPROVER,
    reviewer_role: "controller",
    mfa_level: "aal2",
    mfa_verified_at: "2026-03-30T13:00:00.000Z",
    decision_reason: null,
    policy_snapshot: {
      requireSegregationOfDuties: true,
      proposerMayApprove: false,
      maxApprovalAgeHours: null,
      requireSourceCcNotSuperseded: true,
      allowedOriginTypes: ["ACCRUAL", "RECLASS"],
      allowedCompanyApproverRoles: ["controller"],
      allowedFirmApproverRoles: ["controller"],
    },
    approved_at: "2026-03-30T13:00:00.000Z",
    idempotency_key: HASH("5"),
    ...over,
  };
}

function connection(over: Record<string, unknown> = {}) {
  return {
    id: CONN_ID,
    user_id: EXECUTOR,
    provider: "quickbooks",
    provider_family: "intuit",
    provider_product: "qbo",
    external_entity_id: "realm-1",
    external_entity_name: "Demo",
    tenant_or_realm_id: "realm-1",
    scopes: [],
    status: "connected",
    metadata_json: {},
    ...over,
  };
}

function accountsMap() {
  return new Map([
    [
      "60",
      {
        accountId: "60",
        accountType: "Expense",
        accountSubtype: null,
        active: true,
      },
    ],
    [
      "70",
      {
        accountId: "70",
        accountType: "Other Current Liability",
        accountSubtype: null,
        active: true,
      },
    ],
  ]);
}

function makeDeps(over: Partial<PrepareJeExecutionDeps> = {}): PrepareJeExecutionDeps {
  const proposal = baseProposal();
  const approval = baseApproval();
  let reserved: JournalEntryExecutionRow | null = null;
  let transitioned: JournalEntryExecutionRow | null = null;

  const deps: PrepareJeExecutionDeps = {
    loadProposal: async () => proposal,
    loadApproval: async () => approval,
    resolveActor: async ({ userId }) => ({
      userId,
      canRead: true,
      canWrite: true,
      scope: "firm",
    }),
    loadEngagement: async () => ({
      id: "eng-1",
      companyId: "co-1",
      firmId: "firm-1",
      firmClientId: "fc-1",
      arControlAccountId: "84",
      apControlAccountId: "33",
      inventoryControlAccountId: "81",
    }),
    loadSourceCc: async () => ({
      id: "cc-1",
      engagementId: "eng-1",
      companyId: "co-1",
      accountingSyncId: "sync-1",
      periodEnd: "2026-03-31",
      readiness: "READY",
      status: "completed",
      mode: "full",
    }),
    assertNotSuperseded: async () => undefined,
    assertSyncExists: async () => undefined,
    assertReconsExist: async () => undefined,
    resolveConnection: async () => connection() as never,
    assertEntitlement: async () => ({ ok: true as const, resolvedVia: "firm" as const }),
    assertQboWriteEnabled: async () => undefined,
    loadAccounts: async () => accountsMap(),
    assertPeriodNotLocked: async () => undefined,
    loadSubscriberIds: async () => ({ firmId: "firm-1", companyId: "co-1" }),
    loadFirmId: async () => "firm-1",
    resolveClosePeriodId: async () => null,
    resolveAssurance: async () => ({
      satisfied: true,
      level: "aal2",
      verifiedAt: "2026-03-30T13:00:00.000Z",
      method: "totp",
      source: "mfa_step_up_cookie",
    }),
    persistReservation: async (input) => {
      if (reserved && reserved.idempotency_key === input.row.idempotency_key) {
        // Exact logical reuse only when binding matches
        const same =
          reserved.approval_id === input.row.approval_id &&
          reserved.execution_policy_hash === input.row.execution_policy_hash &&
          reserved.execution_hash === input.row.execution_hash &&
          reserved.accounting_connection_id ===
            input.row.accounting_connection_id &&
          reserved.proposal_hash === input.row.proposal_hash &&
          reserved.approval_policy_hash === input.row.approval_policy_hash;
        if (!same) {
          throw Object.assign(
            new Error("je_execution_binding_conflict: idempotency mismatch"),
            { code: JE_EXECUTION_ERROR.BINDING_CONFLICT },
          );
        }
        return {
          reused: true,
          reuseReason: "idempotency_key" as const,
          row: reserved,
          ledgerEventId: null,
        };
      }
      if (reserved && reserved.approval_id === input.row.approval_id) {
        const same =
          reserved.idempotency_key === input.row.idempotency_key &&
          reserved.execution_policy_hash === input.row.execution_policy_hash &&
          reserved.execution_hash === input.row.execution_hash &&
          reserved.accounting_connection_id ===
            input.row.accounting_connection_id &&
          reserved.proposal_hash === input.row.proposal_hash &&
          reserved.approval_policy_hash === input.row.approval_policy_hash &&
          reserved.provider === input.row.provider &&
          reserved.company_id === input.row.company_id;
        if (!same) {
          throw Object.assign(
            new Error(
              "je_execution_binding_conflict: approval_id already reserved under a different immutable binding",
            ),
            { code: JE_EXECUTION_ERROR.BINDING_CONFLICT },
          );
        }
        return {
          reused: true,
          reuseReason: "approval_id" as const,
          row: reserved,
          ledgerEventId: null,
        };
      }
      reserved = { ...input.row };
      return {
        reused: false,
        reuseReason: null,
        row: reserved,
        ledgerEventId: "evt-requested",
      };
    },
    transition: async (input) => {
      const base = reserved || input;
      const row: JournalEntryExecutionRow = {
        ...(reserved as JournalEntryExecutionRow),
        status: input.newStatus,
        state_version: input.expectedStateVersion + 1,
        preflight_result: input.patch.preflight_result,
        provider_request_hash: input.patch.provider_request_hash || null,
        last_error_code: input.patch.last_error_code || null,
        last_error_message: input.patch.last_error_message || null,
        provider_journal_id: null,
      };
      transitioned = row;
      reserved = row;
      return { row, ledgerEventId: `evt-${input.eventType}` };
    },
    newId: () => "550e8400-e29b-41d4-a716-446655440000",
    nowIso: () => "2026-03-31T18:00:00.000Z",
    ...over,
  };

  // expose for assertions
  (deps as PrepareJeExecutionDeps & { _getReserved: () => JournalEntryExecutionRow | null })._getReserved =
    () => reserved;
  (deps as PrepareJeExecutionDeps & { _getTransitioned: () => JournalEntryExecutionRow | null })._getTransitioned =
    () => transitioned;
  return deps;
}

const ctx = { principal: { type: "user" as const, userId: EXECUTOR } };
const policy: JeExecutionPolicy = { ...DEFAULT_JE_EXECUTION_POLICY };

describe("JE-3A prepareGovernedJournalEntryExecution", () => {
  it("happy path → READY_TO_POST with events and null provider_journal_id", async () => {
    const deps = makeDeps();
    const result = await prepareGovernedJournalEntryExecution(
      { proposalId: "prop-1", approvalId: "appr-1" },
      ctx,
      policy,
      deps,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.execution.status).toBe("READY_TO_POST");
    expect(result.execution.provider_journal_id).toBeNull();
    expect(result.ledgerEventIds.requested).toBe("evt-requested");
    expect(result.ledgerEventIds.transition).toContain("execution_ready");
    expect(result.payloadPreview?.correlation_marker).toContain("ADVJE:");
    expect(result.reused).toBe(false);
  });

  // --- CUSTODY ---
  it("1. exact proposal required", async () => {
    const deps = makeDeps({
      loadProposal: async () => {
        throw new JeApprovalCustodyError(
          JE_APPROVAL_ERROR.PROPOSAL_NOT_FOUND,
          "missing",
        );
      },
    });
    const r = await prepareGovernedJournalEntryExecution(
      { proposalId: "missing", approvalId: "appr-1" },
      ctx,
      policy,
      deps,
    );
    expect(r.ok).toBe(false);
  });

  it("2-5. exact APPROVED; REJECTED / mismatch / hash denied", async () => {
    for (const [name, approval] of [
      ["rejected", baseApproval({ decision: "REJECTED" })],
      ["mismatch", baseApproval({ proposal_id: "other" })],
      ["hash", baseApproval({ proposal_hash: HASH("9") })],
    ] as const) {
      const deps = makeDeps({
        loadApproval: async () => {
          if (approval.decision !== "APPROVED") {
            throw new JeExecutionCustodyError(
              JE_EXECUTION_ERROR.APPROVAL_NOT_APPROVED,
              name,
            );
          }
          if (approval.proposal_id !== "prop-1") {
            throw new JeExecutionCustodyError(
              JE_EXECUTION_ERROR.APPROVAL_PROPOSAL_MISMATCH,
              name,
            );
          }
          if (approval.proposal_hash !== HASH("2")) {
            throw new JeExecutionCustodyError(
              JE_EXECUTION_ERROR.APPROVAL_HASH_MISMATCH,
              name,
            );
          }
          return approval;
        },
      });
      const r = await prepareGovernedJournalEntryExecution(
        { proposalId: "prop-1", approvalId: "appr-1" },
        ctx,
        policy,
        deps,
      );
      expect(r.ok).toBe(false);
    }
  });

  it("6-8. caller cannot override company/connection/realm", async () => {
    const deps = makeDeps();
    const r = await prepareGovernedJournalEntryExecution(
      {
        proposalId: "prop-1",
        approvalId: "appr-1",
        companyId: "evil",
      } as never,
      ctx,
      policy,
      deps,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe(JE_EXECUTION_ERROR.CALLER_OVERRIDE_FORBIDDEN);
  });

  // --- APPROVAL VALIDITY ---
  it("9. valid approval accepted", async () => {
    const deps = makeDeps();
    const r = await prepareGovernedJournalEntryExecution(
      { proposalId: "prop-1", approvalId: "appr-1" },
      ctx,
      policy,
      deps,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.eligibility.valid).toBe(true);
  });

  it("10. expired approval fails precheck", async () => {
    const deps = makeDeps({
      loadApproval: async () =>
        baseApproval({
          approved_at: "2020-01-01T00:00:00.000Z",
          policy_snapshot: {
            maxApprovalAgeHours: 1,
            requireSegregationOfDuties: true,
            allowedOriginTypes: ["ACCRUAL", "RECLASS"],
            allowedCompanyApproverRoles: ["controller"],
            allowedFirmApproverRoles: ["controller"],
          },
        }),
    });
    const r = await prepareGovernedJournalEntryExecution(
      { proposalId: "prop-1", approvalId: "appr-1" },
      ctx,
      policy,
      deps,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.execution.status).toBe("PRECHECK_FAILED");
    expect(
      r.preflight.checks.some(
        (c) => c.code === "approval_not_expired" && c.status === "FAIL",
      ),
    ).toBe(true);
  });

  it("11-13. superseded CC / missing sync / missing recon fail", async () => {
    const deps = makeDeps({
      assertNotSuperseded: async () => {
        throw new JeApprovalCustodyError(
          JE_APPROVAL_ERROR.SOURCE_CC_SUPERSEDED,
          "superseded",
        );
      },
      assertSyncExists: async () => {
        throw new JeApprovalCustodyError(
          JE_APPROVAL_ERROR.SOURCE_SYNC_MISSING,
          "sync",
        );
      },
      assertReconsExist: async () => {
        throw new JeApprovalCustodyError(
          JE_APPROVAL_ERROR.SOURCE_RECON_MISSING,
          "recon",
        );
      },
    });
    const r = await prepareGovernedJournalEntryExecution(
      { proposalId: "prop-1", approvalId: "appr-1" },
      ctx,
      policy,
      deps,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.execution.status).toBe("PRECHECK_FAILED");
    expect(r.preflight.checks.find((c) => c.code === "source_cc_current")?.status).toBe(
      "FAIL",
    );
    expect(r.preflight.checks.find((c) => c.code === "source_sync_exists")?.status).toBe(
      "FAIL",
    );
    expect(r.preflight.checks.find((c) => c.code === "source_recons_exist")?.status).toBe(
      "FAIL",
    );
  });

  it("14. proposal still SUBMITTED required", async () => {
    const deps = makeDeps({
      loadProposal: async () => {
        throw new JeApprovalCustodyError(
          JE_APPROVAL_ERROR.PROPOSAL_STATUS_INVALID,
          "not submitted",
        );
      },
    });
    const r = await prepareGovernedJournalEntryExecution(
      { proposalId: "prop-1", approvalId: "appr-1" },
      ctx,
      policy,
      deps,
    );
    expect(r.ok).toBe(false);
  });

  // --- EXECUTOR AUTH ---
  it("15-16. verified user required; system principal denied", async () => {
    const deps = makeDeps();
    const noUser = await prepareGovernedJournalEntryExecution(
      { proposalId: "prop-1", approvalId: "appr-1" },
      { principal: { type: "user", userId: "" } },
      policy,
      deps,
    );
    expect(noUser.ok).toBe(false);
    const system = await prepareGovernedJournalEntryExecution(
      { proposalId: "prop-1", approvalId: "appr-1" },
      { principal: { type: "system" as never, userId: EXECUTOR } },
      policy,
      deps,
    );
    expect(system.ok).toBe(false);
    if (!system.ok) {
      expect(system.code).toBe(JE_EXECUTION_ERROR.UNSUPPORTED_PRINCIPAL);
    }
  });

  it("17-18. engagement writer required; can_approve alone insufficient", async () => {
    const deps = makeDeps({
      resolveActor: async ({ userId }) => ({
        userId,
        canRead: true,
        canWrite: false,
        scope: "firm",
      }),
    });
    const r = await prepareGovernedJournalEntryExecution(
      { proposalId: "prop-1", approvalId: "appr-1" },
      ctx,
      policy,
      deps,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe(JE_EXECUTION_ERROR.WRITE_FORBIDDEN);
  });

  it("19-20. executor same as proposer/approver denied by default", async () => {
    const asProposer = await prepareGovernedJournalEntryExecution(
      { proposalId: "prop-1", approvalId: "appr-1" },
      { principal: { type: "user", userId: PROPOSER } },
      policy,
      makeDeps(),
    );
    expect(asProposer.ok).toBe(true);
    if (asProposer.ok) {
      expect(asProposer.execution.status).toBe("PRECHECK_FAILED");
      expect(
        asProposer.preflight.checks.find((c) => c.code === "executor_sod")?.status,
      ).toBe("FAIL");
    }

    const asApprover = await prepareGovernedJournalEntryExecution(
      { proposalId: "prop-1", approvalId: "appr-1" },
      { principal: { type: "user", userId: APPROVER } },
      policy,
      makeDeps(),
    );
    expect(asApprover.ok).toBe(true);
    if (asApprover.ok) {
      expect(asApprover.execution.status).toBe("PRECHECK_FAILED");
    }
  });

  it("21. policy can control SoD exception", async () => {
    const relaxed: JeExecutionPolicy = {
      ...policy,
      requireExecutorDifferentFromProposer: false,
      requireExecutorDifferentFromApprover: false,
    };
    const r = await prepareGovernedJournalEntryExecution(
      { proposalId: "prop-1", approvalId: "appr-1" },
      { principal: { type: "user", userId: PROPOSER } },
      relaxed,
      makeDeps(),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.execution.status).toBe("READY_TO_POST");
  });

  // --- ENTITLEMENT ---
  it("22-24. JE write entitlement required; ap_pay / proposal-only insufficient", async () => {
    const deps = makeDeps({
      assertEntitlement: async () => {
        throw new JeExecutionCustodyError(
          JE_EXECUTION_ERROR.ENTITLEMENT_DENIED,
          "review_assist_write_qbo required",
        );
      },
    });
    const r = await prepareGovernedJournalEntryExecution(
      { proposalId: "prop-1", approvalId: "appr-1" },
      ctx,
      policy,
      deps,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe(JE_EXECUTION_ERROR.ENTITLEMENT_DENIED);
  });

  it("25. RA Pro/write addon accepted through canonical authority", async () => {
    const deps = makeDeps({
      assertEntitlement: async () => ({
        ok: true as const,
        resolvedVia: "firm" as const,
      }),
    });
    const r = await prepareGovernedJournalEntryExecution(
      { proposalId: "prop-1", approvalId: "appr-1" },
      ctx,
      policy,
      deps,
    );
    expect(r.ok).toBe(true);
  });

  // --- CONNECTION ---
  it("26-30. canonical connection; wrong/unhealthy/non-qbo rejected", async () => {
    const bad = await prepareGovernedJournalEntryExecution(
      { proposalId: "prop-1", approvalId: "appr-1" },
      ctx,
      policy,
      makeDeps({
        resolveConnection: async () => {
          throw new JeExecutionCustodyError(
            JE_EXECUTION_ERROR.CONNECTION_UNHEALTHY,
            "disconnected",
          );
        },
      }),
    );
    expect(bad.ok).toBe(false);

    const provider = await prepareGovernedJournalEntryExecution(
      { proposalId: "prop-1", approvalId: "appr-1" },
      ctx,
      { ...policy, provider: "xero" as never },
      makeDeps(),
    );
    expect(provider.ok).toBe(false);
  });

  // --- PRECHECK ---
  it("31-38. precheck gates", async () => {
    const cases: Array<{
      name: string;
      over: Partial<PrepareJeExecutionDeps>;
      failCode: string;
    }> = [
      {
        name: "qbo_write",
        over: {
          assertQboWriteEnabled: async () => {
            throw new JeExecutionCustodyError(
              JE_EXECUTION_ERROR.QBO_WRITE_DISABLED,
              "off",
            );
          },
        },
        failCode: "qbo_write_enabled",
      },
      {
        name: "period",
        over: {
          assertPeriodNotLocked: async () => {
            throw new Error("locked");
          },
        },
        failCode: "period_open",
      },
      {
        name: "inactive",
        over: {
          loadAccounts: async () =>
            new Map([
              [
                "60",
                {
                  accountId: "60",
                  accountType: "Expense",
                  accountSubtype: null,
                  active: false,
                },
              ],
              [
                "70",
                {
                  accountId: "70",
                  accountType: "Other Current Liability",
                  accountSubtype: null,
                  active: true,
                },
              ],
            ]),
        },
        failCode: "accounts_active",
      },
      {
        name: "AR",
        over: {
          loadAccounts: async () =>
            new Map([
              [
                "84",
                {
                  accountId: "84",
                  accountType: "AccountsReceivable",
                  accountSubtype: null,
                  active: true,
                },
              ],
              [
                "70",
                {
                  accountId: "70",
                  accountType: "Other Current Liability",
                  accountSubtype: null,
                  active: true,
                },
              ],
            ]),
          loadProposal: async () =>
            baseProposal({
              lines: [
                { sequence: 1, accountId: "84", debitCents: 5000, creditCents: 0 },
                { sequence: 2, accountId: "70", debitCents: 0, creditCents: 5000 },
              ],
            }),
        },
        failCode: "control_accounts_clear",
      },
      {
        name: "origin",
        over: {
          loadProposal: async () =>
            baseProposal({ origin_type: "RECLASS" }),
        },
        failCode: "origin_allowed",
      },
      {
        name: "amount",
        over: {},
        failCode: "amount_within_policy",
      },
    ];

    for (const c of cases) {
      const p =
        c.name === "amount"
          ? { ...policy, maxExecutionAmountCents: 100, allowedOriginTypes: ["ACCRUAL"] as const }
          : c.name === "origin"
            ? { ...policy, allowedOriginTypes: ["ACCRUAL"] as const }
            : policy;
      // origin case: proposal is RECLASS but policy only ACCRUAL
      if (c.name === "origin") {
        // already set
      }
      const r = await prepareGovernedJournalEntryExecution(
        { proposalId: "prop-1", approvalId: "appr-1" },
        ctx,
        c.name === "origin"
          ? { ...policy, allowedOriginTypes: ["ACCRUAL"] }
          : p,
        makeDeps(c.over),
      );
      expect(r.ok).toBe(true);
      if (!r.ok) continue;
      expect(r.execution.status).toBe("PRECHECK_FAILED");
      expect(
        r.preflight.checks.some(
          (x) => x.code === c.failCode && x.status === "FAIL",
        ),
      ).toBe(true);
    }
  });

  // --- IDEMPOTENCY ---
  it("47-49. duplicate prepare returns existing; no second event", async () => {
    const deps = makeDeps();
    const first = await prepareGovernedJournalEntryExecution(
      { proposalId: "prop-1", approvalId: "appr-1" },
      ctx,
      policy,
      deps,
    );
    expect(first.ok).toBe(true);
    const second = await prepareGovernedJournalEntryExecution(
      { proposalId: "prop-1", approvalId: "appr-1" },
      ctx,
      policy,
      deps,
    );
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.reused).toBe(true);
    expect(second.execution.id).toBe(first.execution.id);
    expect(second.ledgerEventIds.requested).toBeNull();
  });

  describe("reuse semantic integrity (correlation marker + binding)", () => {
    const EXEC_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const EXEC_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

    function makeReuseDeps(over: Partial<PrepareJeExecutionDeps> = {}) {
      let call = 0;
      return makeDeps({
        newId: () => {
          call += 1;
          return call === 1 ? EXEC_A : EXEC_B;
        },
        ...over,
      });
    }

    it("1-6. exact duplicate returns EXEC-A marker/preview; not discarded EXEC-B", async () => {
      const deps = makeReuseDeps();
      const first = await prepareGovernedJournalEntryExecution(
        { proposalId: "prop-1", approvalId: "appr-1" },
        ctx,
        policy,
        deps,
      );
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      expect(first.execution.id).toBe(EXEC_A);
      expect(first.execution.correlation_marker).toBe(`ADVJE:${EXEC_A}`);
      expect(String(first.payloadPreview?.PrivateNote || "")).toContain(
        `ADVJE:${EXEC_A}`,
      );
      expect(String(first.payloadPreview?.PrivateNote || "")).not.toContain(
        `ADVJE:${EXEC_B}`,
      );

      const second = await prepareGovernedJournalEntryExecution(
        { proposalId: "prop-1", approvalId: "appr-1" },
        ctx,
        policy,
        deps,
      );
      expect(second.ok).toBe(true);
      if (!second.ok) return;
      expect(second.reused).toBe(true);
      expect(second.execution.id).toBe(EXEC_A);
      expect(second.execution.correlation_marker).toBe(`ADVJE:${EXEC_A}`);
      expect(String(second.payloadPreview?.PrivateNote || "")).toContain(
        `ADVJE:${EXEC_A}`,
      );
      expect(String(second.payloadPreview?.PrivateNote || "")).not.toContain(
        `ADVJE:${EXEC_B}`,
      );
      expect(String(second.payloadPreview?.correlation_marker || "")).toBe(
        `ADVJE:${EXEC_A}`,
      );
      expect(second.execution.provider_request_hash).toBeTruthy();
      // reconstructed preview hash must match persisted
      const { hashProviderRequestPreview } = await import("../execution-hash");
      const reconstructedHash = hashProviderRequestPreview(
        second.payloadPreview as Record<string, unknown>,
      );
      expect(reconstructedHash).toBe(second.execution.provider_request_hash);
    });

    it("7. same approval + changed execution policy → binding conflict", async () => {
      const deps = makeReuseDeps();
      const first = await prepareGovernedJournalEntryExecution(
        { proposalId: "prop-1", approvalId: "appr-1" },
        ctx,
        policy,
        deps,
      );
      expect(first.ok).toBe(true);

      const changed: JeExecutionPolicy = {
        ...policy,
        maxExecutionAmountCents: 999,
      };
      const second = await prepareGovernedJournalEntryExecution(
        { proposalId: "prop-1", approvalId: "appr-1" },
        ctx,
        changed,
        deps,
      );
      expect(second.ok).toBe(false);
      if (second.ok) return;
      expect(second.code).toBe(JE_EXECUTION_ERROR.BINDING_CONFLICT);
    });

    it("8-10. same approval + changed connection → binding conflict", async () => {
      const shared = makeReuseDeps();
      const a = await prepareGovernedJournalEntryExecution(
        { proposalId: "prop-1", approvalId: "appr-1" },
        ctx,
        policy,
        shared,
      );
      expect(a.ok).toBe(true);
      const b = await prepareGovernedJournalEntryExecution(
        { proposalId: "prop-1", approvalId: "appr-1" },
        ctx,
        policy,
        {
          ...shared,
          resolveConnection: async () =>
            connection({ id: "conn-canonical-OTHER" }) as never,
        },
      );
      expect(b.ok).toBe(false);
      if (!b.ok) expect(b.code).toBe(JE_EXECUTION_ERROR.BINDING_CONFLICT);
    });

    it("11. same approval cannot create second execution row", async () => {
      const deps = makeReuseDeps();
      const first = await prepareGovernedJournalEntryExecution(
        { proposalId: "prop-1", approvalId: "appr-1" },
        ctx,
        policy,
        deps,
      );
      const second = await prepareGovernedJournalEntryExecution(
        { proposalId: "prop-1", approvalId: "appr-1" },
        ctx,
        policy,
        deps,
      );
      expect(first.ok && second.ok).toBe(true);
      if (!first.ok || !second.ok) return;
      expect(second.execution.id).toBe(first.execution.id);
    });

    it("12. concurrent exact same logical → one row / reuse existing binding", async () => {
      const deps = makeReuseDeps();
      const [r1, r2] = await Promise.all([
        prepareGovernedJournalEntryExecution(
          { proposalId: "prop-1", approvalId: "appr-1" },
          ctx,
          policy,
          deps,
        ),
        prepareGovernedJournalEntryExecution(
          { proposalId: "prop-1", approvalId: "appr-1" },
          ctx,
          policy,
          deps,
        ),
      ]);
      expect(r1.ok && r2.ok).toBe(true);
      if (!r1.ok || !r2.ok) return;
      expect(r1.execution.id).toBe(r2.execution.id);
      expect(r1.execution.correlation_marker).toBe(r2.execution.correlation_marker);
      expect(String(r1.payloadPreview?.PrivateNote)).toContain(
        r1.execution.correlation_marker,
      );
      expect(String(r2.payloadPreview?.PrivateNote)).toContain(
        r2.execution.correlation_marker,
      );
    });

    it("13. concurrent different binding same approval → conflict not silent reuse", async () => {
      const sharedStore: { reserved: JournalEntryExecutionRow | null } = {
        reserved: null,
      };
      const persist: PrepareJeExecutionDeps["persistReservation"] = async (
        input,
      ) => {
        if (
          sharedStore.reserved &&
          sharedStore.reserved.approval_id === input.row.approval_id
        ) {
          const same =
            sharedStore.reserved.idempotency_key === input.row.idempotency_key &&
            sharedStore.reserved.execution_policy_hash ===
              input.row.execution_policy_hash &&
            sharedStore.reserved.accounting_connection_id ===
              input.row.accounting_connection_id;
          if (!same) {
            throw Object.assign(
              new Error(
                "je_execution_binding_conflict: race approval_id already reserved under a different immutable binding",
              ),
              { code: JE_EXECUTION_ERROR.BINDING_CONFLICT },
            );
          }
          return {
            reused: true,
            reuseReason: "approval_id" as const,
            row: sharedStore.reserved,
            ledgerEventId: null,
          };
        }
        sharedStore.reserved = { ...input.row };
        return {
          reused: false,
          reuseReason: null,
          row: sharedStore.reserved,
          ledgerEventId: "evt-requested",
        };
      };

      const depsA = makeReuseDeps({ persistReservation: persist });
      const depsB = makeReuseDeps({
        persistReservation: persist,
        resolveConnection: async () =>
          connection({ id: "conn-race-other" }) as never,
      });

      const first = await prepareGovernedJournalEntryExecution(
        { proposalId: "prop-1", approvalId: "appr-1" },
        ctx,
        policy,
        depsA,
      );
      expect(first.ok).toBe(true);
      const second = await prepareGovernedJournalEntryExecution(
        { proposalId: "prop-1", approvalId: "appr-1" },
        ctx,
        policy,
        depsB,
      );
      expect(second.ok).toBe(false);
      if (!second.ok) {
        expect(second.code).toBe(JE_EXECUTION_ERROR.BINDING_CONFLICT);
      }
    });

    it("14. provider_request_hash mismatch with reconstructed preview → fail closed", async () => {
      const deps = makeReuseDeps({
        persistReservation: async (input) => {
          // Simulate corrupt persisted hash on reuse
          const row = {
            ...input.row,
            id: EXEC_A,
            correlation_marker: `ADVJE:${EXEC_A}`,
            provider_request_hash: "f".repeat(64),
          };
          return {
            reused: true,
            reuseReason: "idempotency_key" as const,
            row,
            ledgerEventId: null,
          };
        },
      });
      // First call also hits the corrupt reuse path — use two-phase store
      let reserved: JournalEntryExecutionRow | null = null;
      const deps2 = makeReuseDeps({
        persistReservation: async (input) => {
          if (!reserved) {
            reserved = { ...input.row };
            return {
              reused: false,
              reuseReason: null,
              row: reserved,
              ledgerEventId: "evt-requested",
            };
          }
          return {
            reused: true,
            reuseReason: "idempotency_key" as const,
            row: {
              ...reserved,
              provider_request_hash: "f".repeat(64),
            },
            ledgerEventId: null,
          };
        },
      });
      const first = await prepareGovernedJournalEntryExecution(
        { proposalId: "prop-1", approvalId: "appr-1" },
        ctx,
        policy,
        deps2,
      );
      expect(first.ok).toBe(true);
      const second = await prepareGovernedJournalEntryExecution(
        { proposalId: "prop-1", approvalId: "appr-1" },
        ctx,
        policy,
        deps2,
      );
      expect(second.ok).toBe(false);
      if (!second.ok) {
        expect(second.code).toBe(JE_EXECUTION_ERROR.BINDING_CONFLICT);
      }
      void deps;
    });
  });

  // --- PATENT #6 payload shape ---
  it("65-72. event payloads contain hashes/marker and no tokens", async () => {
    const payloads: Record<string, unknown>[] = [];
    const deps = makeDeps({
      persistReservation: async (input) => {
        payloads.push(input.eventPayload);
        return {
          reused: false,
          reuseReason: null,
          row: input.row,
          ledgerEventId: "evt-requested",
        };
      },
      transition: async (input) => ({
        row: {
          ...input,
          id: "550e8400-e29b-41d4-a716-446655440000",
          proposal_id: "prop-1",
          approval_id: "appr-1",
          company_id: "co-1",
          engagement_id: "eng-1",
          firm_client_id: "fc-1",
          source_continuous_close_run_id: "cc-1",
          source_accounting_sync_id: "sync-1",
          accounting_connection_id: CONN_ID,
          provider: "quickbooks",
          proposal_hash: HASH("2"),
          approval_policy_hash: HASH("4"),
          execution_policy_hash: HASH("e"),
          execution_hash: HASH("x"),
          idempotency_key: HASH("k"),
          status: input.newStatus,
          correlation_marker: "ADVJE:550e8400-e29b-41d4-a716-446655440000",
          execution_policy_snapshot: {},
          preflight_result: input.patch.preflight_result,
          requested_by: EXECUTOR,
          requested_at: "2026-03-31T18:00:00.000Z",
          state_version: 2,
          provider_journal_id: null,
          provider_request_hash: null,
          provider_response_hash: null,
          last_error_code: null,
          last_error_message: null,
        } as JournalEntryExecutionRow,
        ledgerEventId: "evt-ready",
      }),
    });
    // Fix transition to use reserved row properly — override again after makeDeps
    let reservedRow: JournalEntryExecutionRow | null = null;
    deps.persistReservation = async (input) => {
      payloads.push(input.eventPayload);
      reservedRow = input.row;
      return {
        reused: false,
        reuseReason: null,
        row: input.row,
        ledgerEventId: "evt-requested",
      };
    };
    deps.transition = async (input) => {
      payloads.push(input.eventPayload);
      const row: JournalEntryExecutionRow = {
        ...(reservedRow as JournalEntryExecutionRow),
        status: input.newStatus,
        state_version: 2,
        preflight_result: input.patch.preflight_result,
      };
      return { row, ledgerEventId: "evt-ready" };
    };

    const r = await prepareGovernedJournalEntryExecution(
      { proposalId: "prop-1", approvalId: "appr-1" },
      ctx,
      policy,
      deps,
    );
    expect(r.ok).toBe(true);
    expect(payloads.length).toBe(2);
    for (const p of payloads) {
      expect(p.correlation_marker).toMatch(/^ADVJE:/);
      expect(p.proposal_hash).toMatch(/^[a-f0-9]{64}$/);
      expect(p.execution_hash).toMatch(/^[a-f0-9]{64}$/);
      expect(JSON.stringify(p)).not.toMatch(/access_token|refresh_token|Bearer/i);
    }
  });

  it("64. state_version optimistic concurrency enforced in transition contract", async () => {
    const deps = makeDeps({
      transition: async (input) => {
        if (input.expectedStateVersion !== 1) {
          throw Object.assign(new Error("state_version concurrency conflict"), {
            code: JE_EXECUTION_ERROR.CONCURRENCY_CONFLICT,
          });
        }
        return {
          row: {
            id: input.executionId,
            proposal_id: "prop-1",
            approval_id: "appr-1",
            company_id: "co-1",
            engagement_id: "eng-1",
            firm_client_id: "fc-1",
            source_continuous_close_run_id: "cc-1",
            source_accounting_sync_id: "sync-1",
            accounting_connection_id: CONN_ID,
            provider: "quickbooks" as const,
            proposal_hash: HASH("2"),
            approval_policy_hash: HASH("4"),
            execution_policy_hash: HASH("e"),
            execution_hash: HASH("x"),
            idempotency_key: HASH("k"),
            status: input.newStatus,
            correlation_marker: "ADVJE:x",
            execution_policy_snapshot: {},
            preflight_result: input.patch.preflight_result,
            requested_by: EXECUTOR,
            requested_at: "2026-03-31T18:00:00.000Z",
            state_version: input.expectedStateVersion + 1,
            provider_journal_id: null,
            provider_request_hash: null,
            provider_response_hash: null,
            last_error_code: null,
            last_error_message: null,
          },
          ledgerEventId: "evt",
        };
      },
    });
    const r = await prepareGovernedJournalEntryExecution(
      { proposalId: "prop-1", approvalId: "appr-1" },
      ctx,
      policy,
      deps,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.execution.state_version).toBe(2);
  });
});

describe("JE-3A no provider write / no Memory / no auto-governed principal", () => {
  const root = join(process.cwd(), "lib/journal-entry-governance");
  const files = [
    "execution-service.ts",
    "execution-custody.ts",
    "execution-repository.ts",
    "execution-payload.ts",
    "execution-eligibility.ts",
    "index.ts",
  ];

  it("76-82. no poster import, no JournalEntry POST, no Memory, no auto principal, no worker", () => {
    for (const f of files) {
      const src = readFileSync(join(root, f), "utf8");
      expect(src).not.toContain("journal-entry-poster");
      expect(src).not.toContain("qboJournalEntryPoster");
      expect(src).not.toMatch(/fetch\s*\(\s*['"`].*journalentry/i);
      expect(src).not.toContain("je_post_attempts");
      expect(src).not.toMatch(/posted_je|writeMemory|memory\.write/i);
      expect(src).not.toMatch(/GOVERNED_AUTO\s*=/);
      expect(src).not.toMatch(/cron|worker\.schedule/i);
      expect(src).not.toContain("/v3/company/");
    }
    expect(JE_GOVERNED_EXECUTION_FEATURE_BOUNDARY.providerWriteAllowed).toBe(false);
    expect(JE_GOVERNED_EXECUTION_FEATURE_BOUNDARY.governedAutoAllowed).toBe(false);
    expect(JE_GOVERNED_EXECUTION_FEATURE_BOUNDARY.forbiddenLegacyLanes).toContain(
      "pulse_confirm",
    );
  });

  it("policy required — no silent production default in service", async () => {
    const r = await prepareGovernedJournalEntryExecution(
      { proposalId: "prop-1", approvalId: "appr-1" },
      ctx,
      null as never,
      makeDeps(),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe(JE_EXECUTION_ERROR.POLICY_REQUIRED);
  });
});

// silence unused vi in some runners
void vi;
