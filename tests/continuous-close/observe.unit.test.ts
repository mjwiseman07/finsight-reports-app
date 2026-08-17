import { describe, expect, it } from "vitest";
import {
  CONTINUOUS_CLOSE_MODES,
  CONTINUOUS_CLOSE_RUN_STAGES,
  DEFAULT_OBSERVE_POLICY,
  EXECUTABLE_CONTINUOUS_CLOSE_MODES,
  assertContinuousCloseSyncIdentity,
  buildContinuousCloseMemoryReadyAccountingSummary,
  capabilityForMode,
  classifyContinuousCloseExceptions,
  composeContinuousCloseReadiness,
  isExecutableContinuousCloseMode,
  isMaterialResidualBlocked,
  runObserveContinuousClose,
  type ContinuousCloseObserveInput,
  type ContinuousCloseObservePolicy,
} from "@/lib/continuous-close";
import type { StatementControlResult } from "@/lib/integrations/accounting/statement-control";

function passingControl(): StatementControlResult {
  const passLine = (
    key: StatementControlResult["balanceSheet"]["lines"][number]["key"],
    label: string,
  ) => ({
    key,
    label,
    nativeAmount: 100,
    canonicalAmount: 100,
    variance: 0,
    varianceAbs: 0,
    toleranceDollar: 0.01,
    status: "tie" as const,
    passes: true,
    reason: "tie",
  });

  return {
    computedAt: "2026-08-17T00:00:00.000Z",
    toleranceDollar: 0.01,
    nativeSource: null,
    nativeBalanceSheetReportRef: null,
    nativeProfitAndLossReportRef: null,
    periodAligned: true,
    periodMismatchReason: null,
    balanceSheet: {
      lines: [
        passLine("cash", "Cash"),
        passLine("ar", "AR"),
        passLine("bs_equation", "BS equation"),
      ],
      passes: true,
      equationPasses: true,
    },
    incomeStatement: {
      lines: [passLine("net_income", "Net income")],
      passes: true,
    },
    cashControlPasses: true,
    arControlPasses: true,
    netProfitMarginControlPasses: true,
    operatingGrossMarginControlPasses: true,
    overallPasses: true,
  };
}

function baseInput(provider: "quickbooks" | "xero"): ContinuousCloseObserveInput {
  return {
    mode: "OBSERVE",
    run: {
      runId: `run-${provider}-1`,
      closePeriodId: "cp-1",
      firmClientId: "fc-1",
      periodStart: "2026-07-01",
      periodEnd: "2026-07-31",
      observedAt: "2026-08-17T12:00:00.000Z",
    },
    sync: {
      provider,
      tenantOrRealmId: provider === "quickbooks" ? "realm-1" : "tenant-1",
      companyId: "company-1",
      accountingConnectionId: "conn-1",
      accountingSyncId: "sync-1",
      syncedAt: "2026-08-17T11:00:00.000Z",
    },
    statementControl: passingControl(),
    statementControlContractVersion: 1,
    assertion: {
      summary: {
        totalPairs: 10,
        tested: 10,
        partial: 0,
        gap: 0,
        notApplicable: 0,
        gapRate: 0,
      },
    },
    urmInputs: [
      {
        workpaperId: "urm-bank-1",
        workpaperKind: "bank",
        required: true,
        outcome: "reconciled_exact",
        unidentifiedResidualCents: 0,
        materialityThresholdCents: 10000,
      },
    ],
    priorMemoryContext: {
      recordCount: 2,
      highlightKeys: ["prior.key.1"],
    },
  };
}

describe("Continuous Close mode / stage contracts", () => {
  it("declares full mode spine with OBSERVE executable only", () => {
    expect([...CONTINUOUS_CLOSE_MODES]).toEqual([
      "OBSERVE",
      "PROPOSE",
      "REVIEW_REQUIRED",
      "GOVERNED_AUTO",
    ]);
    expect([...EXECUTABLE_CONTINUOUS_CLOSE_MODES]).toEqual(["OBSERVE"]);
    expect(isExecutableContinuousCloseMode("OBSERVE")).toBe(true);
    expect(isExecutableContinuousCloseMode("PROPOSE")).toBe(false);
  });

  it("keeps OBSERVE non-writing", () => {
    const caps = capabilityForMode("OBSERVE");
    expect(caps.mayWriteProviderErp).toBe(false);
    expect(caps.mayAutoPostJournalEntries).toBe(false);
    expect(caps.mayProposeRemediation).toBe(false);
  });

  it("keeps default policy free of universal KPI hardcodes and gap %", () => {
    expect(DEFAULT_OBSERVE_POLICY.statementControlRequiredKeys).toEqual([]);
    expect(DEFAULT_OBSERVE_POLICY.assertion.blockGapRate).toBeNull();
    expect(DEFAULT_OBSERVE_POLICY.urm.requiredBlockOutcomes).toContain("open_material");
    expect(DEFAULT_OBSERVE_POLICY.urm.requiredBlockOutcomes).toContain("provider_action_required");
  });

  it("defines OBSERVE run stages", () => {
    expect([...CONTINUOUS_CLOSE_RUN_STAGES]).toHaveLength(6);
  });
});

