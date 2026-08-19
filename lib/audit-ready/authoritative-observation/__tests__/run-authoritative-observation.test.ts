import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { hashMeasurementSnapshotBody } from "@/lib/audit-ready/measurement-snapshots/hash";
import {
  CombinedAcquisitionPartialError,
  MEASUREMENT_SNAPSHOT_ERROR,
  TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
  type AccountingSyncForArSnapshot,
  type TieOutApMeasurementSnapshot,
  type TieOutArMeasurementSnapshot,
  type TieOutInventoryMeasurementSnapshot,
} from "@/lib/audit-ready/measurement-snapshots/types";
import type { ApResolverInput, ApResolverOutput } from "@/lib/audit-ready/tie-out/ap-resolver";
import type { ArResolverInput, ArResolverOutput } from "@/lib/audit-ready/tie-out/ar-resolver";
import type { InventoryResolverInput, InventoryResolverOutput } from "@/lib/audit-ready/tie-out/inventory-resolver";
import type { EngagementActor } from "@/lib/audit-ready/server-auth";
import { runAuthoritativeArApInventoryObservation } from "../run-authoritative-ar-ap-inventory-observation";
import type { AuthoritativeObservationDeps } from "../run-authoritative-ar-ap-inventory-observation";
import type {
  AuthoritativeObservationContext,
  AuthoritativeObservationExecutionContext,
  AuthoritativeObservationInput,
} from "../types";
import { AUTHORITATIVE_OBSERVATION_ERROR } from "../types";

const SYNC = "11111111-1111-4111-8111-111111111111";
const COMPANY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CONN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const OBS = "cccccccccccccccc-cccc-4ccc-8ccc-cccccccccccc";
const ACQ = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const policy = {
  policy_mode: "standard",
  auto_reconcile_max_dollar: 1,
  auto_reconcile_max_percent: 0.01,
  kickout_min_dollar: 50,
  kickout_min_percent: 0.05,
  authoritative_comparison: "tighter_of_both" as const,
};

function arSnapshot(): TieOutArMeasurementSnapshot {
  const payload = {
    currency: "USD",
    customers: [{ entityRef: "1", displayName: "Acme", totalCents: 10_000 }],
    subledgerTotalCents: 10_000,
    trialBalance: [
      {
        accountRef: "84",
        accountName: "Accounts Receivable",
        debitCents: 10_000,
        creditCents: 0,
        netCents: 10_000,
      },
    ],
  };
  return {
    schemaVersion: TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
    accountingSyncId: SYNC,
    accountingConnectionId: CONN,
    companyId: COMPANY,
    provider: "quickbooks",
    tenantOrRealmId: "realm-1",
    snapshotKind: "ar_aging",
    asOfDate: "2026-07-31",
    capturedAt: "2026-08-18T16:00:00.000Z",
    payloadHash: hashMeasurementSnapshotBody({
      schemaVersion: 1,
      snapshotKind: "ar_aging",
      asOfDate: "2026-07-31",
      payload,
    }),
    sourceRequestIds: {},
    payload,
  };
}

function apSnapshot(): TieOutApMeasurementSnapshot {
  const payload = {
    currency: "USD",
    vendors: [{ entityRef: "9", displayName: "Vendor A", totalCents: 8_000 }],
    subledgerTotalCents: 8_000,
    trialBalance: arSnapshot().payload.trialBalance,
  };
  return {
    ...arSnapshot(),
    snapshotKind: "ap_aging",
    payload,
    payloadHash: hashMeasurementSnapshotBody({
      schemaVersion: 1,
      snapshotKind: "ap_aging",
      asOfDate: "2026-07-31",
      payload,
    }),
  };
}

function inventorySnapshot(): TieOutInventoryMeasurementSnapshot {
  const payload = {
    currency: "USD",
    items: [
      {
        entityRef: "5",
        displayName: "Widget",
        quantityOnHand: 10,
        assetValueCents: 4_000,
      },
    ],
    subledgerTotalCents: 4_000,
    trialBalance: arSnapshot().payload.trialBalance,
  };
  return {
    ...arSnapshot(),
    snapshotKind: "inventory",
    payload,
    payloadHash: hashMeasurementSnapshotBody({
      schemaVersion: 1,
      snapshotKind: "inventory",
      asOfDate: "2026-07-31",
      payload,
    }),
  };
}

function parentSync(over: Partial<AccountingSyncForArSnapshot> = {}): AccountingSyncForArSnapshot {
  return {
    id: SYNC,
    company_id: COMPANY,
    connection_id: CONN,
    source_system: "quickbooks",
    tenant_id: "realm-1",
    report_period_end: "2026-07-31",
    validation_status: "SUCCESS",
    ...over,
  };
}

