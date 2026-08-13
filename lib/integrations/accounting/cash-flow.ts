/**
 * Provider-neutral canonical Statement of Cash Flows schedule.
 *
 * Scorecard "Net Op Cash Flow" = netOperatingCashFlow for trailing_12_months.
 *
 * Source rules:
 * - QBO: provider Statement of Cash Flows (CashFlow report) only.
 * - Xero US / Xero without wired Finance API SoCF: supportStatus = not_supported.
 * - NEVER BankSummary, bank net movement, net income, or informal synthesis.
 */

import type { AccountingProvider, CanonicalCashFlowRow, CanonicalSourceMetadata } from "./types";
import { trailingTwelveMonthPeriod } from "./report-period";

export const CASH_FLOW_PERIOD_TYPE = "trailing_12_months" as const;

export type CashFlowSupportStatus =
  | "supported"
  | "not_supported"
  | "unavailable"
  | "error";

export type CashFlowSourceKind =
  | "provider_statement_of_cash_flows"
  | "not_supported";

export type CashFlowMethod = "provider_statement" | "not_applicable";

export type CanonicalCashFlowCapability = {
  supported: boolean;
  sourceKind?: CashFlowSourceKind;
  reason?: string | null;
  customerMessage?: string | null;
};

export const XERO_US_CASH_FLOW_NOT_SUPPORTED_REASON =
  "xero_us_statement_of_cash_flows_not_available" as const;

export const XERO_CASH_FLOW_NOT_SUPPORTED_REASON =
  "xero_statement_of_cash_flows_not_available_via_accounting_api" as const;

export const XERO_CASH_FLOW_CUSTOMER_MESSAGE =
  "Net operating cash flow is not supported for this Xero configuration." as const;

export const BANK_SUMMARY_FORBIDDEN_AS_CASH_FLOW =
  "bank_summary_is_not_statement_of_cash_flows" as const;

export type CanonicalCashFlowLine = {
  label: string;
  amount: number;
  section: "operating" | "investing" | "financing" | "other";
  hierarchyPath: string[];
  source: CanonicalSourceMetadata;
};

export type CanonicalCashFlowSchedule = {
  startDate: string;
  endDate: string;
  periodType: typeof CASH_FLOW_PERIOD_TYPE;
  netOperatingCashFlow: number | null;
  netInvestingCashFlow: number | null;
  netFinancingCashFlow: number | null;
  netChangeInCash: number | null;
  sourceKind: CashFlowSourceKind;
  provider: AccountingProvider;
  companyId: string | null;
  connectionId: string | null;
  syncId: string | null;
  computedAt: string;
  method: CashFlowMethod;
  supportStatus: CashFlowSupportStatus;
  supportReason: string | null;
  customerMessage: string | null;
  operatingRows: CanonicalCashFlowLine[];
  investingRows: CanonicalCashFlowLine[];
  financingRows: CanonicalCashFlowLine[];
  /** Supporting flattened provider rows when available. */
  rows: CanonicalCashFlowRow[];
  provenance: {
    sourceReport: string | null;
    operatingSubtotalLabel: string | null;
    operatingSubtotalExternalRecordId: string | null;
  };
  reconciliation: {
    status: "not_applicable" | "unchecked" | "pass" | "fail";
    notes: string[];
  };
};

const OPERATING_NET_PATTERNS = [
  /^net cash (provided by|used (by|in)|from) operating activit/i,
  /^net cash.?flows? (from|provided by|used (by|in)) operating/i,
  /^cash (provided by|used (by|in)|from) operating activit/i,
];

const INVESTING_NET_PATTERNS = [
  /^net cash (provided by|used (by|in)|from) investing activit/i,
  /^net cash.?flows? (from|provided by|used (by|in)) investing/i,
];

const FINANCING_NET_PATTERNS = [
  /^net cash (provided by|used (by|in)|from) financing activit/i,
  /^net cash.?flows? (from|provided by|used (by|in)) financing/i,
];

const NET_CHANGE_PATTERNS = [
  /^net (increase|decrease) in cash/i,
  /^net change in cash/i,
  /^net cash increase/i,
  /^net cash decrease/i,
];

function hierarchyPathFromRow(row: CanonicalCashFlowRow): string[] {
  const raw = row.source?.raw;
  if (raw && typeof raw === "object") {
    const path = (raw as Record<string, unknown>).__advisacorHierarchyPath;
    if (Array.isArray(path)) {
      return path.map((p) => String(p || "").trim()).filter(Boolean);
    }
  }
  return row.section ? [row.section, row.label] : [row.label];
}

