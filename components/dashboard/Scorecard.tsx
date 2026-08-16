"use client";

import { useState, useEffect, type ReactNode } from "react";
import { focusRing, headingFont } from "@/components/site-ui";
import { resolveNorthStar } from "@/lib/scorecard/industry-north-star";
import { factorizeOperatingGrossMargin } from "@/lib/scorecard/operating-gross-margin";
import ProviderPickerEmptyState from "./ProviderPickerEmptyState";

export type ActiveReportSummary = {
  revenue: number;
  /** Canonical mapped COGS when available (from buildActiveReportSummary). */
  cogs?: number;
  /** Canonical mapped gross profit — required for General north-star wiring. */
  grossProfit?: number;
  /** Explicit GP or COGS evidence from canonical summary — required for ready OGM. */
  grossProfitSupported?: boolean;
  expenses: number;
  netIncome: number;
  assets: number;
  liabilities: number;
  /**
   * Cash amount when present. Null means SOURCE_MISSING (never display as $0).
   */
  cash: number | null;
  cashStatus?: "VALUE_ZERO" | "VALUE_NONZERO" | "SOURCE_MISSING";
  /** False when period P&L lacks revenue evidence. */
  incomeStatementComplete?: boolean;
  lastSyncedAt?: string;
};

export type ArAgingSchedule = {
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_over_90: number;
  /** Full AR subledger total (Current + past due). Not Scorecard exposure. */
  total?: number;
  /** Scorecard exposure = past-due buckets only. */
  pastDueTotal?: number;
  tieOut?: {
    status: "tie" | "auto_cleared" | "review" | "kickout" | "unavailable";
    scheduleTotal: number;
    balanceSheetAr: number;
    variance: number;
    tolerance: number;
    reason?: string;
    passesForScorecard?: boolean;
  };
};

export type CashFlowTrailing = {
  netOperatingCashFlow: number | null;
  monthlyAverageBurn?: number;
  supportStatus?: "supported" | "not_supported" | "unavailable" | "error";
  supportReason?: string | null;
  customerMessage?: string | null;
};

/**
 * Explicit per-tile display state. Loading must never be inferred from null values.
 */
export type ScorecardTileState =
  | { status: "loading"; message?: string }
  | { status: "ready" }
  | { status: "unavailable"; message: string; evidenceCode?: string }
  | { status: "not_supported"; message: string }
  | { status: "error"; message: string }
  | { status: "coming_soon"; message: string };

type ScorecardProps = {
  activeReportSummary: ActiveReportSummary | null;
  arAgingSchedule: ArAgingSchedule | null;
  cashFlowTrailing12M: CashFlowTrailing | null;
  industryType: string;
  companyName: string;
  integrationChoice?: string | null;
  onConnectQBO?: () => void;
  onConnectXero?: () => void;
  /** True while post-connect hydration request is in flight. */
  hydrationActive?: boolean;
  /** Preflight warning codes (e.g. AR_AGING_MISSING) — never shown raw to customers. */
  preflightWarningCodes?: string[];
  onAskAboutKpi: (kpiCode: string, question: string) => void;
  onOpenProvenance: (kpiCode: string) => void;
  /** @deprecated DASH_1A.1.2 — prefer onConnectQBO / onConnectXero */
  onConnect?: () => void;
};

const CURRENCY_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const CURRENCY_FORMAT_PRECISE = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const PERCENT_FORMAT = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const COACH_MARK_KEY = "advisacor.scorecard.coach_mark_dismissed_v1";

function getIntegrationLabel(choice?: string | null): string {
  const normalized = (choice || "").toLowerCase().trim();
  if (normalized === "xero") return "Xero";
  if (normalized === "quickbooks" || normalized === "qbo" || normalized === "") return "QuickBooks";
  return "your accounting system";
}

function hasWarningCode(codes: string[] | undefined, code: string) {
  return Boolean(codes?.includes(code));
}

