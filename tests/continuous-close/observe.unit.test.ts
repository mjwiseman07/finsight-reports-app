import { describe, expect, it } from "vitest";
import {
  CONTINUOUS_CLOSE_MODES,
  CONTINUOUS_CLOSE_RUN_STAGES,
  EXECUTABLE_CONTINUOUS_CLOSE_MODES,
  DEFAULT_OBSERVE_POLICY,
  assertContinuousCloseSyncIdentity,
  buildContinuousCloseMemorySummary,
  capabilityForMode,
  classifyContinuousCloseExceptions,
  composeContinuousCloseReadiness,
  isExecutableContinuousCloseMode,
  runObserveContinuousClose,
  type ContinuousCloseObserveInput,
} from "@/lib/continuous-close";
import type { StatementControlResult } from "@/lib/integrations/accounting/statement-control";

function passingControl(): StatementControlResult {
  const passLine = (key: StatementControlResult["balanceSheet"]["lines"][number]["key"], label: string) => ({
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
        passLine("total_assets", "Assets"),
        passLine("total_liabilities", "Liabilities"),
        passLine("total_equity", "Equity"),
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

function baseIdentity(provider: "quickbooks" | "xero"): ContinuousCloseObserveInput["identity"] {
  return {
    provider,
    tenantOrRealmId: provider === "quickbooks" ? "realm-1" : "tenant-1",
    companyId: "company-1",
    accountingConnectionId: "conn-1",
    accountingSyncId: "sync-1",
    firmClientId: "fc-1",
    closePeriodId: "cp-1",
  };
}

function baseInput(provider: "quickbooks" | "xero"): ContinuousCloseObserveInput {
  return {
    mode: "OBSERVE",
    identity: baseIdentity(provider),
    statementControl: passingControl(),
    statementControlContractVersion: 1,
    assertion: {
      summary: {
        totalPairs: 10,
        tested: 8,
        partial: 1,
        gap: 1,
        notApplicable: 0,
        gapRate: 0.1,
      },
      maxGapRate: 0.25,
    },
    urmSignals: [{ workpaperKind: "bank", outcome: "reconciled_exact" }],
    memoryRecords: [
      {
        memory_key: "cc.pattern.1",
        memory_type: "recurring_pattern",
        confidence_score: 0.8,
        persistence_status: "persisted",
        topic: "cash",
      },
    ],
  };
}

describe("Continuous Close mode / stage contracts", () => {
  it("declares the full mode spine and only OBSERVE as executable", () => {
    expect([...CONTINUOUS_CLOSE_MODES]).toEqual([
      "OBSERVE",
      "PROPOSE",
      "REVIEW_REQUIRED",
      "GOVERNED_AUTO",
    ]);
    expect([...EXECUTABLE_CONTINUOUS_CLOSE_MODES]).toEqual(["OBSERVE"]);
    expect(isExecutableContinuousCloseMode("OBSERVE")).toBe(true);
    expect(isExecutableContinuousCloseMode("GOVERNED_AUTO")).toBe(false);
  });

  it("keeps OBSERVE capabilities read/evaluate only", () => {
    const caps = capabilityForMode("OBSERVE");
    expect(caps.mayEvaluateControls).toBe(true);
    expect(caps.mayEmitObserveReceipt).toBe(true);
    expect(caps.mayAutoPostJournalEntries).toBe(false);
    expect(caps.mayWriteProviderErp).toBe(false);
    expect(caps.mayProposeRemediation).toBe(false);
  });

  it("defines the OBSERVE run stage order", () => {
    expect([...CONTINUOUS_CLOSE_RUN_STAGES]).toEqual([
      "ingest_sync",
      "evaluate_controls",
      "classify_exceptions",
      "compose_readiness",
      "summarize_memory",
      "emit_observe_receipt",
    ]);
  });
});

describe("sync identity rule", () => {
  it("fails closed when identity pieces are missing", () => {
    expect(assertContinuousCloseSyncIdentity({}).ok).toBe(false);
    expect(
      assertContinuousCloseSyncIdentity({
        tenantOrRealmId: "t",
        companyId: "c",
        accountingConnectionId: "conn",
        accountingSyncId: "sync",
      }).ok,
    ).toBe(true);
  });
});

describe("exception + readiness composition", () => {
  it("opens statement-control exceptions when required lines fail", () => {
    const control = passingControl();
    control.balanceSheet.lines = control.balanceSheet.lines.map((l) =>
      l.key === "cash" ? { ...l, passes: false, status: "fail", reason: "cash variance" } : l,
    );
    const exceptions = classifyContinuousCloseExceptions({
      policy: DEFAULT_OBSERVE_POLICY,
      statementControl: control,
      statementControlContractVersion: 1,
      assertion: null,
      urmSignals: [],
      syncIdentityOk: true,
      modeExecutable: true,
    });
    expect(exceptions.some((e) => e.code === "cc.statement_control.fail.cash")).toBe(true);
    expect(composeContinuousCloseReadiness(exceptions).state).toBe("controls_incomplete");
  });

  it("blocks on URM failed outcomes", () => {
    const exceptions = classifyContinuousCloseExceptions({
      policy: DEFAULT_OBSERVE_POLICY,
      statementControl: passingControl(),
      statementControlContractVersion: 1,
      assertion: null,
      urmSignals: [{ workpaperKind: "inventory_fa", outcome: "failed" }],
      syncIdentityOk: true,
      modeExecutable: true,
    });
    expect(composeContinuousCloseReadiness(exceptions).state).toBe("blocked");
  });
});

describe("memory summary", () => {
  it("summarizes records without requiring persistence writes", () => {
    const summary = buildContinuousCloseMemorySummary([
      {
        memory_key: "a",
        memory_type: "operational_note",
        confidence_score: 0.5,
        persistence_status: "pending",
        topic: "ar",
      },
      {
        memory_key: "b",
        memory_type: "recurring_pattern",
        confidence_score: 1,
        persistence_status: "persisted",
        topic: "ar",
      },
    ]);
    expect(summary.recordCount).toBe(2);
    expect(summary.persistedCount).toBe(1);
    expect(summary.topics).toEqual(["ar"]);
    expect(summary.highlightKeys[0]).toBe("b");
  });
});

describe("runObserveContinuousClose", () => {
  it("completes OBSERVE stages and emits a close receipt without provider writes", () => {
    const result = runObserveContinuousClose(baseInput("quickbooks"));
    expect(result.executable).toBe(true);
    expect(result.stagesCompleted).toEqual([...CONTINUOUS_CLOSE_RUN_STAGES]);
    expect(result.readiness.state).toBe("observe_ready");
    expect(result.receipt?.eventCategory).toBe("close");
    expect(result.receipt?.eventType).toBe("continuous_close.observe.completed");
    expect(result.providerWriteAttempted).toBe(false);
    expect(result.journalEntryPostAttempted).toBe(false);
  });

  it("QBO and Xero parity — same readiness path for both providers", () => {
    const qbo = runObserveContinuousClose(baseInput("quickbooks"));
    const xero = runObserveContinuousClose(baseInput("xero"));
    expect(qbo.readiness.state).toBe(xero.readiness.state);
    expect(qbo.stagesCompleted).toEqual(xero.stagesCompleted);
    expect(qbo.capability).toEqual(xero.capability);
    expect(qbo.receipt?.provider).toBe("quickbooks");
    expect(xero.receipt?.provider).toBe("xero");
    expect(qbo.providerWriteAttempted).toBe(false);
    expect(xero.providerWriteAttempted).toBe(false);
  });

  it("refuses non-executable modes without inventing write authority", () => {
    const result = runObserveContinuousClose({
      ...baseInput("xero"),
      mode: "GOVERNED_AUTO",
    });
    expect(result.executable).toBe(false);
    expect(result.receipt).toBeNull();
    expect(result.readiness.state).toBe("blocked");
    expect(result.capability.mayWriteProviderErp).toBe(false);
    expect(result.capability.mayAutoPostJournalEntries).toBe(false);
  });
});
