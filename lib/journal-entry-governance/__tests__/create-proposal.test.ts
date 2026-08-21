import { describe, expect, it } from "vitest";
import { createContinuousCloseJournalEntryProposal } from "../service";
import {
  DEFAULT_JE_PROPOSAL_POLICY,
  JE_PROPOSAL_ERROR,
  type CreateJeProposalInput,
  type JeProposalAccountMeta,
  type JeProposalExecutionContext,
  type JeProposalPolicy,
  type JournalEntryProposalRow,
} from "../types";
import type { CreateJeProposalDeps } from "../service";

const ENG = "eng-1";
const CO = "co-1";
const FC = "fc-1";
const USER = "user-1";
const CC = "cc-run-1";
const SYNC = "sync-1";
const RUN_AR = "run-ar";
const RUN_AP = "run-ap";
const RUN_INV = "run-inv";

function principal(userId = USER): JeProposalExecutionContext {
  return { principal: { type: "user", userId } };
}

function policy(overrides: Partial<JeProposalPolicy> = {}): JeProposalPolicy {
  return { ...DEFAULT_JE_PROPOSAL_POLICY, ...overrides };
}

function baseInput(overrides: Partial<CreateJeProposalInput> = {}): CreateJeProposalInput {
  return {
    engagementId: ENG,
    sourceContinuousCloseRunId: CC,
    originType: "ACCRUAL",
    reasonCode: "cutoff_accrual",
    memo: "July accrual",
    currency: "USD",
    txnDate: "2026-07-31",
    lines: [
      {
        sequence: 1,
        accountId: "exp-1",
        debitCents: 2500,
        creditCents: 0,
        description: "expense",
      },
      {
        sequence: 2,
        accountId: "liab-1",
        debitCents: 0,
        creditCents: 2500,
        description: "accrued",
      },
    ],
    expectedEffects: [
      {
        type: "ACCOUNT_RECLASS",
        fromAccountId: "exp-1",
        toAccountId: "liab-1",
        amountCents: 2500,
      },
    ],
    sourceReconRunIds: [RUN_AR],
    ...overrides,
  };
}

function account(
  id: string,
  type: string,
  subtype: string | null = null,
): JeProposalAccountMeta {
  return { accountId: id, accountType: type, accountSubtype: subtype, active: true };
}

