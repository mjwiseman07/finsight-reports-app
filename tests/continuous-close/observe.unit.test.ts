import { describe, expect, it } from "vitest";
import {
  DEFAULT_OBSERVE_POLICY,
  evaluateContinuousCloseFreshness,
  runObserveContinuousClose,
  validateObservePolicy,
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
      lines: [passLine("cash", "Cash"), passLine("bs_equation", "BS")],
      passes: true,
      equationPasses: true,
    },
    incomeStatement: {
      lines: [passLine("net_income", "NI")],
      passes: true,
    },
    cashControlPasses: true,
    arControlPasses: true,
    netProfitMarginControlPasses: true,
    operatingGrossMarginControlPasses: true,
    overallPasses: true,
  };
}

function engagedPolicy(): ContinuousCloseObservePolicy {
  return {
    ...DEFAULT_OBSERVE_POLICY,
    statementControlRequiredKeys: ["cash"],
    requiredReconKinds: ["bank"],
  };
}

function urmBank(overrides: Partial<ContinuousCloseObserveInput["urmInputs"][number]> = {}) {
  return {
    workpaperId: "urm-bank-1",
    workpaperKind: "bank",
    required: true,
    outcome: "reconciled_exact" as const,
    unidentifiedResidualCents: 0,
    materialityThresholdCents: 10000,
    grossVarianceCents: 5000,
    identifiedTotalCents: 5000,
    evidenceCount: 2,
    sourceAccountingSyncId: "sync-1",
    asOfDate: "2026-07-31",
    urmRunId: "urm-run-1",
    ...overrides,
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
        totalPairs: 8,
        tested: 8,
        partial: 0,
        gap: 0,
        notApplicable: 0,
        gapRate: 0,
      },
    },
    urmInputs: [urmBank()],
    priorMemoryContext: { recordCount: 1, highlightKeys: ["k1"] },
  };
}

describe("policy validation fail-closed", () => {
  it("rejects empty required controls", () => {
    expect(validateObservePolicy(DEFAULT_OBSERVE_POLICY)).toEqual({
      ok: false,
      reason: "no_required_controls_configured",
    });
    expect(validateObservePolicy(engagedPolicy()).ok).toBe(true);
  });

  it("BLOCKS when no required controls configured even if inputs look clean", () => {
    const result = runObserveContinuousClose(baseInput("xero"), DEFAULT_OBSERVE_POLICY);
    expect(result.readiness.state).toBe("BLOCKED");
    expect(result.exceptions.some((e) => e.exceptionClass === "policy_invalid")).toBe(true);
  });
});

describe("freshness unknown fail-closed", () => {
  it("marks unknown when gated without syncedAt", () => {
    const freshness = evaluateContinuousCloseFreshness(
      {
        provider: "quickbooks",
        tenantOrRealmId: "r",
        companyId: "c",
        accountingConnectionId: "conn",
        accountingSyncId: "sync-1",
        syncedAt: null,
      },
      24,
    );
    expect(freshness.status).toBe("unknown");
    expect(freshness.isStale).toBe(false);
  });

  it("invalid syncedAt → unknown (not stale)", () => {
    const freshness = evaluateContinuousCloseFreshness(
      {
        provider: "quickbooks",
        tenantOrRealmId: "r",
        companyId: "c",
        accountingConnectionId: "conn",
        accountingSyncId: "sync-1",
        syncedAt: "not-a-date",
      },
      24,
    );
    expect(freshness.status).toBe("unknown");
    expect(freshness.isStale).toBe(false);
  });

  it("valid old syncedAt → stale", () => {
    const freshness = evaluateContinuousCloseFreshness(
      {
        provider: "xero",
        tenantOrRealmId: "t",
        companyId: "c",
        accountingConnectionId: "conn",
        accountingSyncId: "sync-1",
        syncedAt: "2020-01-01T00:00:00.000Z",
      },
      24,
    );
    expect(freshness.status).toBe("stale");
    expect(freshness.isStale).toBe(true);
  });

  it("BLOCKS on unknown freshness (missing syncedAt)", () => {
    const input = baseInput("quickbooks");
    input.sync.syncedAt = null;
    const result = runObserveContinuousClose(input, {
      ...engagedPolicy(),
      freshnessMaxAgeHours: 24,
    });
    expect(result.freshness.status).toBe("unknown");
    expect(result.readiness.state).toBe("BLOCKED");
    expect(result.exceptions.some((e) => e.code === "cc.freshness.unknown")).toBe(true);
  });

  it("BLOCKS on unknown freshness (invalid syncedAt)", () => {
    const input = baseInput("xero");
    input.sync.syncedAt = "totally-invalid";
    const result = runObserveContinuousClose(input, {
      ...engagedPolicy(),
      freshnessMaxAgeHours: 24,
    });
    expect(result.freshness.status).toBe("unknown");
    expect(result.readiness.state).toBe("BLOCKED");
    expect(result.exceptions.some((e) => e.code === "cc.freshness.unknown")).toBe(true);
    expect(result.exceptions.some((e) => e.code === "cc.freshness.stale")).toBe(false);
  });
});

