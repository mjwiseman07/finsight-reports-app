/**
 * PR G — CanonicalFinancialContext is a thin façade (zero new KPI math).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildAccuracyContractQuery,
  buildCanonicalFinancialContext,
  deriveAccuracyContractPeriod,
  resolveActiveAuthoritativeSyncId,
} from "@/lib/integrations/accounting/canonical-financial-context";
import { ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION } from "@/lib/integrations/accounting/payload-schema";

const COMPANY = "02edb6c6-a4f1-4bae-825d-2680136dad24";
const SYNC = "7c03f0e3-4aed-45ec-b02b-7e59d80fabae";
const CONN = "b718823a-0eb8-437d-beba-05c41f6482f9";

describe("PR G CanonicalFinancialContext", () => {
  it("static: façade uses allowlisted helpers only; no demo/fixture imports", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/integrations/accounting/canonical-financial-context.ts"),
      "utf8",
    );
    expect(src).toContain("buildActiveReportSummary");
    expect(src).toContain("toScorecardArAgingView");
    expect(src).toContain("toScorecardCashFlowTrailing");
    expect(src).toContain("resolveNorthStar");
    expect(src).not.toMatch(/buildDemo/);
    expect(src).not.toMatch(/sampleMetrics/);
    expect(src).not.toMatch(/\$428K/);
  });

  it("resolveActiveAuthoritativeSyncId prefers syncId over metadata", () => {
    expect(
      resolveActiveAuthoritativeSyncId({
        syncId: SYNC,
        latestSuccessfulSyncId: "other",
        authoritativePersistence: {
          ok: true,
          syncId: SYNC,
          schemaVersion: 4,
          activeNormalizedSyncId: SYNC,
          persisted: true,
        },
      }),
    ).toBe(SYNC);
    expect(resolveActiveAuthoritativeSyncId({ syncId: "metadata:x" })).toBeNull();
  });

  it("deriveAccuracyContractPeriod uses report end month", () => {
    expect(deriveAccuracyContractPeriod({ startDate: "2026-07-01", endDate: "2026-07-31" })).toBe(
      "2026-07",
    );
  });

  it("buildCanonicalFinancialContext composes identity + pinned Acc Contract params", () => {
    const normalizedData = {
      schemaVersion: ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION,
      sourceSystem: "xero",
      adapterName: "xeroAdapter",
      connectionId: CONN,
      companyId: COMPANY,
      tenantId: "ceaea696-081f-491e-9daa-a9263a023ca9",
      tenantName: "Demo Company (US)",
      reportPeriod: { startDate: "2026-07-01", endDate: "2026-07-31" },
      normalizedAccounts: [],
      normalizedTrialBalance: [],
      normalizedBalanceSheet: [],
      normalizedIncomeStatement: [],
      validation: { ok: true, errors: [], warnings: [] as string[] },
      syncId: SYNC,
    };

    const reportDataContext = {
      companyId: COMPANY,
      connectionId: CONN,
      sourceSystem: "xero" as const,
      adapterName: "xeroAdapter" as const,
      tenantId: "ceaea696-081f-491e-9daa-a9263a023ca9",
      tenantName: "Demo Company (US)",
      reportPeriod: { startDate: "2026-07-01", endDate: "2026-07-31" },
      normalizedData: normalizedData as never,
      validationResult: normalizedData.validation as never,
      syncId: SYNC,
      generatedAt: "2026-08-14T00:00:00Z",
    };

    const ctx = buildCanonicalFinancialContext({
      activeContext: {
        companyId: COMPANY,
        connectionId: CONN,
        sourceSystem: "xero",
        tenantId: "ceaea696-081f-491e-9daa-a9263a023ca9",
        tenantName: "Demo Company (US)",
        syncId: SYNC,
        schemaVersion: ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION,
        reportPeriod: { startDate: "2026-07-01", endDate: "2026-07-31" },
        normalizedData: normalizedData as never,
        reportDataContext: reportDataContext as never,
        authoritativePersistence: {
          ok: true,
          syncId: SYNC,
          schemaVersion: ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION,
          activeNormalizedSyncId: SYNC,
          companyId: COMPANY,
          connectionId: CONN,
          persisted: true,
          reason: "durable_success_sync",
        },
      },
      industryType: "General",
    });

    expect(ctx).not.toBeNull();
    expect(ctx!.identity.syncId).toBe(SYNC);
    expect(ctx!.identity.connectionId).toBe(CONN);
    expect(ctx!.provenance.accuracyContractParams).toEqual({
      companyId: COMPANY,
      syncId: SYNC,
      connectionId: CONN,
      period: "2026-07",
    });
    expect(() => ctx!.assertActual()).not.toThrow();
  });

  it("buildAccuracyContractQuery always includes syncId", () => {
    const qs = buildAccuracyContractQuery({
      kpiCode: "cash_position",
      companyId: COMPANY,
      syncId: SYNC,
      period: "2026-07",
      connectionId: CONN,
    });
    expect(qs.get("syncId")).toBe(SYNC);
    expect(qs.get("companyId")).toBe(COMPANY);
    expect(qs.get("kpi_code")).toBe("cash_position");
  });
});