function context(): AuthoritativeObservationContext {
  return {
    engagementId: "eng-1",
    companyId: COMPANY,
    actor: {
      userId: "user-1",
      canRead: true,
      canWrite: true,
      scope: "company",
    },
    triggeredByUserId: "user-1",
    connectionId: CONN,
    provider: "quickbooks",
    tenantOrRealmId: "realm-1",
    periodEnd: "2026-07-31",
    reportPeriod: { startDate: "2026-07-01", endDate: "2026-07-31" },
    arAccountId: "84",
    apAccountId: "33",
    inventoryAccountId: "81",
    policy,
    pbcRequestIds: { ar: "pbc-ar", ap: "pbc-ap", inventory: "pbc-inv" },
    acquisitionConnection: {
      id: CONN,
      user_id: "user-1",
      provider: "quickbooks",
      tenant_or_realm_id: "realm-1",
      external_entity_id: "realm-1",
      external_entity_name: "Acme",
      access_token: "secret-token-must-not-leak",
      metadata_json: {},
    },
  };
}

function completedOutput(runId: string): ArResolverOutput {
  return {
    runId,
    status: "completed",
    totalsStatus: "tie",
    subledgerTotalCents: 1,
    glTotalCents: 1,
    totalsVarianceCents: 0,
    itemCount: 1,
    autoReconcileCount: 0,
    reviewCount: 0,
    kickoutCount: 0,
    durationMs: 1,
    measurementSource: "persisted_sync_snapshot",
    baselineSyncId: SYNC,
  };
}

function failedOutput(runId = ""): ArResolverOutput {
  return {
    ...completedOutput(runId),
    status: "failed",
    errorCode: "resolver_failed",
    errorMessage: "boom",
    measurementSource: "persisted_sync_snapshot",
    baselineSyncId: SYNC,
  };
}

function runRow(kind: string, runId: string) {
  return {
    id: runId,
    engagement_id: "eng-1",
    period_end: "2026-07-31",
    tie_out_kind: kind,
    status: "completed",
    baseline_sync_id: SYNC,
  };
}

function mockDeps(over: Partial<AuthoritativeObservationDeps> = {}) {
  const order: string[] = [];
  const acquireCombined = vi.fn(
    async (_input: {
      accountingSyncId?: string;
      asOfDate?: string;
      reportPeriod?: { startDate?: string; endDate?: string };
      userId?: string;
    }) => ({
      accountingSync: {
        syncId: SYNC,
        companyId: COMPANY,
        connectionId: CONN,
        tenantId: "realm-1",
        reportPeriodEnd: "2026-07-31",
      },
      arMeasurementSnapshot: arSnapshot(),
      apMeasurementSnapshot: apSnapshot(),
      inventoryMeasurementSnapshot: inventorySnapshot(),
      reusedArSnapshot: false,
      reusedApSnapshot: false,
      reusedInventorySnapshot: false,
      acquisitionId: ACQ,
    }),
  );
  const loadParentSync = vi.fn(async () => parentSync());
  const loadArSnapshot = vi.fn(async () => arSnapshot());
  const loadApSnapshot = vi.fn(async () => apSnapshot());
  const loadInventorySnapshot = vi.fn(async () => inventorySnapshot());
  const runAr = vi.fn(async (input: ArResolverInput): Promise<ArResolverOutput> => {
    order.push("ar");
    expect(input.measurement?.mode).toBe("persisted_snapshot");
    return completedOutput("run-ar");
  });
  const runAp = vi.fn(async (input: ApResolverInput): Promise<ApResolverOutput> => {
    order.push("ap");
    expect(input.measurement?.mode).toBe("persisted_snapshot");
    return completedOutput("run-ap");
  });
  const runInventory = vi.fn(
    async (input: InventoryResolverInput): Promise<InventoryResolverOutput> => {
      order.push("inventory");
      expect(input.measurement?.mode).toBe("persisted_snapshot");
      return completedOutput("run-inv");
    },
  );
  const loadTieOutRun = vi.fn(async (runId: string) => {
    if (runId === "run-ar") return runRow("ar_aging", runId);
    if (runId === "run-ap") return runRow("ap_aging", runId);
    if (runId === "run-inv") return runRow("inventory", runId);
    return null;
  });
  const selectCompletedForSync = vi.fn(
    async (
      args: { tieOutKind: string },
    ): Promise<{ id: string; baselineSyncId: string; completedAt: string } | null> => {
      if (args.tieOutKind === "ar_aging") {
        return { id: "run-ar", baselineSyncId: SYNC, completedAt: "2026-08-18T16:00:00.000Z" };
      }
      if (args.tieOutKind === "ap_aging") {
        return { id: "run-ap", baselineSyncId: SYNC, completedAt: "2026-08-18T16:00:01.000Z" };
      }
      return { id: "run-inv", baselineSyncId: SYNC, completedAt: "2026-08-18T16:00:02.000Z" };
    },
  );
  const base: AuthoritativeObservationDeps = {
    loadContext: async () => context(),
    acquireCombined: acquireCombined as AuthoritativeObservationDeps["acquireCombined"],
    loadParentSync,
    loadArSnapshot,
    loadApSnapshot,
    loadInventorySnapshot,
    runAr,
    runAp,
    runInventory,
    loadTieOutRun,
    selectCompletedForSync:
      selectCompletedForSync as AuthoritativeObservationDeps["selectCompletedForSync"],
    newObservationId: () => OBS,
  };
  return {
    deps: { ...base, ...over },
    order,
    acquireCombined,
    loadParentSync,
    loadArSnapshot,
    loadApSnapshot,
    loadInventorySnapshot,
    runAr,
    runAp,
    runInventory,
    loadTieOutRun,
    selectCompletedForSync,
  };
}

