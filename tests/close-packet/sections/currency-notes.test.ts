import { describe, expect, it } from "vitest";
import { DEFAULT_FALLBACK_CURRENCY } from "@/lib/format/money";

/**
 * MC-2b.1 verification — pure-function assertion that the `notes` and
 * `currency` fields of each section respect the `homeCurrency` value carried
 * on ctx. We stub the QBO fetch layer so the test doesn't need a real token.
 *
 * These tests intentionally do NOT exercise the Supabase-backed
 * loadRenderContext — that's an integration surface handled by the smoke
 * runbook. The unit contract here is: "given a ctx with homeCurrency=X, the
 * section's notes line reads 'Amounts in X'."
 */

// Vitest module mocks — must appear before dynamic imports of the section files.
import { vi } from "vitest";

vi.mock("@/lib/qbo-for-firm-client", () => ({
  getQboForFirmClient: vi.fn(async () => ({
    accessToken: "tkn",
    realmId: "rlm",
  })),
}));

vi.mock("@/lib/qbo-rest", () => ({
  reportBalanceSheet: vi.fn(async () => ({ Rows: { Row: [] } })),
  reportProfitAndLoss: vi.fn(async () => ({ Rows: { Row: [] } })),
  reportCashFlow: vi.fn(async () => ({ Rows: { Row: [] } })),
}));

vi.mock("@/lib/close-packet/qbo-report-walker", () => ({
  walkQboReport: vi.fn(() => []),
  mergeReports: vi.fn(() => []),
  pctChange: vi.fn(() => 0),
  priorPeriodRange: vi.fn(() => ({ start: "2026-06-01", end: "2026-06-30" })),
  yoyPeriodRange: vi.fn(() => ({ start: "2025-07-01", end: "2025-07-31" })),
}));

const CLOSE_PERIOD = {
  period_start: "2026-07-01",
  period_end: "2026-07-31",
};

const FIRM_CLIENT = { id: "fc-1" };

describe("close-packet BS/PnL/CF — currency-aware notes (MC-2b.1)", () => {
  it("uses provided homeCurrency for USD", async () => {
    const { build: buildBs } = await import("@/lib/close-packet/sections/bs");
    const { build: buildPnl } = await import("@/lib/close-packet/sections/pnl");
    const { build: buildCf } = await import("@/lib/close-packet/sections/cf");

    const ctx = {
      closePeriod: CLOSE_PERIOD,
      firmClient: FIRM_CLIENT,
      homeCurrency: "USD",
      priorSections: {},
    };

    const [bs, pnl, cf] = await Promise.all([
      buildBs(ctx),
      buildPnl(ctx),
      buildCf(ctx),
    ]);

    expect(bs.status).toBe("ok");
    expect(pnl.status).toBe("ok");
    expect(cf.status).toBe("ok");
    expect(bs.notes?.[0]).toBe("Amounts in USD");
    expect(pnl.notes?.[0]).toBe("Amounts in USD");
    expect(cf.notes?.[0]).toBe("Amounts in USD");
    expect(bs.currency).toBe("USD");
    expect(pnl.currency).toBe("USD");
    expect(cf.currency).toBe("USD");
  });

  it("uses provided homeCurrency for CAD", async () => {
    const { build: buildBs } = await import("@/lib/close-packet/sections/bs");
    const { build: buildPnl } = await import("@/lib/close-packet/sections/pnl");
    const { build: buildCf } = await import("@/lib/close-packet/sections/cf");

    const ctx = {
      closePeriod: CLOSE_PERIOD,
      firmClient: FIRM_CLIENT,
      homeCurrency: "CAD",
      priorSections: {},
    };

    const [bs, pnl, cf] = await Promise.all([
      buildBs(ctx),
      buildPnl(ctx),
      buildCf(ctx),
    ]);

    expect(bs.status).toBe("ok");
    expect(pnl.status).toBe("ok");
    expect(cf.status).toBe("ok");
    expect(bs.notes?.[0]).toBe("Amounts in CAD");
    expect(pnl.notes?.[0]).toBe("Amounts in CAD");
    expect(cf.notes?.[0]).toBe("Amounts in CAD");
    expect(bs.currency).toBe("CAD");
    expect(pnl.currency).toBe("CAD");
    expect(cf.currency).toBe("CAD");
  });

  it("falls back to USD when homeCurrency is null/undefined/empty", async () => {
    const { build: buildBs } = await import("@/lib/close-packet/sections/bs");
    const { build: buildPnl } = await import("@/lib/close-packet/sections/pnl");
    const { build: buildCf } = await import("@/lib/close-packet/sections/cf");

    for (const value of [null, undefined, ""]) {
      const ctx = {
        closePeriod: CLOSE_PERIOD,
        firmClient: FIRM_CLIENT,
        homeCurrency: value,
        priorSections: {},
      };

      const [bs, pnl, cf] = await Promise.all([
        buildBs(ctx),
        buildPnl(ctx),
        buildCf(ctx),
      ]);

      expect(bs.status).toBe("ok");
      expect(pnl.status).toBe("ok");
      expect(cf.status).toBe("ok");
      expect(bs.notes?.[0]).toBe(`Amounts in ${DEFAULT_FALLBACK_CURRENCY}`);
      expect(pnl.notes?.[0]).toBe(`Amounts in ${DEFAULT_FALLBACK_CURRENCY}`);
      expect(cf.notes?.[0]).toBe(`Amounts in ${DEFAULT_FALLBACK_CURRENCY}`);
    }
  });
});
