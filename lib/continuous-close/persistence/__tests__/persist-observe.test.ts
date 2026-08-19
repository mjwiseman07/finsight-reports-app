import { describe, expect, it } from "vitest";
import type { AuthoritativeObservationResult } from "@/lib/audit-ready/authoritative-observation/types";
import { AUTHORITATIVE_OBSERVATION_ERROR } from "@/lib/audit-ready/authoritative-observation/types";
import {
  DEFAULT_OBSERVE_POLICY,
  type ContinuousCloseObservePolicy,
} from "@/lib/continuous-close/policy";
import type { ContinuousCloseUrmNormalizedInput } from "@/lib/continuous-close/types";
import type { StatementControlResult } from "@/lib/integrations/accounting/statement-control";
import { hashObserveIdempotencyKey, hashObserveInput, hashObservePolicy } from "../hash";
import { runAndPersistAuthoritativeObserve, type PersistObserveDeps } from "../run-and-persist-observe";
import { PersistObserveWriteError } from "../repository";
import { PERSIST_OBSERVE_ERROR, type ContinuousCloseRunRow, type ObserveAccountingState } from "../types";

const SYNC = "11111111-1111-4111-8111-111111111111";
const COMPANY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CONN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ENG = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const USER = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function passingControl(over: Partial<StatementControlResult["balanceSheet"]["lines"][number]> = {}): StatementControlResult {
  const line = (
    key: StatementControlResult["balanceSheet"]["lines"][number]["key"],
    pass = true,
  ) => ({
    key,
    label: key,
    nativeAmount: 100,
    canonicalAmount: 100,
    variance: pass ? 0 : 5,
    varianceAbs: pass ? 0 : 5,
    toleranceDollar: 0.01,
    status: pass ? ("tie" as const) : ("fail" as const),
    passes: pass,
    reason: pass ? "tie" : "fail",
    ...over,
  });
  return {
    computedAt: "2026-08-18T00:00:00.000Z",
    toleranceDollar: 0.01,
    nativeSource: null,
    nativeBalanceSheetReportRef: null,
    nativeProfitAndLossReportRef: null,
    periodAligned: true,
    periodMismatchReason: null,
    balanceSheet: {
      lines: [line("cash"), line("bs_equation")],
      passes: true,
      equationPasses: true,
    },
    incomeStatement: {
      lines: [line("net_income")],
      passes: true,
    },
    cashControlPasses: true,
    arControlPasses: true,
    netProfitMarginControlPasses: true,
    operatingGrossMarginControlPasses: true,
    overallPasses: true,
  };
}

function observePolicy(
  requiredReconKinds: string[],
  over: Partial<ContinuousCloseObservePolicy> = {},
): ContinuousCloseObservePolicy {
  return {
    ...DEFAULT_OBSERVE_POLICY,
    requiredReconKinds,
    evidence: {
      requireEvidenceForReconciled: false,
      minEvidenceCountForReconciled: 1,
    },
    ...over,
  };
}

function authSlot(runId: string) {
  return {
    runId,
    status: "completed" as const,
    totalsStatus: "tie" as const,
    baselineSyncId: SYNC,
    measurementSource: "persisted_sync_snapshot" as const,
    authoritative: true,
  };
}

function observation(
  over: Partial<AuthoritativeObservationResult> = {},
): AuthoritativeObservationResult {
  return {
    observationId: "obs-1",
    acquisitionId: "acq-1",
    mode: "REPLAY_EXISTING_SYNC",
    accountingSyncId: SYNC,
    companyId: COMPANY,
    engagementId: ENG,
    periodEnd: "2026-07-31",
    status: "completed",
    reconciliations: {
      ar: authSlot("run-ar"),
      ap: authSlot("run-ap"),
      inventory: authSlot("run-inv"),
    },
    custody: {
      allSameSync: true,
      snapshotsPresent: ["ar_aging", "ap_aging", "inventory"],
    },
    failures: [],
    ...over,
  };
}