describe("fail-closed material / required controls", () => {
  it("blocks open_material on required recon", () => {
    const exceptions = classifyContinuousCloseExceptions({
      policy: DEFAULT_OBSERVE_POLICY,
      statementControl: passingControl(),
      statementControlContractVersion: 1,
      assertion: null,
      urmInputs: [
        {
          workpaperId: "urm-1",
          workpaperKind: "bank",
          required: true,
          outcome: "open_material",
          unidentifiedResidualCents: 50000,
          materialityThresholdCents: 10000,
        },
      ],
      syncIdentityOk: true,
      modeExecutable: true,
    });
    expect(composeContinuousCloseReadiness(exceptions).state).toBe("BLOCKED");
    expect(exceptions.some((e) => e.disposition === "block")).toBe(true);
  });

  it("blocks material residual even when outcome is not open_material", () => {
    expect(
      isMaterialResidualBlocked({
        outcome: "open_review",
        unidentifiedResidualCents: 25000,
        materialityThresholdCents: 10000,
      }),
    ).toBe(true);
  });

  it("blocks required statement-control failures", () => {
    const policy: ContinuousCloseObservePolicy = {
      ...DEFAULT_OBSERVE_POLICY,
      statementControlRequiredKeys: ["cash"],
    };
    const control = passingControl();
    control.balanceSheet.lines = control.balanceSheet.lines.map((l) =>
      l.key === "cash" ? { ...l, passes: false, status: "fail", reason: "cash variance" } : l,
    );
    const exceptions = classifyContinuousCloseExceptions({
      policy,
      statementControl: control,
      statementControlContractVersion: 1,
      assertion: null,
      urmInputs: [],
      syncIdentityOk: true,
      modeExecutable: true,
    });
    expect(exceptions.find((e) => e.source === "cash")?.disposition).toBe("block");
    expect(composeContinuousCloseReadiness(exceptions).state).toBe("BLOCKED");
  });

  it("provider_action_required blocks when required, reviews when optional", () => {
    const required = classifyContinuousCloseExceptions({
      policy: DEFAULT_OBSERVE_POLICY,
      statementControl: null,
      statementControlContractVersion: 0,
      assertion: null,
      urmInputs: [
        {
          workpaperId: "urm-req",
          workpaperKind: "ar",
          required: true,
          outcome: "provider_action_required",
          unidentifiedResidualCents: null,
          materialityThresholdCents: null,
        },
      ],
      syncIdentityOk: true,
      modeExecutable: true,
    });
    expect(composeContinuousCloseReadiness(required).state).toBe("BLOCKED");

    const optional = classifyContinuousCloseExceptions({
      policy: DEFAULT_OBSERVE_POLICY,
      statementControl: null,
      statementControlContractVersion: 0,
      assertion: null,
      urmInputs: [
        {
          workpaperId: "urm-opt",
          workpaperKind: "ar",
          required: false,
          outcome: "provider_action_required",
          unidentifiedResidualCents: null,
          materialityThresholdCents: null,
        },
      ],
      syncIdentityOk: true,
      modeExecutable: true,
    });
    expect(composeContinuousCloseReadiness(optional).state).toBe("READY_WITH_REVIEW");
  });
});

describe("memory-ready accounting summary", () => {
  it("centers period/provider/sync/readiness/blockers/recon/assertion — not prior Memory stats", () => {
    const readiness = { state: "READY" as const, blockerCodes: [], reviewCodes: [] };
    const summary = buildContinuousCloseMemoryReadyAccountingSummary({
      run: baseInput("quickbooks").run,
      sync: baseInput("quickbooks").sync,
      readiness,
      exceptions: [],
      urmInputs: baseInput("quickbooks").urmInputs,
      assertion: baseInput("quickbooks").assertion,
      capability: {
        statementControl: "available",
        assertions: "available",
        urm: "available",
        memoryContext: "available",
      },
      freshness: {
        accountingSyncId: "sync-1",
        syncedAt: "2026-08-17T11:00:00.000Z",
        maxAgeHours: null,
        isStale: false,
      },
      priorMemoryContext: { recordCount: 9, highlightKeys: ["x"] },
    });
    expect(summary.readiness).toBe("READY");
    expect(summary.provider).toBe("quickbooks");
    expect(summary.sync.accountingSyncId).toBe("sync-1");
    expect(summary.reconOutcomes[0]?.outcome).toBe("reconciled_exact");
    expect(summary.assertionState?.gap).toBe(0);
    expect(summary.priorMemoryContext?.recordCount).toBe(9);
    expect(summary).not.toHaveProperty("averageConfidence");
  });
});

describe("runObserveContinuousClose", () => {
  it("returns READY product readiness without writes", () => {
    const result = runObserveContinuousClose(baseInput("xero"));
    expect(result.readiness.state).toBe("READY");
    expect(result.receipt?.readinessState).toBe("READY");
    expect(result.providerWriteAttempted).toBe(false);
    expect(result.journalEntryPostAttempted).toBe(false);
    expect(result.memoryWriteAttempted).toBe(false);
    expect(result.memoryReadyAccountingSummary.period.runId).toBe("run-xero-1");
  });

  it("QBO/Xero parity for readiness path", () => {
    const qbo = runObserveContinuousClose(baseInput("quickbooks"));
    const xero = runObserveContinuousClose(baseInput("xero"));
    expect(qbo.readiness.state).toBe(xero.readiness.state);
    expect(qbo.stagesCompleted).toEqual(xero.stagesCompleted);
    expect(qbo.capability).toEqual(xero.capability);
  });

  it("separates sync identity from run/period identity", () => {
    expect(assertContinuousCloseSyncIdentity(baseInput("quickbooks").sync).ok).toBe(true);
    const result = runObserveContinuousClose(baseInput("quickbooks"));
    expect(result.receipt?.runId).toBe("run-quickbooks-1");
    expect(result.receipt?.accountingSyncId).toBe("sync-1");
    expect(result.memoryReadyAccountingSummary.period.closePeriodId).toBe("cp-1");
  });
});
