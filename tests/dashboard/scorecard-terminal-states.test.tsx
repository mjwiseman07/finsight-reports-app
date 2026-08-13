/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import Scorecard, {
  resolveArAgingTileState,
  resolveCashTileState,
  resolveNetMarginTileState,
  resolveNetOpCashFlowTileState,
  resolveNorthStarTileState,
  type ActiveReportSummary,
} from "@/components/dashboard/Scorecard";

const summary: ActiveReportSummary = {
  revenue: 100000,
  expenses: 70000,
  netIncome: 30000,
  assets: 200000,
  liabilities: 50000,
  cash: 9082,
  cogs: 40000,
  grossProfit: 60000,
  grossProfitSupported: true,
};

const noop = () => {};

function renderScorecard(props: Partial<ComponentProps<typeof Scorecard>> = {}) {
  return render(
    <Scorecard
      activeReportSummary={null}
      arAgingSchedule={null}
      cashFlowTrailing12M={null}
      industryType="General"
      companyName="Demo Co"
      hydrationActive={false}
      preflightWarningCodes={[]}
      onAskAboutKpi={noop}
      onOpenProvenance={noop}
      {...props}
    />,
  );
}

describe("Scorecard tile state resolvers", () => {
  it("A: Cash summary exists -> ready", () => {
    expect(resolveCashTileState({ hydrationActive: false, summary })).toEqual({ status: "ready" });
  });

  it("B: Cash during hydration without summary -> loading", () => {
    expect(resolveCashTileState({ hydrationActive: true, summary: null })).toMatchObject({
      status: "loading",
    });
  });

  it("C: AR settled + AR_AGING_MISSING -> unavailable with evidenceCode", () => {
    const state = resolveArAgingTileState({
      hydrationActive: false,
      hasSummary: true,
      arAgingSchedule: null,
      preflightWarningCodes: ["AR_AGING_MISSING"],
    });
    expect(state).toMatchObject({
      status: "unavailable",
      evidenceCode: "AR_AGING_MISSING",
    });
    expect(state.status === "unavailable" && state.message).not.toContain("AR_AGING_MISSING");
  });

  it("C2: AR schedule with passing Tie-Out -> ready", () => {
    expect(
      resolveArAgingTileState({
        hydrationActive: false,
        hasSummary: true,
        arAgingSchedule: {
          current: 7752.05,
          days_1_30: 290.58,
          days_31_60: 250,
          days_61_90: 250,
          days_over_90: 0,
          pastDueTotal: 790.58,
          tieOut: {
            status: "tie",
            scheduleTotal: 8542.63,
            balanceSheetAr: 8542.63,
            variance: 0,
            tolerance: 1,
            passesForScorecard: true,
          },
        },
      }).status,
    ).toBe("ready");
  });

  it("C3: AR schedule with material Tie-Out fail -> error (not READY)", () => {
    expect(
      resolveArAgingTileState({
        hydrationActive: false,
        hasSummary: true,
        arAgingSchedule: {
          current: 0,
          days_1_30: 1000,
          days_31_60: 0,
          days_61_90: 0,
          days_over_90: 0,
          pastDueTotal: 1000,
          tieOut: {
            status: "kickout",
            scheduleTotal: 1000,
            balanceSheetAr: 500,
            variance: 500,
            tolerance: 1,
            passesForScorecard: false,
          },
        },
      }),
    ).toMatchObject({ status: "error" });
  });

  it("D: Net Op CF settled + null source -> unavailable", () => {
    expect(
      resolveNetOpCashFlowTileState({
        hydrationActive: false,
        hasSummary: true,
        cashFlowTrailing12M: null,
      }),
    ).toMatchObject({ status: "unavailable" });
  });

  it("E: Net Margin revenue > 0 ready; revenue <= 0 terminal non-loading", () => {
    expect(resolveNetMarginTileState({ hydrationActive: false, summary }).state.status).toBe("ready");
    expect(
      resolveNetMarginTileState({
        hydrationActive: false,
        summary: { ...summary, revenue: 0, netIncome: -100 },
      }).state.status,
    ).toBe("unavailable");
  });

  it("F: North Star unwired / not shipped -> coming_soon", () => {
    expect(
      resolveNorthStarTileState({ computationShipped: true, valueWired: false }),
    ).toMatchObject({ status: "coming_soon" });
    expect(
      resolveNorthStarTileState({ computationShipped: false, valueWired: false }),
    ).toMatchObject({ status: "coming_soon" });
  });

  it("F2: General operating_gross_margin ready / unavailable from factor", () => {
    expect(
      resolveNorthStarTileState({
        computationShipped: true,
        valueWired: true,
        hasSummary: true,
        factorStatus: "ready",
      }).status,
    ).toBe("ready");
    expect(
      resolveNorthStarTileState({
        computationShipped: true,
        valueWired: true,
        hasSummary: true,
        factorStatus: "unavailable",
        unavailableMessage:
          "Operating gross margin is not available because no positive revenue was found for this period.",
      }),
    ).toMatchObject({ status: "unavailable" });
  });

  it("G: explicit loading still returns loading", () => {
    expect(
      resolveCashTileState({ hydrationActive: true, summary: null }).status,
    ).toBe("loading");
  });
});