function makeHarness(opts?: {
  actor?: { userId: string; canWrite: boolean; canRead?: boolean; scope?: string } | null;
  cc?: Partial<{
    id: string;
    companyId: string;
    engagementId: string;
    firmClientId: string | null;
    accountingSyncId: string;
    periodEnd: string;
    mode: string;
    status: string;
  }> | null;
  sync?: Partial<{
    id: string;
    companyId: string;
    periodStart: string | null;
    periodEnd: string;
    validationStatus: string;
    sourceSystem: string;
  }> | null;
  reconById?: Record<
    string,
    {
      id: string;
      engagementId: string;
      periodEnd: string | null;
      tieOutKind: string;
      status: string;
      reconOutcome: string | null;
      baselineSyncId: string | null;
      measurementSource: string | null;
    }
  >;
  accounts?: Map<string, JeProposalAccountMeta>;
  periodLocked?: boolean;
  persistImpl?: CreateJeProposalDeps["persist"];
}) {
  const rows: JournalEntryProposalRow[] = [];
  const persistCalls: unknown[] = [];
  const defaultAccounts = new Map<string, JeProposalAccountMeta>([
    ["exp-1", account("exp-1", "Expense")],
    ["liab-1", account("liab-1", "Other Current Liability")],
    ["exp-2", account("exp-2", "Expense")],
    ["ar-type", account("ar-type", "AccountsReceivable")],
    ["ap-type", account("ap-type", "AccountsPayable")],
    ["inv-type", account("inv-type", "Other Current Asset", "Inventory")],
    ["84", account("84", "Other Current Asset")],
    ["33", account("33", "Other Current Liability")],
    ["81", account("81", "Other Current Asset")],
  ]);

  const deps: CreateJeProposalDeps = {
    async resolveActor({ userId }) {
      if (opts && "actor" in opts && opts.actor === null) return null;
      const actor = opts?.actor ?? {
        userId,
        canWrite: true,
        canRead: true,
        scope: "company",
      };
      return actor as never;
    },
    async loadEngagement() {
      return {
        id: ENG,
        companyId: CO,
        firmId: "firm-1",
        firmClientId: FC,
        arControlAccountId: "84",
        apControlAccountId: "33",
        inventoryControlAccountId: "81",
      };
    },
    async loadCcRun() {
      if (opts && "cc" in opts && opts.cc === null) {
        const { JeProposalCustodyError } = await import("../source-custody");
        throw new JeProposalCustodyError(
          JE_PROPOSAL_ERROR.CC_RUN_NOT_FOUND,
          "missing",
        );
      }
      return {
        id: CC,
        companyId: CO,
        engagementId: ENG,
        firmClientId: FC,
        accountingSyncId: SYNC,
        periodEnd: "2026-07-31",
        mode: "OBSERVE",
        status: "completed",
        ...(opts?.cc || {}),
      };
    },
    async loadSync(args) {
      if (opts && "sync" in opts && opts.sync === null) {
        const { JeProposalCustodyError } = await import("../source-custody");
        throw new JeProposalCustodyError(JE_PROPOSAL_ERROR.SYNC_NOT_FOUND, "missing");
      }
      if (args.accountingSyncId !== SYNC && !opts?.sync) {
        const { JeProposalCustodyError } = await import("../source-custody");
        throw new JeProposalCustodyError(JE_PROPOSAL_ERROR.SYNC_NOT_FOUND, "override blocked");
      }
      return {
        id: SYNC,
        companyId: CO,
        periodStart: "2026-07-01",
        periodEnd: "2026-07-31",
        validationStatus: "SUCCESS",
        sourceSystem: "quickbooks",
        ...(opts?.sync || {}),
      };
    },
    async loadRecon(args) {
      const catalog = opts?.reconById ?? {
        [RUN_AR]: {
          id: RUN_AR,
          engagementId: ENG,
          periodEnd: "2026-07-31",
          tieOutKind: "ar_aging",
          status: "completed",
          reconOutcome: "open_review",
          baselineSyncId: SYNC,
          measurementSource: "persisted_sync_snapshot",
        },
        [RUN_AP]: {
          id: RUN_AP,
          engagementId: ENG,
          periodEnd: "2026-07-31",
          tieOutKind: "ap_aging",
          status: "completed",
          reconOutcome: "open_review",
          baselineSyncId: SYNC,
          measurementSource: "persisted_sync_snapshot",
        },
        [RUN_INV]: {
          id: RUN_INV,
          engagementId: ENG,
          periodEnd: "2026-07-31",
          tieOutKind: "inventory",
          status: "completed",
          reconOutcome: "open_review",
          baselineSyncId: SYNC,
          measurementSource: "persisted_sync_snapshot",
        },
      };
      const row = catalog[args.runId];
      if (!row) {
        const { JeProposalCustodyError } = await import("../source-custody");
        throw new JeProposalCustodyError(JE_PROPOSAL_ERROR.RECON_NOT_FOUND, "missing");
      }
      if (!row.baselineSyncId) {
        const { JeProposalCustodyError } = await import("../source-custody");
        throw new JeProposalCustodyError(
          JE_PROPOSAL_ERROR.RECON_BASELINE_NULL,
          "null baseline",
        );
      }
      if (row.baselineSyncId !== args.expectedBaselineSyncId) {
        const { JeProposalCustodyError } = await import("../source-custody");
        throw new JeProposalCustodyError(
          JE_PROPOSAL_ERROR.RECON_BASELINE_MISMATCH,
          "baseline mismatch",
        );
      }
      if (row.engagementId !== args.expectedEngagementId) {
        const { JeProposalCustodyError } = await import("../source-custody");
        throw new JeProposalCustodyError(
          JE_PROPOSAL_ERROR.RECON_ENGAGEMENT_MISMATCH,
          "eng mismatch",
        );
      }
      if (row.periodEnd !== args.expectedPeriodEnd) {
        const { JeProposalCustodyError } = await import("../source-custody");
        throw new JeProposalCustodyError(
          JE_PROPOSAL_ERROR.RECON_PERIOD_MISMATCH,
          "period mismatch",
        );
      }
      if (row.status !== "completed") {
        const { JeProposalCustodyError } = await import("../source-custody");
        throw new JeProposalCustodyError(
          JE_PROPOSAL_ERROR.RECON_NOT_COMPLETED,
          "not completed",
        );
      }
      if (!row.reconOutcome) {
        const { JeProposalCustodyError } = await import("../source-custody");
        throw new JeProposalCustodyError(
          JE_PROPOSAL_ERROR.RECON_OUTCOME_MISSING,
          "no outcome",
        );
      }
      if (row.measurementSource !== "persisted_sync_snapshot") {
        const { JeProposalCustodyError } = await import("../source-custody");
        throw new JeProposalCustodyError(
          JE_PROPOSAL_ERROR.RECON_NOT_AUTHORITATIVE,
          "not authoritative",
        );
      }
      return row;
    },
    async loadAccounts({ accountIds }) {
      const map = opts?.accounts ?? defaultAccounts;
      const out = new Map<string, JeProposalAccountMeta>();
      for (const id of accountIds) {
        const meta = map.get(id);
        if (!meta) {
          const { JeProposalCustodyError } = await import("../source-custody");
          throw new JeProposalCustodyError(
            JE_PROPOSAL_ERROR.ACCOUNT_NOT_FOUND,
            `missing ${id}`,
          );
        }
        out.set(id, meta);
      }
      return out;
    },
    async assertPeriodNotLocked() {
      if (opts?.periodLocked) {
        const { JeProposalCustodyError } = await import("../source-custody");
        throw new JeProposalCustodyError(JE_PROPOSAL_ERROR.PERIOD_LOCKED, "locked");
      }
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
    newId: () => "proposal-1",
    nowIso: () => "2026-08-20T12:00:00.000Z",
  };

  return { deps, rows, persistCalls };
}

describe("createContinuousCloseJournalEntryProposal", () => {
  it("creates an immutable SUBMITTED proposal from exact CC custody", async () => {
    const h = makeHarness();
    const result = await createContinuousCloseJournalEntryProposal(
      baseInput(),
      principal(),
      policy(),
      h.deps,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proposal.status).toBe("SUBMITTED");
    expect(result.proposal.source_continuous_close_run_id).toBe(CC);
    expect(result.proposal.source_accounting_sync_id).toBe(SYNC);
    expect(result.proposal.proposed_by).toBe(USER);
    expect(result.proposal.company_id).toBe(CO);
    expect(result.reused).toBe(false);
    expect(result.ledgerEventId).toBe("evt-1");
    const event = (h.persistCalls[0] as { eventPayload: Record<string, unknown> })
      .eventPayload;
    expect(event).toMatchObject({
      proposal_id: "proposal-1",
      source_continuous_close_run_id: CC,
      source_accounting_sync_id: SYNC,
      origin_type: "ACCRUAL",
    });
    expect(JSON.stringify(event)).not.toMatch(/token/i);
  });

  it("requires exact CC run", async () => {
    const h = makeHarness({ cc: null });
    const result = await createContinuousCloseJournalEntryProposal(
      baseInput(),
      principal(),
      policy(),
      h.deps,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(JE_PROPOSAL_ERROR.CC_RUN_NOT_FOUND);
  });

  it("rejects CC engagement mismatch", async () => {
    const h = makeHarness({ cc: { engagementId: "eng-other" } });
    // loadCcRun in harness returns mismatched engagement without throwing —
    // service compares via loadCcRun args; simulate throw path:
    h.deps.loadCcRun = async () => {
      const { JeProposalCustodyError } = await import("../source-custody");
      throw new JeProposalCustodyError(
        JE_PROPOSAL_ERROR.CC_ENGAGEMENT_MISMATCH,
        "mismatch",
      );
    };
    const result = await createContinuousCloseJournalEntryProposal(
      baseInput(),
      principal(),
      policy(),
      h.deps,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(JE_PROPOSAL_ERROR.CC_ENGAGEMENT_MISMATCH);
  });

  it("rejects CC company mismatch", async () => {
    const h = makeHarness();
    h.deps.loadCcRun = async () => {
      const { JeProposalCustodyError } = await import("../source-custody");
      throw new JeProposalCustodyError(JE_PROPOSAL_ERROR.CC_COMPANY_MISMATCH, "x");
    };
    const result = await createContinuousCloseJournalEntryProposal(
      baseInput(),
      principal(),
      policy(),
      h.deps,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(JE_PROPOSAL_ERROR.CC_COMPANY_MISMATCH);
  });

  it("source accounting sync comes only from CC run", async () => {
    const h = makeHarness();
    const result = await createContinuousCloseJournalEntryProposal(
      baseInput(),
      principal(),
      policy(),
      h.deps,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proposal.source_accounting_sync_id).toBe(SYNC);
    expect(
      (baseInput() as Record<string, unknown>).sourceAccountingSyncId,
    ).toBeUndefined();
  });

  it("rejects caller authority override fields", async () => {
    const h = makeHarness();
    const result = await createContinuousCloseJournalEntryProposal(
      {
        ...baseInput(),
        companyId: "attacker",
      } as never,
      principal(),
      policy(),
      h.deps,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(JE_PROPOSAL_ERROR.CALLER_AUTHORITY_OVERRIDE);
  });

  it("rejects non-SUCCESS sync", async () => {
    const h = makeHarness({ sync: { validationStatus: "FAILED" } });
    h.deps.loadSync = async () => {
      const { JeProposalCustodyError } = await import("../source-custody");
      throw new JeProposalCustodyError(JE_PROPOSAL_ERROR.SYNC_NOT_SUCCESS, "bad");
    };
    const result = await createContinuousCloseJournalEntryProposal(
      baseInput(),
      principal(),
      policy(),
      h.deps,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(JE_PROPOSAL_ERROR.SYNC_NOT_SUCCESS);
  });

  it("accepts authoritative AR / AP / Inventory sources", async () => {
    for (const runId of [RUN_AR, RUN_AP, RUN_INV]) {
      const h = makeHarness();
      const result = await createContinuousCloseJournalEntryProposal(
        baseInput({ sourceReconRunIds: [runId] }),
        principal(),
        policy(),
        h.deps,
      );
      expect(result.ok, runId).toBe(true);
    }
  });

  it("rejects NULL baseline_sync_id recon", async () => {
    const h = makeHarness({
      reconById: {
        [RUN_AR]: {
          id: RUN_AR,
          engagementId: ENG,
          periodEnd: "2026-07-31",
          tieOutKind: "ar_aging",
          status: "completed",
          reconOutcome: "open_review",
          baselineSyncId: null,
          measurementSource: "live_provider",
        },
      },
    });
    const result = await createContinuousCloseJournalEntryProposal(
      baseInput({ sourceReconRunIds: [RUN_AR] }),
      principal(),
      policy(),
      h.deps,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(JE_PROPOSAL_ERROR.RECON_BASELINE_NULL);
  });

  it("rejects wrong baseline sync", async () => {
    const h = makeHarness({
      reconById: {
        [RUN_AR]: {
          id: RUN_AR,
          engagementId: ENG,
          periodEnd: "2026-07-31",
          tieOutKind: "ar_aging",
          status: "completed",
          reconOutcome: "open_review",
          baselineSyncId: "other-sync",
          measurementSource: "persisted_sync_snapshot",
        },
      },
    });
    const result = await createContinuousCloseJournalEntryProposal(
      baseInput({ sourceReconRunIds: [RUN_AR] }),
      principal(),
      policy(),
      h.deps,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(JE_PROPOSAL_ERROR.RECON_BASELINE_MISMATCH);
  });

  it("requires verified writer and rejects system principal", async () => {
    const h = makeHarness({ actor: null });
    const denied = await createContinuousCloseJournalEntryProposal(
      baseInput(),
      principal(),
      policy(),
      h.deps,
    );
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.code).toBe(JE_PROPOSAL_ERROR.WRITE_FORBIDDEN);

    const system = await createContinuousCloseJournalEntryProposal(
      baseInput(),
      { principal: { type: "system" as never, userId: USER } },
      policy(),
      makeHarness().deps,
    );
    expect(system.ok).toBe(false);
    if (!system.ok) expect(system.code).toBe(JE_PROPOSAL_ERROR.UNSUPPORTED_PRINCIPAL);
  });

  it("allows firm writer and stamps proposed_by from actor", async () => {
    const h = makeHarness({
      actor: { userId: USER, canWrite: true, canRead: true, scope: "firm" },
    });
    const result = await createContinuousCloseJournalEntryProposal(
      baseInput(),
      principal(),
      policy(),
      h.deps,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proposal.proposed_by).toBe(USER);
  });

  it("rejects AR/AP/Inventory control ids and types", async () => {
    for (const accountId of ["84", "33", "81", "ar-type", "ap-type", "inv-type"]) {
      const h = makeHarness();
      const result = await createContinuousCloseJournalEntryProposal(
        baseInput({
          lines: [
            {
              sequence: 1,
              accountId,
              debitCents: 100,
              creditCents: 0,
            },
            {
              sequence: 2,
              accountId: "liab-1",
              debitCents: 0,
              creditCents: 100,
            },
          ],
        }),
        principal(),
        policy(),
        h.deps,
      );
      expect(result.ok, accountId).toBe(false);
    }
  });

  it("accepts safe reclass and rejects unsupported origin", async () => {
    const ok = await createContinuousCloseJournalEntryProposal(
      baseInput({
        originType: "RECLASS",
        lines: [
          { sequence: 1, accountId: "exp-1", debitCents: 100, creditCents: 0 },
          { sequence: 2, accountId: "exp-2", debitCents: 0, creditCents: 100 },
        ],
      }),
      principal(),
      policy(),
      makeHarness().deps,
    );
    expect(ok.ok).toBe(true);

    const bad = await createContinuousCloseJournalEntryProposal(
      baseInput({ originType: "RESERVE" as never }),
      principal(),
      policy(),
      makeHarness().deps,
    );
    expect(bad.ok).toBe(false);
  });

  it("rejects cross-period and locked period", async () => {
    const cross = await createContinuousCloseJournalEntryProposal(
      baseInput({ txnDate: "2026-08-15" }),
      principal(),
      policy(),
      makeHarness().deps,
    );
    expect(cross.ok).toBe(false);
    if (!cross.ok) expect(cross.code).toBe(JE_PROPOSAL_ERROR.CROSS_PERIOD);

    const locked = await createContinuousCloseJournalEntryProposal(
      baseInput(),
      principal(),
      policy(),
      makeHarness({ periodLocked: true }).deps,
    );
    expect(locked.ok).toBe(false);
    if (!locked.ok) expect(locked.code).toBe(JE_PROPOSAL_ERROR.PERIOD_LOCKED);
  });

  it("idempotent duplicate returns existing and skips second ledger event", async () => {
    const h = makeHarness();
    const first = await createContinuousCloseJournalEntryProposal(
      baseInput(),
      principal(),
      policy(),
      h.deps,
    );
    const second = await createContinuousCloseJournalEntryProposal(
      baseInput(),
      principal(),
      policy(),
      h.deps,
    );
    expect(first.ok && !first.reused).toBe(true);
    expect(second.ok && second.reused).toBe(true);
    if (second.ok) expect(second.ledgerEventId).toBeNull();
    expect(h.rows).toHaveLength(1);
  });

  it("changed economics create a new proposal", async () => {
    const h = makeHarness();
    await createContinuousCloseJournalEntryProposal(
      baseInput(),
      principal(),
      policy(),
      h.deps,
    );
    h.deps.newId = () => "proposal-2";
    const second = await createContinuousCloseJournalEntryProposal(
      baseInput({
        lines: [
          { sequence: 1, accountId: "exp-1", debitCents: 9999, creditCents: 0 },
          { sequence: 2, accountId: "liab-1", debitCents: 0, creditCents: 9999 },
        ],
        expectedEffects: [
          {
            type: "ACCOUNT_RECLASS",
            fromAccountId: "exp-1",
            toAccountId: "liab-1",
            amountCents: 9999,
          },
        ],
      }),
      principal(),
      policy(),
      h.deps,
    );
    expect(second.ok && !second.reused).toBe(true);
    expect(h.rows).toHaveLength(2);
  });

  it("does not silently default policy", async () => {
    const result = await createContinuousCloseJournalEntryProposal(
      baseInput(),
      principal(),
      null as never,
      makeHarness().deps,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(JE_PROPOSAL_ERROR.POLICY_REQUIRED);
  });

  it("surfaces ledger publish failure without claiming success", async () => {
    const h = makeHarness({
      async persistImpl() {
        const { JeProposalPersistError } = await import("../repository");
        throw new JeProposalPersistError(
          JE_PROPOSAL_ERROR.LEDGER_PUBLISH_FAILED,
          "publish_ledger_event RPC failed",
        );
      },
    });
    const result = await createContinuousCloseJournalEntryProposal(
      baseInput(),
      principal(),
      policy(),
      h.deps,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(JE_PROPOSAL_ERROR.LEDGER_PUBLISH_FAILED);
  });

  it("does not import provider poster", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const root = path.join(process.cwd(), "lib/journal-entry-governance");
    const files = fs.readdirSync(root).filter((f) => f.endsWith(".ts"));
    for (const file of files) {
      const src = fs.readFileSync(path.join(root, file), "utf8");
      expect(src, file).not.toContain("journal-entry-poster");
      expect(src, file).not.toContain("qboJournalEntryPoster");
      expect(src, file).not.toContain("ManualJournal");
    }
  });
});