/** Pure helpers exported for focused unit tests. */
export function resolveCashTileState(args: {
  hydrationActive: boolean;
  summary: ActiveReportSummary | null;
}): ScorecardTileState {
  if (args.summary) {
    const status = args.summary.cashStatus;
    if (status === "SOURCE_MISSING" || (status == null && args.summary.cash == null)) {
      return {
        status: "unavailable",
        message: "Cash position is not available because no cash or bank balances were provided on the Balance Sheet.",
      };
    }
    return { status: "ready" };
  }
  if (args.hydrationActive) {
    return { status: "loading", message: "Refreshing…" };
  }
  return { status: "unavailable", message: "Not available for this period" };
}

export function resolveNetOpCashFlowTileState(args: {
  hydrationActive: boolean;
  hasSummary: boolean;
  cashFlowTrailing12M: CashFlowTrailing | null;
}): ScorecardTileState {
  const schedule = args.cashFlowTrailing12M;
  if (schedule?.supportStatus === "not_supported") {
    return {
      status: "not_supported",
      message:
        schedule.customerMessage ||
        "Net operating cash flow is not supported for this provider configuration.",
    };
  }
  if (schedule?.supportStatus === "error") {
    return {
      status: "error",
      message:
        schedule.customerMessage ||
        "Net operating cash flow could not be computed from the Statement of Cash Flows.",
    };
  }
  if (
    schedule &&
    (schedule.supportStatus === "supported" || schedule.supportStatus == null) &&
    typeof schedule.netOperatingCashFlow === "number"
  ) {
    return { status: "ready" };
  }
  if (args.hydrationActive && !args.hasSummary) {
    return { status: "loading", message: "Refreshing…" };
  }
  return { status: "unavailable", message: "Not available for this period" };
}

export function resolveArAgingTileState(args: {
  hydrationActive: boolean;
  hasSummary: boolean;
  arAgingSchedule: ArAgingSchedule | null;
  preflightWarningCodes?: string[];
}): ScorecardTileState {
  if (args.arAgingSchedule) {
    const tie = args.arAgingSchedule.tieOut;
    const passes =
      tie?.passesForScorecard === true ||
      tie?.status === "tie" ||
      tie?.status === "auto_cleared";
    if (tie && !passes) {
      return {
        status: "error",
        message:
          tie.status === "kickout" || tie.status === "review"
            ? "AR aging does not tie to the Balance Sheet."
            : "AR aging Tie-Out is unavailable for this period.",
      };
    }
    return { status: "ready" };
  }
  if (args.hydrationActive && !args.hasSummary) {
    return { status: "loading", message: "Refreshing…" };
  }
  if (hasWarningCode(args.preflightWarningCodes, "AR_AGING_MISSING") || args.hasSummary) {
    return {
      status: "unavailable",
      message: "AR aging was not available for this period.",
      evidenceCode: hasWarningCode(args.preflightWarningCodes, "AR_AGING_MISSING")
        ? "AR_AGING_MISSING"
        : undefined,
    };
  }
  return { status: "unavailable", message: "AR aging was not available for this period." };
}

export function resolveNetMarginTileState(args: {
  hydrationActive: boolean;
  summary: ActiveReportSummary | null;
}): { state: ScorecardTileState; value: string | null } {
  if (!args.summary) {
    if (args.hydrationActive) {
      return { state: { status: "loading", message: "Refreshing…" }, value: null };
    }
    return {
      state: { status: "unavailable", message: "Not available for this period" },
      value: null,
    };
  }
  if (args.summary.incomeStatementComplete === false) {
    return {
      state: {
        status: "unavailable",
        message:
          "Net margin is not available because the period Profit and Loss statement is incomplete.",
      },
      value: null,
    };
  }
  if (args.summary.revenue > 0) {
    const pct = args.summary.netIncome / args.summary.revenue;
    return {
      state: { status: "ready" },
      value: PERCENT_FORMAT.format(pct),
    };
  }
  return {
    state: {
      status: "unavailable",
      message: "Net margin is not available because no positive revenue was found for this period.",
    },
    value: null,
  };
}