const freshInput: AuthoritativeObservationInput = {
  mode: "FRESH_CAPTURE",
  engagementId: "eng-1",
  triggerReason: "manual",
};

const replayInput: AuthoritativeObservationInput = {
  mode: "REPLAY_EXISTING_SYNC",
  engagementId: "eng-1",
  triggerReason: "manual",
  accountingSyncId: SYNC,
};

function verifiedUser(
  over: Partial<EngagementActor> = {},
): AuthoritativeObservationExecutionContext {
  return {
    principal: {
      type: "user",
      actor: {
        userId: "user-1",
        canRead: true,
        canWrite: true,
        scope: "company",
        ...over,
      },
    },
  };
}

function runObs(
  input: unknown,
  deps: Partial<AuthoritativeObservationDeps>,
  ctx: AuthoritativeObservationExecutionContext | null | undefined = verifiedUser(),
) {
  return runAuthoritativeArApInventoryObservation(
    input as AuthoritativeObservationInput,
    ctx as AuthoritativeObservationExecutionContext,
    deps,
  );
}

describe("authoritative observation mode contract", () => {
  it("1. mode is required", async () => {
    const { deps } = mockDeps();
    const result = await runObs(
      { engagementId: "eng-1", triggerReason: "manual" } as never,
      deps,
    );
    expect(result.status).toBe("failed");
    expect(result.failures[0]?.code).toBe(AUTHORITATIVE_OBSERVATION_ERROR.MODE_REQUIRED);
    expect(deps.acquireCombined).not.toHaveBeenCalled();
  });

  it("2. FRESH + accountingSyncId fails before provider fetch", async () => {
    const { deps, acquireCombined, runAr } = mockDeps();
    const result = await runObs(
      { ...freshInput, accountingSyncId: SYNC } as never,
      deps,
    );
    expect(result.status).toBe("failed");
    expect(result.failures[0]?.code).toBe(
      AUTHORITATIVE_OBSERVATION_ERROR.FRESH_SYNC_ID_FORBIDDEN,
    );
    expect(acquireCombined).not.toHaveBeenCalled();
    expect(runAr).not.toHaveBeenCalled();
  });

  it("3. REPLAY without accountingSyncId fails", async () => {
    const { deps, acquireCombined } = mockDeps();
    const result = await runObs(
      { ...replayInput, accountingSyncId: "" } as never,
      deps,
    );
    expect(result.status).toBe("failed");
    expect(result.failures[0]?.code).toBe(
      AUTHORITATIVE_OBSERVATION_ERROR.REPLAY_SYNC_ID_REQUIRED,
    );
    expect(acquireCombined).not.toHaveBeenCalled();
  });

  it("4-5. REPLAY does not call combined acquisition or provider fetch", async () => {
    const { deps, acquireCombined, runAr } = mockDeps();
    const result = await runObs(replayInput, deps);
    expect(result.status).toBe("completed");
    expect(acquireCombined).not.toHaveBeenCalled();
    expect(runAr).toHaveBeenCalled();
    expect(runAr.mock.calls[0]?.[0]?.accessToken).toBe("");
  });
});