function classifySection(row: CanonicalCashFlowRow): CanonicalCashFlowLine["section"] {
  const path = hierarchyPathFromRow(row).join(" ").toLowerCase();
  const label = row.label.toLowerCase();
  const blob = `${path} ${label} ${row.section || ""}`;
  if (/operating/.test(blob)) return "operating";
  if (/investing/.test(blob)) return "investing";
  if (/financing/.test(blob)) return "financing";
  return "other";
}

function findSubtotal(
  rows: CanonicalCashFlowRow[],
  patterns: RegExp[],
): { row: CanonicalCashFlowRow; amount: number } | null {
  for (const row of rows) {
    if (!patterns.some((p) => p.test(row.label))) continue;
    return { row, amount: Number(row.amount) || 0 };
  }
  return null;
}

function toLine(row: CanonicalCashFlowRow): CanonicalCashFlowLine {
  return {
    label: row.label,
    amount: Number(row.amount) || 0,
    section: classifySection(row),
    hierarchyPath: hierarchyPathFromRow(row),
    source: row.source,
  };
}

export function xeroCashFlowCapability(input: {
  countryCode?: string | null;
}): CanonicalCashFlowCapability {
  const country = String(input.countryCode || "").trim().toUpperCase();
  const isUs = country === "US" || country === "USA" || country === "UNITED STATES";
  return {
    supported: false,
    sourceKind: "not_supported",
    reason: isUs ? XERO_US_CASH_FLOW_NOT_SUPPORTED_REASON : XERO_CASH_FLOW_NOT_SUPPORTED_REASON,
    customerMessage: XERO_CASH_FLOW_CUSTOMER_MESSAGE,
  };
}

export function buildNotSupportedCashFlowSchedule(input: {
  endDate: string;
  provider: AccountingProvider;
  companyId?: string | null;
  connectionId?: string | null;
  syncId?: string | null;
  computedAt?: string;
  reason: string;
  customerMessage: string;
}): CanonicalCashFlowSchedule {
  const window = trailingTwelveMonthPeriod(input.endDate);
  return {
    startDate: window.startDate,
    endDate: window.endDate,
    periodType: CASH_FLOW_PERIOD_TYPE,
    netOperatingCashFlow: null,
    netInvestingCashFlow: null,
    netFinancingCashFlow: null,
    netChangeInCash: null,
    sourceKind: "not_supported",
    provider: input.provider,
    companyId: input.companyId ?? null,
    connectionId: input.connectionId ?? null,
    syncId: input.syncId ?? null,
    computedAt: input.computedAt || new Date().toISOString(),
    method: "not_applicable",
    supportStatus: "not_supported",
    supportReason: input.reason,
    customerMessage: input.customerMessage,
    operatingRows: [],
    investingRows: [],
    financingRows: [],
    rows: [],
    provenance: {
      sourceReport: null,
      operatingSubtotalLabel: null,
      operatingSubtotalExternalRecordId: null,
    },
    reconciliation: {
      status: "not_applicable",
      notes: [input.reason],
    },
  };
}

/**
 * Build a supported schedule from provider Statement of Cash Flows rows.
 * Returns unavailable/error schedules when rows are missing or operating
 * subtotal cannot be extracted — never invents zero.
 */