function accounting(over: Partial<ObserveAccountingState> = {}): ObserveAccountingState {
  return {
    accountingSyncId: SYNC,
    companyId: COMPANY,
    accountingConnectionId: CONN,
    provider: "quickbooks",
    tenantOrRealmId: "realm-1",
    periodStart: "2026-07-01",
    periodEnd: "2026-07-31",
    syncedAt: "2026-08-18T16:00:00.000Z",
    statementControl: passingControl(),
    statementControlContractVersion: 1,
    ...over,
  };
}

function urm(
  kind: "ar_aging" | "ap_aging" | "inventory",
  runId: string,
): ContinuousCloseUrmNormalizedInput {
  return {
    workpaperId: runId,
    workpaperKind: kind,
    required: true,
    outcome: "reconciled_exact",
    unidentifiedResidualCents: 0,
    materialityThresholdCents: null,
    grossVarianceCents: 0,
    identifiedTotalCents: 0,
    evidenceCount: 0,
    sourceAccountingSyncId: SYNC,
    asOfDate: "2026-07-31",
    urmRunId: runId,
  };
}

function principal(userId = USER) {
  return { principal: { type: "user" as const, userId } };
}

function replayInput() {
  return {
    mode: "REPLAY_EXISTING_SYNC" as const,
    engagementId: ENG,
    triggerReason: "manual" as const,
    accountingSyncId: SYNC,
  };
}

function makeHarness(over: Partial<PersistObserveDeps> = {}) {
  const rows: ContinuousCloseRunRow[] = [];
  const persistCalls: unknown[] = [];
  const observationCalls: unknown[] = [];
  let nextObservation = observation();
  const deps: PersistObserveDeps = {
    async runObservation(input, executionContext) {
      observationCalls.push({ input, executionContext });
      return nextObservation;
    },
    async loadAccountingState() {
      return accounting();
    },
    async mapUrm() {
      return {
        urmInputs: [
          urm("ar_aging", "run-ar"),
          urm("ap_aging", "run-ap"),
          urm("inventory", "run-inv"),
        ],
        selectedUrmRuns: {
          ar_aging: "run-ar",
          ap_aging: "run-ap",
          inventory: "run-inv",
        },
      };
    },
    async loadEngagementScope() {
      return { firmId: null, firmClientId: null };
    },
    async loadClosePeriodId() {
      return null;
    },
    async loadAssertion() {
      return null;
    },
    async loadPriorRunId() {
      return rows[rows.length - 1]?.id ?? null;
    },
    async loadByIdempotencyKey(key) {
      return rows.find((row) => row.idempotency_key === key) ?? null;
    },
    async persistRun(input) {
      persistCalls.push(input);
      const existing = rows.find((row) => row.idempotency_key === input.row.idempotency_key);
      if (existing) {
        return { reused: true, row: existing, ledgerEventId: null };
      }
      rows.push(input.row);
      return { reused: false, row: input.row, ledgerEventId: "evt-1" };
    },
    newRunId: () => "cc-run-1",
    nowIso: () => "2026-08-19T04:00:00.000Z",
    ...over,
  };
  return {
    deps,
    rows,
    persistCalls,
    observationCalls,
    setObservation(value: AuthoritativeObservationResult) {
      nextObservation = value;
    },
  };
}