describe("policy requiredness authority", () => {
  it("policy-required signal cannot be downgraded by required=false", () => {
    const input = baseInput("quickbooks");
    input.urmInputs = [urmBank({ required: false, evidenceCount: 0 })];
    const result = runObserveContinuousClose(input, engagedPolicy());
    // bank is policy-required → missing evidence is BLOCK, not optional review
    expect(result.readiness.state).toBe("BLOCKED");
    expect(
      result.exceptions.some(
        (e) =>
          e.exceptionClass === "urm_evidence_insufficient" && e.disposition === "block",
      ),
    ).toBe(true);
    expect(
      result.exceptions.some((e) => e.exceptionClass === "urm_requiredness_contradiction"),
    ).toBe(true);
    expect(result.memoryReadyAccountingSummary.reconProjections[0]?.required).toBe(true);
  });

  it("undeclared signal required flag cannot create policy authority", () => {
    const input = baseInput("xero");
    // Keep policy-required bank with evidence; add undeclared "payroll" claiming required:true
    // with reconciled + no evidence — must be review (optional), not block.
    input.urmInputs = [
      urmBank(),
      urmBank({
        workpaperId: "urm-payroll-1",
        workpaperKind: "payroll",
        required: true,
        evidenceCount: 0,
      }),
    ];
    const policy: ContinuousCloseObservePolicy = {
      ...engagedPolicy(),
      optionalReconKinds: ["payroll"],
    };
    const result = runObserveContinuousClose(input, policy);
    expect(result.readiness.state).toBe("READY_WITH_REVIEW");
    const payrollEv = result.exceptions.find(
      (e) =>
        e.exceptionClass === "urm_evidence_insufficient" && e.workpaperKind === "payroll",
    );
    expect(payrollEv?.disposition).toBe("review");
    expect(
      result.exceptions.some(
        (e) =>
          e.exceptionClass === "urm_requiredness_contradiction" &&
          e.workpaperKind === "payroll",
      ),
    ).toBe(true);
    const payrollProj = result.memoryReadyAccountingSummary.reconProjections.find(
      (p) => p.workpaperKind === "payroll",
    );
    expect(payrollProj?.required).toBe(false);
  });
});

describe("reconciled evidence disposition", () => {
  it("required recon missing evidence → BLOCKED", () => {
    const result = runObserveContinuousClose(
      {
        ...baseInput("quickbooks"),
        urmInputs: [urmBank({ evidenceCount: 0 })],
      },
      engagedPolicy(),
    );
    expect(result.readiness.state).toBe("BLOCKED");
    expect(
      result.exceptions.some(
        (e) =>
          e.exceptionClass === "urm_evidence_insufficient" && e.disposition === "block",
      ),
    ).toBe(true);
  });

  it("optional recon missing evidence → READY_WITH_REVIEW", () => {
    const input = baseInput("xero");
    input.urmInputs = [
      urmBank(),
      urmBank({
        workpaperId: "urm-ar-1",
        workpaperKind: "ar",
        required: false,
        evidenceCount: 0,
      }),
    ];
    const policy: ContinuousCloseObservePolicy = {
      ...engagedPolicy(),
      optionalReconKinds: ["ar"],
    };
    const result = runObserveContinuousClose(input, policy);
    expect(result.readiness.state).toBe("READY_WITH_REVIEW");
    const arEv = result.exceptions.find(
      (e) => e.exceptionClass === "urm_evidence_insufficient" && e.workpaperKind === "ar",
    );
    expect(arEv?.disposition).toBe("review");
  });

  it("required recon with evidence → eligible normally", () => {
    const result = runObserveContinuousClose(baseInput("quickbooks"), engagedPolicy());
    expect(result.readiness.state).toBe("READY");
    expect(result.exceptions.some((e) => e.exceptionClass === "urm_evidence_insufficient")).toBe(
      false,
    );
  });
});

