import { reconcileBankCashSnapshot } from "./bank-cash-reconciliation";
import { reconcileExpenseCutoff, reconcileRevenueCutoff } from "./cutoff-reconciliation";
import { buildCanonicalStatementFactsFromNormalized } from "@/lib/integrations/accounting/statement-control";
import type { AdvisacorNormalizedFinancialData } from "@/lib/integrations/accounting/types";
import type { WeeklyFinding } from "./weekly-completeness";

export type MonthEndReviewPackage = {
  status: "ready" | "review_required" | "blocked";
  provider: "quickbooks" | "xero";
  period_end: string;
  review_only: true;
  provider_writes: false;
  sections: {
    balance_sheet: {
      total_assets_cents: number | null;
      total_liabilities_cents: number | null;
      total_equity_cents: number | null;
      equation_variance_cents: number | null;
      status: "tie" | "review_required" | "unavailable";
    };
    bank_cash: ReturnType<typeof reconcileBankCashSnapshot>;
    revenue_cutoff: ReturnType<typeof reconcileRevenueCutoff>;
    expense_cutoff: ReturnType<typeof reconcileExpenseCutoff>;
    weekly_open_findings: { count: number; blocking: number; review: number };
  };
  reviewer_actions: string[];
};

function toCents(value: number | null): number | null {
  return value == null || !Number.isFinite(value) ? null : Math.round(value * 100);
}

export function buildMonthEndReviewPackage(input: {
  payload: AdvisacorNormalizedFinancialData;
  weeklyFindings?: WeeklyFinding[];
  toleranceCents?: number;
}): MonthEndReviewPackage {
  if (input.payload.sourceSystem !== "quickbooks" && input.payload.sourceSystem !== "xero") {
    throw new Error("month_end_provider_not_supported");
  }
  const provider = input.payload.sourceSystem;
  const tolerance = input.toleranceCents ?? 100;
  const facts = buildCanonicalStatementFactsFromNormalized({
    balanceSheet: input.payload.normalizedBalanceSheet,
    incomeStatement: input.payload.normalizedIncomeStatement,
  });
  const assets = toCents(facts.totalAssets);
  const liabilities = toCents(facts.totalLiabilities);
  const equity = toCents(facts.totalEquity);
  const equationVariance = assets == null || liabilities == null || equity == null
    ? null
    : assets - liabilities - equity;
  const balanceStatus = equationVariance == null
    ? "unavailable"
    : Math.abs(equationVariance) <= tolerance
      ? "tie"
      : "review_required";

  const bankCash = reconcileBankCashSnapshot(input.payload, tolerance);
  const revenueCutoff = reconcileRevenueCutoff(input.payload);
  const expenseCutoff = reconcileExpenseCutoff(input.payload);
  const weekly = input.weeklyFindings ?? [];
  const blocking = weekly.filter((finding) => finding.severity === "block").length;
  const review = weekly.filter((finding) => finding.severity === "review").length;
  const reviewerActions: string[] = [];

  if (balanceStatus === "unavailable") reviewerActions.push("obtain_complete_balance_sheet_controls");
  if (balanceStatus === "review_required") reviewerActions.push("investigate_balance_sheet_equation_variance");
  if (bankCash.status === "unavailable") reviewerActions.push("obtain_bank_closing_balance_evidence");
  if (bankCash.status === "review_required") reviewerActions.push("resolve_bank_to_gl_variance");
  if (revenueCutoff.status !== "clear") reviewerActions.push("review_shipment_to_invoice_cutoff");
  if (expenseCutoff.status !== "clear") reviewerActions.push("review_bill_posting_and_payment_state");
  if (weekly.length) reviewerActions.push("resolve_open_weekly_findings");

  const unavailable = balanceStatus === "unavailable" || bankCash.status === "unavailable";
  const needsReview = balanceStatus === "review_required" || bankCash.status === "review_required" || revenueCutoff.status !== "clear" || expenseCutoff.status !== "clear" || weekly.length > 0;

  return {
    status: unavailable || blocking > 0 ? "blocked" : needsReview ? "review_required" : "ready",
    provider,
    period_end: input.payload.reportPeriod.endDate,
    review_only: true,
    provider_writes: false,
    sections: {
      balance_sheet: {
        total_assets_cents: assets,
        total_liabilities_cents: liabilities,
        total_equity_cents: equity,
        equation_variance_cents: equationVariance,
        status: balanceStatus,
      },
      bank_cash: bankCash,
      revenue_cutoff: revenueCutoff,
      expense_cutoff: expenseCutoff,
      weekly_open_findings: { count: weekly.length, blocking, review },
    },
    reviewer_actions: Array.from(new Set(reviewerActions)),
  };
}