describe("authoritative observation FRESH", () => {
  it("17-21. uses only combined AR+AP+Inventory acquisition and one new sync", async () => {
    const src = readFileSync(
      join(process.cwd(), "lib/audit-ready/authoritative-observation/run-authoritative-ar-ap-inventory-observation.ts"),
      "utf8",
    );
    expect(src).toContain("acquireAndPersistAccountingStateWithArApInventorySnapshots");
    expect(src).not.toContain("acquireAndPersistAccountingStateWithArSnapshot(");
    expect(src).not.toContain("acquireAndPersistAccountingStateWithArApSnapshots(");
    expect(src).not.toContain("fetchQbo");
    expect(src).not.toContain("ensureFreshTokens");

    const { deps, acquireCombined, loadParentSync } = mockDeps();
    const result = await runObs(freshInput, deps);
    expect(result.status).toBe("completed");
    expect(acquireCombined).toHaveBeenCalledTimes(1);
    expect(loadParentSync).not.toHaveBeenCalled();
    const firstAcquire = acquireCombined.mock.calls[0];
    if (!firstAcquire) throw new Error("combined acquisition was not called");
    const acquireArg = firstAcquire[0];
    expect(acquireArg.accountingSyncId).toBeUndefined();
    expect(acquireArg.asOfDate).toBe("2026-07-31");
    expect(acquireArg.reportPeriod?.endDate).toBe("2026-07-31");
    expect(acquireArg.userId).toBe("user-1");
    expect(result.accountingSyncId).toBe(SYNC);
    expect(result.custody.snapshotsPresent).toEqual([
      "ar_aging",
      "ap_aging",
      "inventory",
    ]);
    expect(result.custody.allSameSync).toBe(true);
    expect(result.periodEnd).toBe("2026-07-31");
    expect(result.acquisitionId).toBe(ACQ);
  });

  it("22. CombinedAcquisitionPartialError fails and does not call resolvers", async () => {
    const { deps, runAr, runAp, runInventory } = mockDeps({
      acquireCombined: async () => {
        throw new CombinedAcquisitionPartialError({
          code: MEASUREMENT_SNAPSHOT_ERROR.COMBINED_INVENTORY_SNAPSHOT_PERSIST_FAILED,
          message: "inventory missing",
          accountingSyncId: SYNC,
          arMeasurementSnapshot: arSnapshot(),
          apMeasurementSnapshot: apSnapshot(),
          inventoryMeasurementSnapshot: null,
        });
      },
    });
    const result = await runObs(freshInput, deps);
    expect(result.status).toBe("failed");
    expect(result.custody.snapshotsPresent).toEqual(["ar_aging", "ap_aging"]);
    expect(runAr).not.toHaveBeenCalled();
    expect(runAp).not.toHaveBeenCalled();
    expect(runInventory).not.toHaveBeenCalled();
    expect(result.reconciliations.ar?.status).toBe("not_run");
  });
});