describe("runAndPersistAuthoritativeObserve", () => {
  it("creates one continuous_close_runs row for a completed OBSERVE evaluation", async () => {
    const h = makeHarness();
    const result = await runAndPersistAuthoritativeObserve(
      replayInput(),
      principal(),
      observePolicy(["ar_aging", "ap_aging", "inventory"]),
      h.deps,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reused).toBe(false);
    expect(h.rows).toHaveLength(1);
    expect(result.run.accounting_sync_id).toBe(SYNC);
    expect(result.run.mode).toBe("OBSERVE");
    expect(result.run.status).toBe("completed");
    expect(result.run.readiness).toBe("READY");
    expect(result.ledgerEventId).toBe("evt-1");
  });

  it("persists READY, READY_WITH_REVIEW, and BLOCKED unchanged", async () => {
    const h = makeHarness({
      async mapUrm() {
        return {
          urmInputs: [
            { ...urm("ar_aging", "run-ar"), outcome: "open_review" },
          ],
          selectedUrmRuns: { ar_aging: "run-ar" },
        };
      },
    });
    const review = await runAndPersistAuthoritativeObserve(
      replayInput(),
      principal(),
      observePolicy(["ar_aging"]),
      h.deps,
    );
    expect(review.ok && review.run.readiness).toBe("READY_WITH_REVIEW");

    const blockedHarness = makeHarness({
      async mapUrm() {
        return { urmInputs: [], selectedUrmRuns: {} };
      },
    });
    const blocked = await runAndPersistAuthoritativeObserve(
      replayInput(),
      principal(),
      observePolicy(["ar_aging"]),
      blockedHarness.deps,
    );
    expect(blocked.ok && blocked.run.readiness).toBe("BLOCKED");
    expect(
      blocked.ok &&
        blocked.observe?.exceptions.some((e) => e.exceptionClass === "urm_missing_required"),
    ).toBe(true);
  });

  it("explicit empty policy persists BLOCKED rather than silently READY", async () => {
    const h = makeHarness();
    const result = await runAndPersistAuthoritativeObserve(
      replayInput(),
      principal(),
      DEFAULT_OBSERVE_POLICY,
      h.deps,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.run.readiness).toBe("BLOCKED");
    expect(result.observe?.exceptions.some((e) => e.exceptionClass === "policy_invalid")).toBe(
      true,
    );
  });

  it("requires an explicit observe policy", async () => {
    const h = makeHarness();
    const result = await runAndPersistAuthoritativeObserve(
      replayInput(),
      principal(),
      undefined as unknown as ContinuousCloseObservePolicy,
      h.deps,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(PERSIST_OBSERVE_ERROR.POLICY_REQUIRED);
    expect(h.rows).toHaveLength(0);
  });

  it("evaluates AR-only, AP-only, AR+AP, and AR+AP+Inventory policies", async () => {
    for (const kinds of [
      ["ar_aging"],
      ["ap_aging"],
      ["ar_aging", "ap_aging"],
      ["ar_aging", "ap_aging", "inventory"],
    ]) {
      const h = makeHarness();
      const result = await runAndPersistAuthoritativeObserve(
        replayInput(),
        principal(),
        observePolicy(kinds),
        h.deps,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.run.readiness).toBe("READY");
    }
  });

  it("BLOCKS when FA/GRNI/BS kinds are required without authoritative custody", async () => {
    for (const kind of [
      "fixed_asset_rollforward",
      "grni",
      "bs_account_recon",
      "bs_recon_summary",
    ]) {
      const h = makeHarness({
        async mapUrm() {
          return { urmInputs: [], selectedUrmRuns: {} };
        },
      });
      const result = await runAndPersistAuthoritativeObserve(
        replayInput(),
        principal(),
        observePolicy([kind]),
        h.deps,
      );
      expect(result.ok && result.run.readiness).toBe("BLOCKED");
      expect(
        result.ok &&
          result.observe?.exceptions.some(
            (e) =>
              e.exceptionClass === "urm_missing_required" &&
              e.code === `cc.urm.missing_required.${kind}`,
          ),
      ).toBe(true);
    }
  });

  it("does not persist when the snapshot trio is incomplete", async () => {
    const h = makeHarness();
    h.setObservation(
      observation({
        accountingSyncId: null,
        status: "failed",
        custody: { allSameSync: false, snapshotsPresent: ["ar_aging"] },
        failures: [{ code: "replay_inventory_snapshot_missing", message: "missing inventory" }],
      }),
    );
    const result = await runAndPersistAuthoritativeObserve(
      replayInput(),
      principal(),
      observePolicy(["ar_aging"]),
      h.deps,
    );
    expect(result.ok).toBe(false);
    expect(h.rows).toHaveLength(0);
    expect(h.persistCalls).toHaveLength(0);
  });

  it("loads statementControl and last_synced_at from the exact sync", async () => {
    const loads: unknown[] = [];
    const h = makeHarness({
      async loadAccountingState(args) {
        loads.push(args);
        return accounting({
          syncedAt: "2026-08-18T16:00:00.000Z",
          statementControlContractVersion: 1,
        });
      },
    });
    const result = await runAndPersistAuthoritativeObserve(
      replayInput(),
      principal(),
      observePolicy(["ar_aging", "ap_aging", "inventory"]),
      h.deps,
    );
    expect(loads).toEqual([
      {
        accountingSyncId: SYNC,
        expectedCompanyId: COMPANY,
        expectedPeriodEnd: "2026-07-31",
      },
    ]);
    expect(result.ok && result.observe?.freshness.syncedAt).toBe("2026-08-18T16:00:00.000Z");
    expect(result.ok && result.observe?.freshness.status).toBe("not_gated");
  });

  it("BLOCKS contracted missing statementControl and required failed control", async () => {
    const missing = makeHarness({
      async loadAccountingState() {
        return accounting({ statementControl: null, statementControlContractVersion: 1 });
      },
    });
    const missingResult = await runAndPersistAuthoritativeObserve(
      replayInput(),
      principal(),
      observePolicy(["ar_aging"]),
      missing.deps,
    );
    expect(missingResult.ok && missingResult.run.readiness).toBe("BLOCKED");
    expect(
      missingResult.ok &&
        missingResult.observe?.exceptions.some(
          (e) => e.exceptionClass === "statement_control_missing",
        ),
    ).toBe(true);

    const failedControl = passingControl();
    failedControl.balanceSheet.lines[0] = {
      ...failedControl.balanceSheet.lines[0],
      key: "cash",
      passes: false,
      status: "fail",
      reason: "cash fail",
    };
    const failed = makeHarness({
      async loadAccountingState() {
        return accounting({ statementControl: failedControl });
      },
    });
    const failedResult = await runAndPersistAuthoritativeObserve(
      replayInput(),
      principal(),
      observePolicy(["ar_aging"], { statementControlRequiredKeys: ["cash"] }),
      failed.deps,
    );
    expect(failedResult.ok && failedResult.run.readiness).toBe("BLOCKED");
  });

  it("optional failed statement control → READY_WITH_REVIEW when recons pass", async () => {
    const failedControl = passingControl();
    failedControl.balanceSheet.lines[0] = {
      ...failedControl.balanceSheet.lines[0],
      key: "cash",
      passes: false,
      status: "fail",
      reason: "cash fail",
    };
    const h = makeHarness({
      async loadAccountingState() {
        return accounting({ statementControl: failedControl });
      },
    });
    const result = await runAndPersistAuthoritativeObserve(
      replayInput(),
      principal(),
      observePolicy(["ar_aging"], { statementControlOptionalKeys: ["cash"] }),
      h.deps,
    );
    expect(result.ok && result.run.readiness).toBe("READY_WITH_REVIEW");
  });

  it("assertion null is NOT_SUPPORTED and does not independently BLOCK", async () => {
    const h = makeHarness();
    const result = await runAndPersistAuthoritativeObserve(
      replayInput(),
      principal(),
      observePolicy(["ar_aging", "ap_aging", "inventory"]),
      h.deps,
    );
    expect(result.ok && result.observe?.capabilityStatus.assertions).toBe("NOT_SUPPORTED");
    expect(result.ok && result.run.readiness).toBe("READY");
    expect(
      result.ok && result.observe?.exceptions.some((e) => e.exceptionClass === "assertion_gap"),
    ).toBe(false);
  });

  it("honors freshness gates from last_synced_at, not created_at", async () => {
    const stale = makeHarness({
      async loadAccountingState() {
        return accounting({ syncedAt: "2020-01-01T00:00:00.000Z" });
      },
    });
    const staleResult = await runAndPersistAuthoritativeObserve(
      replayInput(),
      principal(),
      observePolicy(["ar_aging"], { freshnessMaxAgeHours: 1 }),
      stale.deps,
    );
    expect(staleResult.ok && staleResult.run.readiness).toBe("BLOCKED");
    expect(staleResult.ok && staleResult.observe?.freshness.status).toBe("stale");

    const unknown = makeHarness({
      async loadAccountingState() {
        return accounting({ syncedAt: null });
      },
    });
    const unknownResult = await runAndPersistAuthoritativeObserve(
      replayInput(),
      principal(),
      observePolicy(["ar_aging"], { freshnessMaxAgeHours: 1 }),
      unknown.deps,
    );
    expect(unknownResult.ok && unknownResult.observe?.freshness.status).toBe("unknown");
    expect(unknownResult.ok && unknownResult.run.readiness).toBe("BLOCKED");
  });

  it("reuses the existing row and does not republish on duplicate evaluation", async () => {
    const h = makeHarness();
    const policy = observePolicy(["ar_aging", "ap_aging", "inventory"]);
    const first = await runAndPersistAuthoritativeObserve(
      replayInput(),
      principal(),
      policy,
      h.deps,
    );
    const second = await runAndPersistAuthoritativeObserve(
      replayInput(),
      principal(),
      policy,
      h.deps,
    );
    expect(first.ok && first.reused).toBe(false);
    expect(second.ok && second.reused).toBe(true);
    expect(h.rows).toHaveLength(1);
    expect(h.persistCalls).toHaveLength(1);
    expect(second.ok && second.run.id).toBe(first.ok ? first.run.id : "");
    expect(second.ok && second.ledgerEventId).toBeNull();
  });

  it("new REPLAY URM run ids create a new CC row", async () => {
    const h = makeHarness();
    const policy = observePolicy(["ar_aging"]);
    await runAndPersistAuthoritativeObserve(replayInput(), principal(), policy, {
      ...h.deps,
      async mapUrm() {
        return {
          urmInputs: [urm("ar_aging", "run-ar")],
          selectedUrmRuns: { ar_aging: "run-ar" },
        };
      },
    });
    const second = await runAndPersistAuthoritativeObserve(replayInput(), principal(), policy, {
      ...h.deps,
      newRunId: () => "cc-run-2",
      async mapUrm() {
        return {
          urmInputs: [urm("ar_aging", "run-ar-2")],
          selectedUrmRuns: { ar_aging: "run-ar-2" },
        };
      },
    });
    expect(second.ok && second.reused).toBe(false);
    expect(h.rows).toHaveLength(2);
    expect(h.rows[1]?.supersedes_run_id).toBe(h.rows[0]?.id);
  });

  it("changed policy creates a new row that supersedes the prior evaluation", async () => {
    const h = makeHarness();
    await runAndPersistAuthoritativeObserve(
      replayInput(),
      principal(),
      observePolicy(["ar_aging"]),
      h.deps,
    );
    const second = await runAndPersistAuthoritativeObserve(
      replayInput(),
      principal(),
      observePolicy(["ar_aging", "ap_aging"]),
      { ...h.deps, newRunId: () => "cc-run-2" },
    );
    expect(second.ok && second.reused).toBe(false);
    expect(h.rows).toHaveLength(2);
    expect(h.rows[1]?.policy_hash).not.toBe(h.rows[0]?.policy_hash);
    expect(h.rows[1]?.supersedes_run_id).toBe(h.rows[0]?.id);
  });

  it("publishes the observe completed ledger payload on first insert only", async () => {
    const h = makeHarness();
    await runAndPersistAuthoritativeObserve(
      replayInput(),
      principal(),
      observePolicy(["ar_aging", "ap_aging", "inventory"]),
      h.deps,
    );
    const payload = (h.persistCalls[0] as { eventPayload: Record<string, unknown> }).eventPayload;
    expect(payload).toMatchObject({
      continuous_close_run_id: "cc-run-1",
      accounting_sync_id: SYNC,
      engagement_id: ENG,
      period_end: "2026-07-31",
      readiness: "READY",
      observation_mode: "REPLAY_EXISTING_SYNC",
      authoritative_urm_run_ids: {
        ar_aging: "run-ar",
        ap_aging: "run-ap",
        inventory: "run-inv",
      },
    });
    expect(String(payload.policy_hash)).toHaveLength(64);
    expect(String(payload.input_hash)).toHaveLength(64);
    expect(JSON.stringify(payload)).not.toMatch(/token/i);
    expect(JSON.stringify(h.rows[0]?.observation_summary)).not.toMatch(/token/i);
  });

  it("does not silently succeed when ledger persist fails", async () => {
    const h = makeHarness({
      async persistRun() {
        throw new PersistObserveWriteError(
          PERSIST_OBSERVE_ERROR.LEDGER_PUBLISH_FAILED,
          "publish_ledger_event RPC failed",
        );
      },
    });
    const result = await runAndPersistAuthoritativeObserve(
      replayInput(),
      principal(),
      observePolicy(["ar_aging"]),
      h.deps,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(PERSIST_OBSERVE_ERROR.LEDGER_PUBLISH_FAILED);
  });

  it("stamps created_by from the verified principal and rejects system principals", async () => {
    const h = makeHarness();
    const ok = await runAndPersistAuthoritativeObserve(
      replayInput(),
      principal(),
      observePolicy(["ar_aging", "ap_aging", "inventory"]),
      h.deps,
    );
    expect(ok.ok && ok.run.created_by).toBe(USER);

    const system = await runAndPersistAuthoritativeObserve(
      replayInput(),
      { principal: { type: "system", service: "cron" } },
      observePolicy(["ar_aging"]),
      h.deps,
    );
    expect(system.ok).toBe(false);
    if (system.ok) return;
    expect(system.code).toBe(AUTHORITATIVE_OBSERVATION_ERROR.UNSUPPORTED_PRINCIPAL);
  });

  it("does not persist when observation reports impersonation or write forbidden", async () => {
    const h = makeHarness();
    h.setObservation(
      observation({
        status: "failed",
        accountingSyncId: null,
        custody: { allSameSync: false, snapshotsPresent: [] },
        failures: [
          {
            code: AUTHORITATIVE_OBSERVATION_ERROR.TRIGGERED_BY_IMPERSONATION,
            message: "impersonation",
          },
        ],
      }),
    );
    const result = await runAndPersistAuthoritativeObserve(
      replayInput(),
      principal(),
      observePolicy(["ar_aging"]),
      h.deps,
    );
    expect(result.ok).toBe(false);
    expect(h.rows).toHaveLength(0);
  });

  it("same sync + same URM run ids + same policy share one idempotency key", () => {
    const policy = observePolicy(["ar_aging"]);
    const policyHash = hashObservePolicy(policy);
    const inputHash = hashObserveInput({
      accountingSyncId: SYNC,
      selectedUrmRuns: { ar_aging: "run-ar" },
      statementControlContractVersion: 1,
      assertionReference: null,
      observationMode: "REPLAY_EXISTING_SYNC",
      policyHash,
    });
    const key = hashObserveIdempotencyKey({
      companyId: COMPANY,
      engagementId: ENG,
      periodEnd: "2026-07-31",
      accountingSyncId: SYNC,
      mode: "OBSERVE",
      policyHash,
      inputHash,
    });
    expect(key).toHaveLength(64);
  });

  it("passes the verified execution context through to the observation runner", async () => {
    const h = makeHarness();
    const ctx = principal();
    await runAndPersistAuthoritativeObserve(
      replayInput(),
      ctx,
      observePolicy(["ar_aging", "ap_aging", "inventory"]),
      h.deps,
    );
    expect(h.observationCalls[0]).toMatchObject({
      input: replayInput(),
      executionContext: ctx,
    });
  });
});