export function buildCanonicalCashFlowScheduleFromProviderRows(input: {
  endDate: string;
  rows: CanonicalCashFlowRow[];
  provider: AccountingProvider;
  companyId?: string | null;
  connectionId?: string | null;
  syncId?: string | null;
  computedAt?: string;
  sourceReport?: string;
}): CanonicalCashFlowSchedule {
  const window = trailingTwelveMonthPeriod(input.endDate);
  const base = {
    startDate: window.startDate,
    endDate: window.endDate,
    periodType: CASH_FLOW_PERIOD_TYPE as typeof CASH_FLOW_PERIOD_TYPE,
    provider: input.provider,
    companyId: input.companyId ?? null,
    connectionId: input.connectionId ?? null,
    syncId: input.syncId ?? null,
    computedAt: input.computedAt || new Date().toISOString(),
    method: "provider_statement" as const,
    sourceKind: "provider_statement_of_cash_flows" as const,
    operatingRows: [] as CanonicalCashFlowLine[],
    investingRows: [] as CanonicalCashFlowLine[],
    financingRows: [] as CanonicalCashFlowLine[],
    rows: input.rows || [],
    customerMessage: null as string | null,
  };

  if (!input.rows?.length) {
    return {
      ...base,
      netOperatingCashFlow: null,
      netInvestingCashFlow: null,
      netFinancingCashFlow: null,
      netChangeInCash: null,
      supportStatus: "unavailable",
      supportReason: "provider_statement_of_cash_flows_missing",
      provenance: {
        sourceReport: input.sourceReport || "CashFlow",
        operatingSubtotalLabel: null,
        operatingSubtotalExternalRecordId: null,
      },
      reconciliation: {
        status: "fail",
        notes: ["Provider Statement of Cash Flows returned no rows."],
      },
    };
  }

  const lines = input.rows.map(toLine);
  const operatingRows = lines.filter((l) => l.section === "operating");
  const investingRows = lines.filter((l) => l.section === "investing");
  const financingRows = lines.filter((l) => l.section === "financing");

  const operating = findSubtotal(input.rows, OPERATING_NET_PATTERNS);
  if (!operating) {
    return {
      ...base,
      operatingRows,
      investingRows,
      financingRows,
      netOperatingCashFlow: null,
      netInvestingCashFlow: findSubtotal(input.rows, INVESTING_NET_PATTERNS)?.amount ?? null,
      netFinancingCashFlow: findSubtotal(input.rows, FINANCING_NET_PATTERNS)?.amount ?? null,
      netChangeInCash: findSubtotal(input.rows, NET_CHANGE_PATTERNS)?.amount ?? null,
      supportStatus: "error",
      supportReason: "operating_cash_flow_subtotal_not_found",
      customerMessage: "Net operating cash flow could not be extracted from the Statement of Cash Flows.",
      provenance: {
        sourceReport: input.sourceReport || input.rows[0]?.source?.sourceReport || "CashFlow",
        operatingSubtotalLabel: null,
        operatingSubtotalExternalRecordId: null,
      },
      reconciliation: {
        status: "fail",
        notes: ["Could not locate Net cash from operating activities subtotal on provider SoCF."],
      },
    };
  }

  const investing = findSubtotal(input.rows, INVESTING_NET_PATTERNS);
  const financing = findSubtotal(input.rows, FINANCING_NET_PATTERNS);
  const netChange = findSubtotal(input.rows, NET_CHANGE_PATTERNS);
  const externalRecordId = String(
    operating.row.source?.externalRecordId ||
      operating.row.label ||
      "operating-subtotal",
  );

  return {
    ...base,
    operatingRows,
    investingRows,
    financingRows,
    netOperatingCashFlow: operating.amount,
    netInvestingCashFlow: investing?.amount ?? null,
    netFinancingCashFlow: financing?.amount ?? null,
    netChangeInCash: netChange?.amount ?? null,
    supportStatus: "supported",
    supportReason: null,
    provenance: {
      sourceReport: input.sourceReport || operating.row.source?.sourceReport || "CashFlow",
      operatingSubtotalLabel: operating.row.label,
      operatingSubtotalExternalRecordId: externalRecordId,
    },
    reconciliation: {
      status: "unchecked",
      notes: ["Operating subtotal taken from provider Statement of Cash Flows."],
    },
  };
}

/** Guard: BankSummary / bank entities must never become a cash-flow schedule. */
export function assertNotBankSummaryCashFlowSource(sourceReport: string | null | undefined): void {
  const report = String(sourceReport || "");
  if (/bank\s*summary/i.test(report) || report === "BankSummary") {
    const err = new Error(BANK_SUMMARY_FORBIDDEN_AS_CASH_FLOW);
    (err as Error & { code?: string }).code = BANK_SUMMARY_FORBIDDEN_AS_CASH_FLOW;
    throw err;
  }
}

export function scorecardNetOperatingCashFlow(
  schedule: CanonicalCashFlowSchedule | null | undefined,
): number | null {
  if (!schedule) return null;
  if (schedule.supportStatus !== "supported") return null;
  if (typeof schedule.netOperatingCashFlow !== "number") return null;
  return schedule.netOperatingCashFlow;
}

/** Scorecard prop shape from canonical schedule (provider-neutral). */
export function toScorecardCashFlowTrailing(
  schedule: CanonicalCashFlowSchedule | null | undefined,
): {
  netOperatingCashFlow: number | null;
  supportStatus: CashFlowSupportStatus;
  supportReason: string | null;
  customerMessage: string | null;
} | null {
  if (!schedule) return null;
  return {
    netOperatingCashFlow:
      typeof schedule.netOperatingCashFlow === "number" ? schedule.netOperatingCashFlow : null,
    supportStatus: schedule.supportStatus,
    supportReason: schedule.supportReason,
    customerMessage: schedule.customerMessage,
  };
}