describe("authoritative observation REPLAY", () => {
  it("23-32. loads exact sync, requires SUCCESS/company/connection/period/trio, zero provider reads", async () => {
    const { deps, acquireCombined, loadParentSync, loadArSnapshot, loadApSnapshot, loadInventorySnapshot, runAr } =
      mockDeps();
    const result = await runObs(replayInput, deps);
    expect(result.status).toBe("completed");
    expect(loadParentSync).toHaveBeenCalledWith(SYNC);
    expect(loadArSnapshot).toHaveBeenCalledWith({
      accountingSyncId: SYNC,
      asOfDate: "2026-07-31",
    });
    expect(loadApSnapshot).toHaveBeenCalled();
    expect(loadInventorySnapshot).toHaveBeenCalled();
    expect(acquireCombined).not.toHaveBeenCalled();
    expect(result.acquisitionId).toBeNull();
    expect(runAr.mock.calls[0]?.[0]?.accessToken).toBe("");
  });

  it("24. requires parent SUCCESS", async () => {
    const { deps, runAr } = mockDeps({
      loadParentSync: async () => parentSync({ validation_status: "FAILED" }),
    });
    const result = await runObs(replayInput, deps);
    expect(result.status).toBe("failed");
    expect(result.failures[0]?.code).toBe(
      AUTHORITATIVE_OBSERVATION_ERROR.REPLAY_PARENT_NOT_SUCCESS,
    );
    expect(runAr).not.toHaveBeenCalled();
  });

  it("25. requires parent company == engagement company", async () => {
    const { deps } = mockDeps({
      loadParentSync: async () =>
        parentSync({ company_id: "99999999-9999-4999-8999-999999999999" }),
    });
    const result = await runObs(replayInput, deps);
    expect(result.failures[0]?.code).toBe(
      AUTHORITATIVE_OBSERVATION_ERROR.REPLAY_PARENT_COMPANY_MISMATCH,
    );
  });

  it("26. requires connection match", async () => {
    const { deps } = mockDeps({
      loadParentSync: async () =>
        parentSync({ connection_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee" }),
    });
    const result = await runObs(replayInput, deps);
    expect(result.failures[0]?.code).toBe(
      AUTHORITATIVE_OBSERVATION_ERROR.REPLAY_PARENT_CONNECTION_MISMATCH,
    );
  });

  it("27. requires report_period_end == periodEnd", async () => {
    const { deps } = mockDeps({
      loadParentSync: async () => parentSync({ report_period_end: "2026-06-30" }),
    });
    const result = await runObs(replayInput, deps);
    expect(result.failures[0]?.code).toBe(
      AUTHORITATIVE_OBSERVATION_ERROR.REPLAY_PARENT_PERIOD_MISMATCH,
    );
  });

  it("28-31. missing snapshots fail closed without filling from provider", async () => {
    for (const [over, code] of [
      [{ loadArSnapshot: async () => null }, AUTHORITATIVE_OBSERVATION_ERROR.REPLAY_AR_SNAPSHOT_MISSING],
      [{ loadApSnapshot: async () => null }, AUTHORITATIVE_OBSERVATION_ERROR.REPLAY_AP_SNAPSHOT_MISSING],
      [
        { loadInventorySnapshot: async () => null },
        AUTHORITATIVE_OBSERVATION_ERROR.REPLAY_INVENTORY_SNAPSHOT_MISSING,
      ],
    ] as const) {
      const { deps, acquireCombined, runAr } = mockDeps(over);
      const result = await runObs(replayInput, deps);
      expect(result.status).toBe("failed");
      expect(result.failures[0]?.code).toBe(code);
      expect(acquireCombined).not.toHaveBeenCalled();
      expect(runAr).not.toHaveBeenCalled();
    }
  });
});

describe("authoritative observation resolver execution", () => {
  it("33-36. sequential AR→AP→Inventory persisted_snapshot with parent custody", async () => {
    const { deps, order, runAr, runAp, runInventory } = mockDeps();
    await runObs(replayInput, deps);
    expect(order).toEqual(["ar", "ap", "inventory"]);
    for (const fn of [runAr, runAp, runInventory]) {
      const input = fn.mock.calls[0]?.[0];
      if (!input) throw new Error("resolver was not called");
      expect(input.measurement?.mode).toBe("persisted_snapshot");
      expect(
        input.measurement && "snapshot" in input.measurement
          ? input.measurement.snapshot.accountingSyncId
          : null,
      ).toBe(SYNC);
      expect(input.companyId).toBe(COMPANY);
      expect(input.accountingConnectionId).toBe(CONN);
      expect(input.provider).toBe("quickbooks");
      expect(input.realmId).toBe("realm-1");
      expect(input.accessToken).toBe("");
      expect(input.triggeredByUserId).toBe("user-1");
    }
  });

  it("37. AP failure does not prevent Inventory attempt", async () => {
    const wired = mockDeps();
    wired.runAp.mockResolvedValue(failedOutput("run-ap"));
    const { deps } = wired;
    const result = await runObs(replayInput, deps);
    expect(wired.runAr).toHaveBeenCalled();
    expect(wired.runAp).toHaveBeenCalled();
    expect(wired.runInventory).toHaveBeenCalled();
    expect(wired.runAr.mock.invocationCallOrder[0]).toBeLessThan(
      wired.runAp.mock.invocationCallOrder[0],
    );
    expect(wired.runAp.mock.invocationCallOrder[0]).toBeLessThan(
      wired.runInventory.mock.invocationCallOrder[0],
    );
    expect(result.status).toBe("partial");
    expect(result.reconciliations.ar?.authoritative).toBe(true);
    expect(result.reconciliations.ap?.authoritative).toBe(false);
    expect(result.reconciliations.inventory?.authoritative).toBe(true);
  });

  it("38. AR failure does not prevent AP/Inventory attempts", async () => {
    const wired = mockDeps();
    wired.runAr.mockResolvedValue(failedOutput());
    const { deps } = wired;
    const result = await runObs(replayInput, deps);
    expect(wired.runAr).toHaveBeenCalled();
    expect(wired.runAp).toHaveBeenCalled();
    expect(wired.runInventory).toHaveBeenCalled();
    expect(wired.runAr.mock.invocationCallOrder[0]).toBeLessThan(
      wired.runAp.mock.invocationCallOrder[0],
    );
    expect(wired.runAp.mock.invocationCallOrder[0]).toBeLessThan(
      wired.runInventory.mock.invocationCallOrder[0],
    );
    expect(result.status).toBe("partial");
    expect(result.reconciliations.ar?.authoritative).toBe(false);
    expect(result.reconciliations.ap?.authoritative).toBe(true);
    expect(result.reconciliations.inventory?.authoritative).toBe(true);
  });
});

describe("authoritative observation verification", () => {
  it("39-42. completed slots require baseline + persisted_sync_snapshot", async () => {
    const wired = mockDeps();
    wired.runAr.mockResolvedValue({
      ...completedOutput("run-ar"),
      baselineSyncId: "00000000-0000-4000-8000-000000000000",
    });
    const { deps } = wired;
    const result = await runObs(replayInput, deps);
    expect(result.reconciliations.ar?.authoritative).toBe(false);
    expect(result.failures.some((f) => f.code === AUTHORITATIVE_OBSERVATION_ERROR.BASELINE_SYNC_MISMATCH)).toBe(
      true,
    );
  });

  it("42. measurementSource must be persisted_sync_snapshot", async () => {
    const wired = mockDeps();
    wired.runAp.mockResolvedValue({
      ...completedOutput("run-ap"),
      measurementSource: "live_provider",
    });
    const { deps } = wired;
    const result = await runObs(replayInput, deps);
    expect(result.reconciliations.ap?.authoritative).toBe(false);
    expect(
      result.failures.some((f) => f.code === AUTHORITATIVE_OBSERVATION_ERROR.MEASUREMENT_SOURCE_INVALID),
    ).toBe(true);
  });

  it("43. DB run row engagement mismatch is verification failure", async () => {
    const wired = mockDeps();
    wired.loadTieOutRun.mockImplementation(async (runId: string) => {
      const row = runId === "run-ar" ? runRow("ar_aging", runId) : runRow(
        runId === "run-ap" ? "ap_aging" : "inventory",
        runId,
      );
      return runId === "run-ar" ? { ...row, engagement_id: "eng-other" } : row;
    });
    const result = await runObs(replayInput, wired.deps);
    expect(result.reconciliations.ar?.authoritative).toBe(false);
    expect(
      result.failures.some((f) => f.code === AUTHORITATIVE_OBSERVATION_ERROR.RUN_ENGAGEMENT_MISMATCH),
    ).toBe(true);
  });

  it("44. DB run row period mismatch is verification failure", async () => {
    const wired = mockDeps();
    wired.loadTieOutRun.mockImplementation(async (runId: string) => {
      const kind = runId === "run-ar" ? "ar_aging" : runId === "run-ap" ? "ap_aging" : "inventory";
      const row = runRow(kind, runId);
      return runId === "run-ap" ? { ...row, period_end: "2026-06-30" } : row;
    });
    const result = await runObs(replayInput, wired.deps);
    expect(result.reconciliations.ap?.authoritative).toBe(false);
    expect(
      result.failures.some((f) => f.code === AUTHORITATIVE_OBSERVATION_ERROR.RUN_PERIOD_MISMATCH),
    ).toBe(true);
  });

  it("45. DB run row kind mismatch is verification failure", async () => {
    const wired = mockDeps();
    wired.loadTieOutRun.mockImplementation(async (runId: string) => {
      const kind = runId === "run-inv" ? "ar_aging" : runId === "run-ar" ? "ar_aging" : "ap_aging";
      return runRow(kind, runId);
    });
    const result = await runObs(replayInput, wired.deps);
    expect(result.reconciliations.inventory?.authoritative).toBe(false);
    expect(
      result.failures.some((f) => f.code === AUTHORITATIVE_OBSERVATION_ERROR.RUN_KIND_MISMATCH),
    ).toBe(true);
  });

  it("46. selector null is verification failure", async () => {
    const wired = mockDeps();
    wired.selectCompletedForSync.mockImplementation(async (args: { tieOutKind: string }) => {
      if (args.tieOutKind === "ar_aging") return null;
      if (args.tieOutKind === "ap_aging") {
        return { id: "run-ap", baselineSyncId: SYNC, completedAt: "t" };
      }
      return { id: "run-inv", baselineSyncId: SYNC, completedAt: "t" };
    });
    const result = await runObs(replayInput, wired.deps);
    expect(result.reconciliations.ar?.authoritative).toBe(false);
    expect(result.failures.some((f) => f.code === AUTHORITATIVE_OBSERVATION_ERROR.SELECTOR_NULL)).toBe(
      true,
    );
  });

  it("47-48. selector different runId / old completed run cannot validate new failed replay", async () => {
    const wired = mockDeps();
    wired.selectCompletedForSync.mockImplementation(async (args: { tieOutKind: string }) => {
      if (args.tieOutKind === "ar_aging") {
        return { id: "old-run-ar", baselineSyncId: SYNC, completedAt: "t" };
      }
      if (args.tieOutKind === "ap_aging") {
        return { id: "run-ap", baselineSyncId: SYNC, completedAt: "t" };
      }
      return { id: "run-inv", baselineSyncId: SYNC, completedAt: "t" };
    });
    const mismatch = await runObs(replayInput, wired.deps);
    expect(mismatch.reconciliations.ar?.authoritative).toBe(false);
    expect(
      mismatch.failures.some((f) => f.code === AUTHORITATIVE_OBSERVATION_ERROR.SELECTOR_RUN_MISMATCH),
    ).toBe(true);

    const failedReplay = mockDeps();
    failedReplay.runAr.mockResolvedValue(failedOutput("new-failed-ar"));
    failedReplay.selectCompletedForSync.mockImplementation(async (args: { tieOutKind: string }) => {
      if (args.tieOutKind === "ar_aging") {
        return { id: "old-run-ar", baselineSyncId: SYNC, completedAt: "t" };
      }
      if (args.tieOutKind === "ap_aging") {
        return { id: "run-ap", baselineSyncId: SYNC, completedAt: "t" };
      }
      return { id: "run-inv", baselineSyncId: SYNC, completedAt: "t" };
    });
    const result = await runObs(replayInput, failedReplay.deps);
    expect(result.reconciliations.ar?.authoritative).toBe(false);
    expect(result.reconciliations.ar?.runId).not.toBe("old-run-ar");
    expect(result.status).toBe("partial");
  });
});

describe("authoritative observation status", () => {
  it("49. all three authoritative → completed", async () => {
    const { deps } = mockDeps();
    const result = await runObs(freshInput, deps);
    expect(result.status).toBe("completed");
    expect(result.reconciliations.ar?.authoritative).toBe(true);
    expect(result.reconciliations.ap?.authoritative).toBe(true);
    expect(result.reconciliations.inventory?.authoritative).toBe(true);
  });

  it("50. one authoritative + one failure → partial", async () => {
    const wired = mockDeps();
    wired.runAp.mockResolvedValue(failedOutput("run-ap"));
    wired.runInventory.mockResolvedValue(failedOutput("run-inv"));
    const { deps } = wired;
    const result = await runObs(replayInput, deps);
    expect(result.status).toBe("partial");
  });

  it("51. two authoritative + one failure → partial", async () => {
    const wired = mockDeps();
    wired.runInventory.mockResolvedValue(failedOutput("run-inv"));
    const { deps } = wired;
    const result = await runObs(replayInput, deps);
    expect(result.status).toBe("partial");
  });

  it("52. all three resolver attempts fail → failed", async () => {
    const wired = mockDeps();
    wired.runAr.mockResolvedValue(failedOutput());
    wired.runAp.mockResolvedValue(failedOutput());
    wired.runInventory.mockResolvedValue(failedOutput());
    const { deps } = wired;
    const result = await runObs(replayInput, deps);
    expect(result.status).toBe("failed");
  });

  it("53. snapshot trio incomplete → failed", async () => {
    const { deps } = mockDeps({
      acquireCombined: async () => {
        throw new CombinedAcquisitionPartialError({
          code: MEASUREMENT_SNAPSHOT_ERROR.COMBINED_AR_SNAPSHOT_PERSIST_FAILED,
          message: "ar missing",
          accountingSyncId: SYNC,
        });
      },
    });
    const result = await runObs(freshInput, deps);
    expect(result.status).toBe("failed");
  });
});

describe("authoritative observation result safety", () => {
  it("54-58. no tokens, observationId distinct, FRESH acquisitionId / REPLAY none", async () => {
    const { deps } = mockDeps();
    const fresh = await runObs(freshInput, deps);
    const json = JSON.stringify(fresh);
    expect(json).not.toMatch(/secret-token/i);
    expect(json).not.toMatch(/access_token/i);
    expect(json).not.toMatch(/authorization/i);
    expect(fresh.observationId).toBe(OBS);
    expect(fresh.observationId).not.toBe(fresh.accountingSyncId);
    expect(fresh.acquisitionId).toBe(ACQ);

    const replay = await runObs(replayInput, deps);
    expect(replay.acquisitionId).toBeNull();
    expect(JSON.stringify(replay)).not.toMatch(/access_token/i);
  });
});

describe("authoritative observation authentic actor", () => {
  it("rejects leftover triggeredByUserId that is not the verified actor", async () => {
    const { deps, acquireCombined, runAr } = mockDeps();
    const result = await runObs(
      { ...freshInput, triggeredByUserId: "other-user" } as never,
      deps,
      verifiedUser({ userId: "user-1" }),
    );
    expect(result.status).toBe("failed");
    expect(result.failures[0]?.code).toBe(
      AUTHORITATIVE_OBSERVATION_ERROR.TRIGGERED_BY_IMPERSONATION,
    );
    expect(acquireCombined).not.toHaveBeenCalled();
    expect(runAr).not.toHaveBeenCalled();
  });

  it("cannot execute from a raw user id / missing executionContext", async () => {
    const { deps, acquireCombined } = mockDeps();
    const missing = await runAuthoritativeArApInventoryObservation(
      freshInput,
      undefined as never,
      deps,
    );
    expect(missing.status).toBe("failed");
    expect(missing.failures[0]?.code).toBe(
      AUTHORITATIVE_OBSERVATION_ERROR.AUTHENTICATED_ACTOR_REQUIRED,
    );

    const rawOwnerOnly = await runAuthoritativeArApInventoryObservation(
      { ...freshInput, triggeredByUserId: "company-owner-id" } as never,
      undefined as never,
      deps,
    );
    expect(rawOwnerOnly.status).toBe("failed");
    expect(rawOwnerOnly.failures[0]?.code).toBe(
      AUTHORITATIVE_OBSERVATION_ERROR.AUTHENTICATED_ACTOR_REQUIRED,
    );
    expect(acquireCombined).not.toHaveBeenCalled();
  });

  it("verified actor A plus leftover user B fails closed", async () => {
    const { deps, acquireCombined } = mockDeps();
    const result = await runObs(
      { ...freshInput, triggeredByUserId: "user-b" } as never,
      deps,
      verifiedUser({ userId: "user-a" }),
    );
    expect(result.failures[0]?.code).toBe(
      AUTHORITATIVE_OBSERVATION_ERROR.TRIGGERED_BY_IMPERSONATION,
    );
    expect(acquireCombined).not.toHaveBeenCalled();
  });

  it("leftover company-owner id does not grant owner authority", async () => {
    const { deps, acquireCombined } = mockDeps();
    const result = await runObs(
      { ...freshInput, triggeredByUserId: "company-owner-id" } as never,
      deps,
      verifiedUser({ userId: "attacker-1", canWrite: true, scope: "company" }),
    );
    expect(result.failures[0]?.code).toBe(
      AUTHORITATIVE_OBSERVATION_ERROR.TRIGGERED_BY_IMPERSONATION,
    );
    expect(acquireCombined).not.toHaveBeenCalled();
  });

  it("leftover super-admin id does not grant super-admin authority", async () => {
    const { deps, acquireCombined } = mockDeps();
    const result = await runObs(
      { ...freshInput, triggeredByUserId: "super-admin-id" } as never,
      deps,
      verifiedUser({ userId: "attacker-1", canWrite: true, scope: "company" }),
    );
    expect(result.failures[0]?.code).toBe(
      AUTHORITATIVE_OBSERVATION_ERROR.TRIGGERED_BY_IMPERSONATION,
    );
    expect(acquireCombined).not.toHaveBeenCalled();
  });

  it("verified company writer is allowed", async () => {
    const { deps } = mockDeps();
    const result = await runObs(
      freshInput,
      deps,
      verifiedUser({ userId: "company-writer", canWrite: true, scope: "company" }),
    );
    expect(result.status).toBe("completed");
  });

  it("verified firm writer is allowed", async () => {
    const { deps } = mockDeps();
    const result = await runObs(
      replayInput,
      deps,
      verifiedUser({ userId: "firm-writer", canWrite: true, scope: "firm" }),
    );
    expect(result.status).toBe("completed");
  });

  it("verified read-only member is rejected", async () => {
    const { deps, acquireCombined } = mockDeps();
    const result = await runObs(
      freshInput,
      deps,
      verifiedUser({ userId: "reader-1", canRead: true, canWrite: false, scope: "company" }),
    );
    expect(result.status).toBe("failed");
    expect(result.failures[0]?.code).toBe(AUTHORITATIVE_OBSERVATION_ERROR.WRITE_FORBIDDEN);
    expect(acquireCombined).not.toHaveBeenCalled();
  });

  it("system principal and scheduled metadata cannot impersonate a human", async () => {
    const { deps, acquireCombined } = mockDeps();
    const system = await runObs(freshInput, deps, {
      principal: { type: "system", service: "scheduler" },
    });
    expect(system.failures[0]?.code).toBe(
      AUTHORITATIVE_OBSERVATION_ERROR.UNSUPPORTED_PRINCIPAL,
    );
    const scheduled = await runObs(
      { ...freshInput, triggerReason: "scheduled" },
      deps,
      { principal: { type: "system", service: "cron" } },
    );
    expect(scheduled.failures[0]?.code).toBe(
      AUTHORITATIVE_OBSERVATION_ERROR.UNSUPPORTED_PRINCIPAL,
    );
    expect(acquireCombined).not.toHaveBeenCalled();
  });

  it("FRESH acquisition and resolvers use verified actor.userId", async () => {
    const wired = mockDeps({
      loadContext: async (_input, executionContext) => {
        const actor =
          executionContext.principal.type === "user"
            ? executionContext.principal.actor
            : context().actor;
        return {
          ...context(),
          actor,
          triggeredByUserId: actor.userId,
        };
      },
    });
    const result = await runObs(
      freshInput,
      wired.deps,
      verifiedUser({ userId: "verified-writer" }),
    );
    expect(result.status).toBe("completed");
    expect(wired.acquireCombined.mock.calls[0]?.[0]?.userId).toBe("verified-writer");
    expect(wired.runAr.mock.calls[0]?.[0]?.triggeredByUserId).toBe("verified-writer");
    expect(wired.runAp.mock.calls[0]?.[0]?.triggeredByUserId).toBe("verified-writer");
    expect(wired.runInventory.mock.calls[0]?.[0]?.triggeredByUserId).toBe(
      "verified-writer",
    );
  });

  it("REPLAY remains zero-provider and does not mint a sync", async () => {
    const { deps, acquireCombined } = mockDeps();
    const result = await runObs(replayInput, deps, verifiedUser());
    expect(result.status).toBe("completed");
    expect(acquireCombined).not.toHaveBeenCalled();
    expect(result.acquisitionId).toBeNull();
    expect(result.mode).toBe("REPLAY_EXISTING_SYNC");
  });

  it("getEngagementActor still starts from requireAuditReadyUser()", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/audit-ready/server-auth.ts"),
      "utf8",
    );
    expect(src).toContain("export async function getEngagementActor");
    expect(src).toContain("const auth = await requireAuditReadyUser()");
    expect(src).toContain("resolveEngagementActorForVerifiedUser");
    expect(src).not.toContain("resolveEngagementActorForUser(");
    expect(src).toContain("This is NOT authentication");
  });
});
