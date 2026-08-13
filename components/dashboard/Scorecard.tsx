"use client";

import { useState, useEffect, type ReactNode } from "react";
import { focusRing, headingFont } from "@/components/site-ui";
import { resolveNorthStar } from "@/lib/scorecard/industry-north-star";
import ProviderPickerEmptyState from "./ProviderPickerEmptyState";

type ActiveReportSummary = {
  revenue: number;
  expenses: number;
  netIncome: number;
  assets: number;
  liabilities: number;
  cash: number;
  lastSyncedAt?: string;
};

type ArAgingSchedule = {
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_over_90: number;
};

type CashFlowTrailing = {
  netOperatingCashFlow: number;
  monthlyAverageBurn: number;
};

type HydrationTileKey =
  | "cash_position"
  | "net_op_cash_flow"
  | "ar_aging"
  | "net_profit_margin"
  | "north_star";

type HydrationTileState = {
  status: "pending" | "loading" | "ready";
  statusText?: string;
};

type ScorecardProps = {
  activeReportSummary: ActiveReportSummary | null;
  arAgingSchedule: ArAgingSchedule | null;
  cashFlowTrailing12M: CashFlowTrailing | null;
  industryType: string;
  companyName: string;
  integrationChoice?: string | null;
  onConnectQBO?: () => void;
  onConnectXero?: () => void;
  hydrationActive?: boolean;
  hydrationTiles?: Partial<Record<HydrationTileKey, HydrationTileState>>;
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

function CardShell({
  label,
  value,
  helperText,
  onAsk,
  onProvenance,
  isPending,
  isFirst,
  coachMarkVisible,
  onDismissCoachMark,
  hydrationStatus,
  hydrationStatusText,
}: {
  label: string;
  value: ReactNode;
  helperText: string;
  onAsk: () => void;
  onProvenance: () => void;
  isPending: boolean;
  isFirst: boolean;
  coachMarkVisible: boolean;
  onDismissCoachMark: () => void;
  hydrationStatus?: "pending" | "loading" | "ready";
  hydrationStatusText?: string;
}) {
  const showHydration = hydrationStatus === "loading" && Boolean(hydrationStatusText);
  const showPending = !showHydration && isPending;

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
        {showHydration ? (
          <p aria-live="polite" className="text-xs italic leading-5 text-[#BB653B]">
            {hydrationStatusText}
          </p>
        ) : showPending ? (
          <span className="inline-flex items-center rounded-full bg-[#3A3A3D] px-3 py-1 text-xs font-semibold text-[#ECEBE7]/70">
            Refreshing…
          </span>
        ) : (
          <p className={`${headingFont} text-3xl font-semibold text-[#ECEBE7] tabular-nums`}>
            {value}
          </p>
        )}
      </div>
      <p className="mt-2 text-sm text-[#ECEBE7]/70">{helperText}</p>

      {isFirst && coachMarkVisible && !showHydration && (
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
  hydrationTiles,
  onAskAboutKpi,
  onOpenProvenance,
  onConnect: onConnectDeprecated,
}: ScorecardProps) {
  const [coachMarkVisible, setCoachMarkVisible] = useState(false);
  const northStar = resolveNorthStar(industryType);

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

  const cashValue = activeReportSummary
    ? CURRENCY_FORMAT.format(activeReportSummary.cash)
    : "";
  const netMarginPct =
    activeReportSummary && activeReportSummary.revenue > 0
      ? activeReportSummary.netIncome / activeReportSummary.revenue
      : null;
  const netMarginValue = netMarginPct !== null ? PERCENT_FORMAT.format(netMarginPct) : "—";

  const arTotal = arAgingSchedule
    ? arAgingSchedule.days_1_30 + arAgingSchedule.days_31_60 + arAgingSchedule.days_61_90 + arAgingSchedule.days_over_90
    : null;
  const arValue = arTotal !== null ? CURRENCY_FORMAT.format(arTotal) : null;

  const runwayValue = cashFlowTrailing12M
    ? CURRENCY_FORMAT.format(cashFlowTrailing12M.netOperatingCashFlow)
    : null;

  const northStarPending = true;
  const northStarValue = "";

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
          isPending={!activeReportSummary}
          isFirst={true}
          coachMarkVisible={coachMarkVisible}
          onDismissCoachMark={dismissCoachMark}
          hydrationStatus={hydrationTiles?.cash_position?.status}
          hydrationStatusText={hydrationTiles?.cash_position?.statusText}
        />

        <CardShell
          label="Net Op Cash Flow"
          value={runwayValue ?? ""}
          helperText="Trailing 12 months, cash from operations"
          onAsk={() => onAskAboutKpi("net_op_cash_flow", `Explain my trailing net operating cash flow.`)}
          onProvenance={() => onOpenProvenance("net_op_cash_flow")}
          isPending={runwayValue === null}
          isFirst={false}
          coachMarkVisible={false}
          onDismissCoachMark={dismissCoachMark}
          hydrationStatus={hydrationTiles?.net_op_cash_flow?.status}
          hydrationStatusText={hydrationTiles?.net_op_cash_flow?.statusText}
        />

        <CardShell
          label="AR Aging Exposure"
          value={arValue ?? ""}
          helperText="Total AR past due — 1-30, 31-60, 61-90, 90+"
          onAsk={() => onAskAboutKpi("ar_aging", `What's my past-due AR exposure and which customers are driving it?`)}
          onProvenance={() => onOpenProvenance("ar_aging")}
          isPending={arValue === null}
          isFirst={false}
          coachMarkVisible={false}
          onDismissCoachMark={dismissCoachMark}
          hydrationStatus={hydrationTiles?.ar_aging?.status}
          hydrationStatusText={hydrationTiles?.ar_aging?.statusText}
        />

        <CardShell
          label="Net Profit Margin"
          value={netMarginValue}
          helperText="Net income divided by revenue this period"
          onAsk={() => onAskAboutKpi("net_profit_margin", `Why did my net profit margin land at ${netMarginValue}? What are the top drivers?`)}
          onProvenance={() => onOpenProvenance("net_profit_margin")}
          isPending={netMarginPct === null}
          isFirst={false}
          coachMarkVisible={false}
          onDismissCoachMark={dismissCoachMark}
          hydrationStatus={hydrationTiles?.net_profit_margin?.status}
          hydrationStatusText={hydrationTiles?.net_profit_margin?.statusText}
        />

        <CardShell
          label={northStar.label}
          value={northStarValue}
          helperText={northStar.helperText}
          onAsk={() => onAskAboutKpi(northStar.code, `Show me my ${northStar.label} and how it's trending.`)}
          onProvenance={() => onOpenProvenance(northStar.code)}
          isPending={northStarPending || !northStar.computationShipped}
          isFirst={false}
          coachMarkVisible={false}
          onDismissCoachMark={dismissCoachMark}
          hydrationStatus={hydrationTiles?.north_star?.status}
          hydrationStatusText={hydrationTiles?.north_star?.statusText}
        />
      </div>

      {(!northStar.computationShipped || northStarPending) && activeReportSummary && (
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
