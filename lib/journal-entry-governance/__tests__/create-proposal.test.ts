import { describe, expect, it } from "vitest";
import { createContinuousCloseJournalEntryProposal } from "../service";
import { resolveAuthoritativeCcReconSlot } from "../source-custody";
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

function defaultObservationSummary(over?: {
  ar?: Partial<{ runId: string | null; authoritative: boolean; baselineSyncId: string | null }>;
  ap?: Partial<{ runId: string | null; authoritative: boolean; baselineSyncId: string | null }>;
  inventory?: Partial<{
    runId: string | null;
    authoritative: boolean;
    baselineSyncId: string | null;
  }>;
}) {
  return {
    reconciliations: {
      ar: {
        runId: RUN_AR,
        authoritative: true,
        baselineSyncId: SYNC,
        ...(over?.ar || {}),
      },
      ap: {
        runId: RUN_AP,
        authoritative: true,
        baselineSyncId: SYNC,
        ...(over?.ap || {}),
      },
      inventory: {
        runId: RUN_INV,
        authoritative: true,
        baselineSyncId: SYNC,
        ...(over?.inventory || {}),
      },
    },
  };
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
    readiness: string | null;
    observationSummary: ReturnType<typeof defaultObservationSummary> | null;
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
      const { parseCcObservationSummary } = await import("../source-custody");
      const ccOver = opts?.cc || {};
      const summaryRaw =
        "observationSummary" in ccOver
          ? ccOver.observationSummary
          : defaultObservationSummary();
      if (summaryRaw === null) {
        const { JeProposalCustodyError } = await import("../source-custody");
        throw new JeProposalCustodyError(
          JE_PROPOSAL_ERROR.RECON_SUMMARY_MALFORMED,
          "missing summary",
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
        readiness: "READY",
        ...ccOver,
        observationSummary: parseCcObservationSummary(summaryRaw),
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
    resolveCcReconSlot: resolveAuthoritativeCcReconSlot,
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
        },
        [RUN_AP]: {
          id: RUN_AP,
          engagementId: ENG,
          periodEnd: "2026-07-31",
          tieOutKind: "ap_aging",
          status: "completed",
          reconOutcome: "open_review",
          baselineSyncId: SYNC,
        },
        [RUN_INV]: {
          id: RUN_INV,
          engagementId: ENG,
          periodEnd: "2026-07-31",
          tieOutKind: "inventory",
          status: "completed",
          reconOutcome: "open_review",
          baselineSyncId: SYNC,
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
      if (row.tieOutKind !== args.expectedKind) {
        const { JeProposalCustodyError } = await import("../source-custody");
        throw new JeProposalCustodyError(
          JE_PROPOSAL_ERROR.RECON_KIND_MISMATCH,
          "kind mismatch",
        );
      }
      return {
        id: row.id,
        engagementId: row.engagementId,
        periodEnd: row.periodEnd,
        tieOutKind: row.tieOutKind as "ar_aging" | "ap_aging" | "inventory",
        status: row.status,
        reconOutcome: row.reconOutcome,
        baselineSyncId: row.baselineSyncId,
      };
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

  it("rejects wrong baseline sync on run row", async () => {
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

  it("rejects non-authoritative CC observation slot", async () => {
    const h = makeHarness({
      cc: {
        observationSummary: defaultObservationSummary({
          ar: { authoritative: false },
        }),
      },
    });
    const result = await createContinuousCloseJournalEntryProposal(
      baseInput({ sourceReconRunIds: [RUN_AR] }),
      principal(),
      policy(),
      h.deps,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(JE_PROPOSAL_ERROR.RECON_NOT_AUTHORITATIVE);
  });

  it("rejects recon absent from source CC observation_summary", async () => {
    const h = makeHarness({
      cc: {
        observationSummary: defaultObservationSummary({
          ar: { runId: "run-other" },
        }),
      },
    });
    const result = await createContinuousCloseJournalEntryProposal(
      baseInput({ sourceReconRunIds: [RUN_AR] }),
      principal(),
      policy(),
      h.deps,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(JE_PROPOSAL_ERROR.RECON_SLOT_ABSENT);
  });

  it("rejects slot baselineSyncId mismatch", async () => {
    const h = makeHarness({
      cc: {
        observationSummary: defaultObservationSummary({
          ar: { baselineSyncId: "other-sync" },
        }),
      },
    });
    const result = await createContinuousCloseJournalEntryProposal(
      baseInput({ sourceReconRunIds: [RUN_AR] }),
      principal(),
      policy(),
      h.deps,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(JE_PROPOSAL_ERROR.RECON_SLOT_BASELINE_MISMATCH);
    }
  });

  it("rejects malformed observation_summary", async () => {
    const h = makeHarness({ cc: { observationSummary: null } });
    const result = await createContinuousCloseJournalEntryProposal(
      baseInput(),
      principal(),
      policy(),
      h.deps,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(JE_PROPOSAL_ERROR.RECON_SUMMARY_MALFORMED);
  });

  it("rejects run kind mismatch vs CC slot", async () => {
    const h = makeHarness({
      reconById: {
        [RUN_AR]: {
          id: RUN_AR,
          engagementId: ENG,
          periodEnd: "2026-07-31",
          tieOutKind: "inventory",
          status: "completed",
          reconOutcome: "open_review",
          baselineSyncId: SYNC,
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
    if (!result.ok) expect(result.code).toBe(JE_PROPOSAL_ERROR.RECON_KIND_MISMATCH);
  });

  it("rejects incomplete run and missing recon_outcome", async () => {
    const incomplete = await createContinuousCloseJournalEntryProposal(
      baseInput({ sourceReconRunIds: [RUN_AR] }),
      principal(),
      policy(),
      makeHarness({
        reconById: {
          [RUN_AR]: {
            id: RUN_AR,
            engagementId: ENG,
            periodEnd: "2026-07-31",
            tieOutKind: "ar_aging",
            status: "running",
            reconOutcome: "open_review",
            baselineSyncId: SYNC,
          },
        },
      }).deps,
    );
    expect(incomplete.ok).toBe(false);
    if (!incomplete.ok) {
      expect(incomplete.code).toBe(JE_PROPOSAL_ERROR.RECON_NOT_COMPLETED);
    }

    const noOutcome = await createContinuousCloseJournalEntryProposal(
      baseInput({ sourceReconRunIds: [RUN_AR] }),
      principal(),
      policy(),
      makeHarness({
        reconById: {
          [RUN_AR]: {
            id: RUN_AR,
            engagementId: ENG,
            periodEnd: "2026-07-31",
            tieOutKind: "ar_aging",
            status: "completed",
            reconOutcome: null,
            baselineSyncId: SYNC,
          },
        },
      }).deps,
    );
    expect(noOutcome.ok).toBe(false);
    if (!noOutcome.ok) {
      expect(noOutcome.code).toBe(JE_PROPOSAL_ERROR.RECON_OUTCOME_MISSING);
    }
  });

  it("allows BLOCKED CC run when requested AR slot is authoritative", async () => {
    const h = makeHarness({
      cc: {
        readiness: "BLOCKED",
        observationSummary: defaultObservationSummary(),
      },
    });
    const result = await createContinuousCloseJournalEntryProposal(
      baseInput({ sourceReconRunIds: [RUN_AR] }),
      principal(),
      policy(),
      h.deps,
    );
    expect(result.ok).toBe(true);
  });

  it("BLOCKED CC cannot use a non-authoritative/missing slot as source", async () => {
    const h = makeHarness({
      cc: {
        readiness: "BLOCKED",
        observationSummary: defaultObservationSummary({
          ap: { authoritative: false },
        }),
      },
    });
    const result = await createContinuousCloseJournalEntryProposal(
      baseInput({ sourceReconRunIds: [RUN_AP] }),
      principal(),
      policy(),
      h.deps,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(JE_PROPOSAL_ERROR.RECON_NOT_AUTHORITATIVE);
  });

  it("does not query measurement_source on tie-out runs", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.join(process.cwd(), "lib/journal-entry-governance/source-custody.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/select\([\s\S]*measurement_source/i);
    expect(src).toContain("observation_summary");
    expect(src).toContain("resolveAuthoritativeCcReconSlot");
    expect(src).toContain("baseline_sync_id");
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