export function resolveNorthStarTileState(args: {
  computationShipped: boolean;
  valueWired: boolean;
  hydrationActive?: boolean;
  hasSummary?: boolean;
  factorStatus?: "ready" | "unavailable";
  unavailableMessage?: string;
}): ScorecardTileState {
  if (!args.computationShipped || !args.valueWired) {
    return {
      status: "coming_soon",
      message: "Coming soon",
    };
  }
  if (!args.hasSummary) {
    if (args.hydrationActive) {
      return { status: "loading", message: "Refreshing…" };
    }
    return {
      status: "unavailable",
      message:
        args.unavailableMessage ||
        "Operating gross margin is not available because no positive revenue was found for this period.",
    };
  }
  if (args.factorStatus === "unavailable") {
    return {
      status: "unavailable",
      message:
        args.unavailableMessage ||
        "Operating gross margin is not available because no positive revenue was found for this period.",
    };
  }
  return { status: "ready" };
}

/** General north star is wired when the KPI code is operating_gross_margin. */
export function isOperatingGrossMarginWired(northStarCode: string): boolean {
  return northStarCode === "operating_gross_margin";
}

function CardShell({
  label,
  value,
  helperText,
  onAsk,
  onProvenance,
  tileState,
  isFirst,
  coachMarkVisible,
  onDismissCoachMark,
}: {
  label: string;
  value: ReactNode;
  helperText: string;
  onAsk: () => void;
  onProvenance: () => void;
  tileState: ScorecardTileState;
  isFirst: boolean;
  coachMarkVisible: boolean;
  onDismissCoachMark: () => void;
}) {
  const showLoading = tileState.status === "loading";
  const showReady = tileState.status === "ready";
  const terminalMessage =
    tileState.status === "unavailable" ||
    tileState.status === "not_supported" ||
    tileState.status === "error" ||
    tileState.status === "coming_soon"
      ? tileState.message
      : tileState.status === "loading"
        ? tileState.message || "Refreshing…"
        : null;

  return (
    <div className="relative rounded-2xl border border-[#3A3A3D] bg-[#1B1B1D] p-5 transition hover:border-[#C9A961]/40">
      <div className="flex items-start justify-between gap-2">
        <p className={`${headingFont} text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A961]`}>
          {label}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onAsk}
            aria-label={`Ask Pulse about ${label}`}
            className={`${focusRing("rounded-full")} rounded-full border border-[#3A3A3D] p-1.5 text-[#ECEBE7]/60 transition hover:border-[#C9A961]/60 hover:text-[#C9A961]`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </button>
          <button
            type="button"
            onClick={onProvenance}
            aria-label={`See the numbers behind ${label}`}
            className={`${focusRing("rounded-full")} rounded-full border border-[#3A3A3D] p-1.5 text-[#ECEBE7]/60 transition hover:border-[#C9A961]/60 hover:text-[#C9A961]`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          </button>
        </div>
      </div>
      <div className="mt-3">
        {showLoading ? (
          <span className="inline-flex items-center rounded-full bg-[#3A3A3D] px-3 py-1 text-xs font-semibold text-[#ECEBE7]/70">
            {terminalMessage || "Refreshing…"}
          </span>
        ) : showReady ? (
          <p className={`${headingFont} text-3xl font-semibold text-[#ECEBE7] tabular-nums`}>
            {value}
          </p>
        ) : (
          <p className="text-sm leading-5 text-[#ECEBE7]/70">{terminalMessage}</p>
        )}
      </div>
      <p className="mt-2 text-sm text-[#ECEBE7]/70">{helperText}</p>

      {isFirst && coachMarkVisible && showReady && (
        <div
          role="dialog"
          aria-label="Accuracy Contract coach mark"
          className="absolute -bottom-2 right-4 z-10 w-64 translate-y-full rounded-xl border border-[#C9A961]/60 bg-[#1B1B1D] p-3 shadow-xl"
        >
          <div className="flex items-start justify-between gap-2">
            <p className={`${headingFont} text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A961]`}>
              Every number is source-linked
            </p>
            <button
              type="button"
              onClick={onDismissCoachMark}
              aria-label="Dismiss coach mark"
              className={`${focusRing("rounded-full")} text-[#ECEBE7]/50 hover:text-[#ECEBE7]`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <p className="mt-2 text-sm text-[#ECEBE7]/80">
            Click the link icon on any card to trace it back to the underlying transactions.
          </p>
        </div>
      )}
    </div>
  );
}

export default function Scorecard({
  activeReportSummary,
  arAgingSchedule,
  cashFlowTrailing12M,
  industryType,
  companyName,
  integrationChoice,
  onConnectQBO,
  onConnectXero,
  hydrationActive = false,
  preflightWarningCodes = [],
  onAskAboutKpi,
  onOpenProvenance,
  onConnect: onConnectDeprecated,
}: ScorecardProps) {
  const [coachMarkVisible, setCoachMarkVisible] = useState(false);
  const northStar = resolveNorthStar(industryType);
  // Only General operating_gross_margin is value-wired from canonical summary.
  const northStarValueWired = isOperatingGrossMarginWired(northStar.code);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!activeReportSummary) return;
    try {
      const dismissed = localStorage.getItem(COACH_MARK_KEY);
      if (!dismissed) setCoachMarkVisible(true);
    } catch {
      // localStorage unavailable — skip coach mark
    }
  }, [activeReportSummary]);

  function dismissCoachMark() {
    setCoachMarkVisible(false);
    try {
      localStorage.setItem(COACH_MARK_KEY, new Date().toISOString());
    } catch {
      // no-op
    }
  }

  const connectQBO = onConnectQBO ?? onConnectDeprecated ?? (() => {});
  const connectXero = onConnectXero ?? (() => {});

  // Unconnected / no report yet — DASH_1A.1.2 tile-grid provider picker
  if (!activeReportSummary && !hydrationActive) {
    return (
      <ProviderPickerEmptyState
        onConnectQBO={connectQBO}
        onConnectXero={connectXero}
        companyName={companyName}
      />
    );
  }

  const cashState = resolveCashTileState({
    hydrationActive,
    summary: activeReportSummary,
  });
  const cashValue =
    activeReportSummary &&
    cashState.status === "ready" &&
    typeof activeReportSummary.cash === "number"
      ? CURRENCY_FORMAT.format(activeReportSummary.cash)
      : "";

  const netOpState = resolveNetOpCashFlowTileState({
    hydrationActive,
    hasSummary: Boolean(activeReportSummary),
    cashFlowTrailing12M,
  });
  const runwayValue =
    cashFlowTrailing12M && typeof cashFlowTrailing12M.netOperatingCashFlow === "number"
      ? CURRENCY_FORMAT.format(cashFlowTrailing12M.netOperatingCashFlow)
      : "";

  const arState = resolveArAgingTileState({
    hydrationActive,
    hasSummary: Boolean(activeReportSummary),
    arAgingSchedule,
    preflightWarningCodes,
  });
  const arTotal = arAgingSchedule
    ? typeof arAgingSchedule.pastDueTotal === "number"
      ? arAgingSchedule.pastDueTotal
      : arAgingSchedule.days_1_30 +
        arAgingSchedule.days_31_60 +
        arAgingSchedule.days_61_90 +
        arAgingSchedule.days_over_90
    : null;
  const arValue = arTotal !== null ? CURRENCY_FORMAT_PRECISE.format(arTotal) : "";

  const { state: netMarginState, value: netMarginValue } = resolveNetMarginTileState({
    hydrationActive,
    summary: activeReportSummary,
  });

  const operatingGrossMarginFactor =
    northStarValueWired && activeReportSummary
      ? typeof activeReportSummary.grossProfit === "number"
        ? factorizeOperatingGrossMargin({
            revenue: activeReportSummary.revenue,
            grossProfit: activeReportSummary.grossProfit,
            grossProfitSupported: Boolean(activeReportSummary.grossProfitSupported),
          })
        : factorizeOperatingGrossMargin(null)
      : null;

  const northStarState = resolveNorthStarTileState({
    computationShipped: northStar.computationShipped,
    valueWired: northStarValueWired,
    hydrationActive,
    hasSummary: Boolean(activeReportSummary),
    factorStatus: operatingGrossMarginFactor?.status,
    unavailableMessage: operatingGrossMarginFactor?.message,
  });
  const northStarValue =
    northStarState.status === "ready" ? operatingGrossMarginFactor?.display ?? "" : "";

  return (
    <div className="rounded-[2rem] border border-[#3A3A3D] bg-[#111113] p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
        <p className={`${headingFont} text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A961]`}>
          Your Scorecard
        </p>
        <p className="text-sm text-[#ECEBE7]/60">
          {companyName ? `${companyName} · ` : ""}
          {hydrationActive && !activeReportSummary
            ? `Fetching 6 months of ${getIntegrationLabel(integrationChoice)} data — usually 20-40 seconds`
            : "Live from your books"}
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <CardShell
          label="Cash Position"
          value={cashValue}
          helperText="Total cash across connected accounts"
          onAsk={() => onAskAboutKpi("cash_position", `What's driving my current cash position for ${companyName}?`)}
          onProvenance={() => onOpenProvenance("cash_position")}
          tileState={cashState}
          isFirst={true}
          coachMarkVisible={coachMarkVisible}
          onDismissCoachMark={dismissCoachMark}
        />

        <CardShell
          label="Net Op Cash Flow"
          value={runwayValue}
          helperText="Trailing 12 months, cash from operations"
          onAsk={() => onAskAboutKpi("net_op_cash_flow", `Explain my trailing net operating cash flow.`)}
          onProvenance={() => onOpenProvenance("net_op_cash_flow")}
          tileState={netOpState}
          isFirst={false}
          coachMarkVisible={false}
          onDismissCoachMark={dismissCoachMark}
        />

        <CardShell
          label="AR Aging Exposure"
          value={arValue}
          helperText="Total AR past due — 1-30, 31-60, 61-90, 90+"
          onAsk={() => onAskAboutKpi("ar_aging", `What's my past-due AR exposure and which customers are driving it?`)}
          onProvenance={() => onOpenProvenance("ar_aging")}
          tileState={arState}
          isFirst={false}
          coachMarkVisible={false}
          onDismissCoachMark={dismissCoachMark}
        />

        <CardShell
          label="Net Profit Margin"
          value={netMarginValue ?? ""}
          helperText="Net income divided by revenue this period"
          onAsk={() =>
            onAskAboutKpi(
              "net_profit_margin",
              netMarginValue
                ? `Why did my net profit margin land at ${netMarginValue}? What are the top drivers?`
                : "Why is my net profit margin unavailable for this period?",
            )
          }
          onProvenance={() => onOpenProvenance("net_profit_margin")}
          tileState={netMarginState}
          isFirst={false}
          coachMarkVisible={false}
          onDismissCoachMark={dismissCoachMark}
        />

        <CardShell
          label={northStar.label}
          value={northStarValue}
          helperText={northStar.helperText}
          onAsk={() =>
            onAskAboutKpi(
              northStar.code,
              northStarValue
                ? `Show me my ${northStar.label} at ${northStarValue} and how it's trending.`
                : `Show me my ${northStar.label} and how it's trending.`,
            )
          }
          onProvenance={() => onOpenProvenance(northStar.code)}
          tileState={northStarState}
          isFirst={false}
          coachMarkVisible={false}
          onDismissCoachMark={dismissCoachMark}
        />
      </div>

      {northStarState.status === "coming_soon" && activeReportSummary && (
        <p className="mt-4 text-xs text-[#ECEBE7]/50">
          {northStar.label} — {northStar.computationShipped
            ? "figure wiring for this vertical is coming up in your next brief."
            : `computation for the ${industryType} vertical is coming up in your next brief.`}{" "}
          Every other live card is sourced from your books.
        </p>
      )}
    </div>
  );
}