describe("required recon / URM custody", () => {
  it("BLOCKS missing required recon kinds", () => {
    const input = baseInput("quickbooks");
    input.urmInputs = [];
    const result = runObserveContinuousClose(input, engagedPolicy());
    expect(result.readiness.state).toBe("BLOCKED");
    expect(result.exceptions.some((e) => e.exceptionClass === "urm_missing_required")).toBe(true);
  });

  it("BLOCKS open_material and cross-sync mismatch", () => {
    const material = runObserveContinuousClose(baseInput("xero"), engagedPolicy());
    expect(material.readiness.state).toBe("READY");

    const blocked = runObserveContinuousClose(
      {
        ...baseInput("xero"),
        urmInputs: [urmBank({ outcome: "open_material", unidentifiedResidualCents: 99999 })],
      },
      engagedPolicy(),
    );
    expect(blocked.readiness.state).toBe("BLOCKED");

    const cross = runObserveContinuousClose(
      {
        ...baseInput("xero"),
        urmInputs: [urmBank({ sourceAccountingSyncId: "other-sync" })],
      },
      engagedPolicy(),
    );
    expect(cross.readiness.state).toBe("BLOCKED");
    expect(cross.exceptions.some((e) => e.exceptionClass === "urm_cross_sync")).toBe(true);
  });

  it("projects full URM custody fields into memory-ready summary", () => {
    const result = runObserveContinuousClose(baseInput("quickbooks"), engagedPolicy());
    const proj = result.memoryReadyAccountingSummary.reconProjections[0];
    expect(proj?.grossVarianceCents).toBe(5000);
    expect(proj?.identifiedTotalCents).toBe(5000);
    expect(proj?.evidenceCount).toBe(2);
    expect(proj?.sourceAccountingSyncId).toBe("sync-1");
    expect(proj?.asOfDate).toBe("2026-07-31");
    expect(proj?.urmRunId).toBe("urm-run-1");
  });
});

describe("capability vocabulary + receipt custody", () => {
  it("uses SUPPORTED_* vocabulary", () => {
    const result = runObserveContinuousClose(baseInput("quickbooks"), engagedPolicy());
    expect(result.capabilityStatus.statementControl).toBe("SUPPORTED_AND_PASSED");
    expect(result.capabilityStatus.urm).toBe("SUPPORTED_AND_PASSED");
    expect(result.capabilityStatus.assertions).toBe("SUPPORTED_AND_PASSED");
  });

  it("receipt carries custody fields", () => {
    const result = runObserveContinuousClose(baseInput("xero"), engagedPolicy());
    expect(result.receipt?.runId).toBe("run-xero-1");
    expect(result.receipt?.firmClientId).toBe("fc-1");
    expect(result.receipt?.tenantOrRealmId).toBe("tenant-1");
    expect(result.receipt?.accountingConnectionId).toBe("conn-1");
    expect(result.receipt?.observedAt).toBe("2026-08-17T12:00:00.000Z");
    expect(result.receipt?.freshnessStatus).toBe("not_gated");
  });

  it("QBO/Xero parity", () => {
    const qbo = runObserveContinuousClose(baseInput("quickbooks"), engagedPolicy());
    const xero = runObserveContinuousClose(baseInput("xero"), engagedPolicy());
    expect(qbo.readiness.state).toBe(xero.readiness.state);
    expect(qbo.stagesCompleted).toEqual(xero.stagesCompleted);
    expect(qbo.providerWriteAttempted).toBe(false);
    expect(xero.memoryWriteAttempted).toBe(false);
  });
});