describe("Scorecard DOM settlement contract", () => {
  it("settled smoke: no Refreshing for AR / CF; cash ready; OGM unavailable when revenue 0", () => {
    renderScorecard({
      activeReportSummary: {
        ...summary,
        revenue: 0,
        netIncome: -50,
        grossProfit: 0,
        grossProfitSupported: true,
      },
      hydrationActive: false,
      preflightWarningCodes: ["AR_AGING_MISSING"],
    });

    expect(screen.getByText("$9,082")).toBeTruthy();
    expect(screen.getByText("AR aging was not available for this period.")).toBeTruthy();
    expect(screen.getByText("Not available for this period")).toBeTruthy();
    expect(
      screen.getByText("Net margin is not available because no positive revenue was found for this period."),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Operating gross margin is not available because no positive revenue was found for this period.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("Coming soon")).toBeNull();

    expect(screen.queryByText("Refreshing…")).toBeNull();
    expect(screen.queryByText("AR_AGING_MISSING")).toBeNull();
    expect(screen.queryByText("0.0%")).toBeNull();
    expect(screen.queryByText("$0")).toBeNull();
  });

  it("OGM unavailable when gross profit unsupported (missing COGS ≠ zero)", () => {
    renderScorecard({
      activeReportSummary: {
        ...summary,
        revenue: 100,
        grossProfit: 100,
        cogs: 0,
        grossProfitSupported: false,
      },
      hydrationActive: false,
      preflightWarningCodes: ["AR_AGING_MISSING"],
    });
    expect(
      screen.getByText(
        "Operating gross margin is not available because gross profit could not be reliably determined for this period.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("100.0%")).toBeNull();
  });

  it("H: true loading during hydration shows Refreshing", () => {
    renderScorecard({
      activeReportSummary: null,
      hydrationActive: true,
    });
    expect(screen.getAllByText("Refreshing…").length).toBeGreaterThan(0);
  });

  it("ready margin when revenue > 0", () => {
    renderScorecard({
      activeReportSummary: summary,
      hydrationActive: false,
      preflightWarningCodes: ["AR_AGING_MISSING"],
    });
    expect(screen.getByText("30.0%")).toBeTruthy();
    expect(screen.getByText("60.0%")).toBeTruthy();
  });

  it("non-General industry keeps north star Coming soon", () => {
    renderScorecard({
      activeReportSummary: summary,
      industryType: "SaaS",
      hydrationActive: false,
      preflightWarningCodes: ["AR_AGING_MISSING"],
    });
    expect(screen.getByText("Coming soon")).toBeTruthy();
    expect(screen.getByText("MRR / NRR")).toBeTruthy();
  });
});
