/**
 * QuickBooks Online report group / section token humanization.
 *
 * QBO (US and CA) often emits camelCase report group IDs such as
 * `BankAccounts` and `TotalAssets`. The shared Scorecard cash / BS selectors
 * consume the canonical human section contract already emitted by Xero
 * (`Bank Accounts`, `Assets`, …). Mapping belongs in the QBO adapter boundary —
 * never teach shared KPI math provider-specific strings like "Chequing".
 */

/** Explicit QBO group → canonical section labels (Xero-compatible). */
const QBO_GROUP_TOKEN_MAP: Record<string, string> = {
  TotalAssets: "Assets",
  CurrentAssets: "Current Assets",
  OtherCurrentAssets: "Other Current Assets",
  BankAccounts: "Bank Accounts",
  AccountsReceivable: "Accounts Receivable",
  OtherAssets: "Other Assets",
  FixedAssets: "Fixed Assets",
  TotalLiabilities: "Liabilities",
  CurrentLiabilities: "Current Liabilities",
  LongTermLiabilities: "Long-Term Liabilities",
  AccountsPayable: "Accounts Payable",
  CreditCards: "Credit Cards",
  Equity: "Equity",
  NetIncome: "Net Income",
  Income: "Income",
  CostOfGoodsSold: "Cost of Sales",
  COGS: "Cost of Sales",
  Expenses: "Expenses",
  OtherIncome: "Other Income",
  OtherExpenses: "Other Expenses",
  OperatingActivities: "Operating Activities",
  InvestingActivities: "Investing Activities",
  FinancingActivities: "Financing Activities",
  OperatingAdjustments: "Operating Adjustments",
};

/**
 * Humanize a single QBO report group / hierarchy token.
 * Leaves already-spaced labels (and localized account names like Chequing) unchanged.
 */
export function humanizeQuickBooksReportToken(token: string): string {
  const trimmed = String(token || "").trim();
  if (!trimmed) return trimmed;
  if (QBO_GROUP_TOKEN_MAP[trimmed]) return QBO_GROUP_TOKEN_MAP[trimmed];
  // Already human (contains whitespace or lowercase words) — leave alone.
  if (/\s/.test(trimmed) || /[a-z]/.test(trimmed) && !/^[A-Z][A-Za-z0-9]*$/.test(trimmed)) {
    return trimmed;
  }
  // Generic camelCase / PascalCase split for unknown QBO group ids.
  if (/^[A-Z][A-Za-z0-9]+$/.test(trimmed)) {
    return trimmed
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
  }
  return trimmed;
}

/** Map CA / US net-income stub labels onto the canonical Net Income label. */
export function humanizeQuickBooksPnLLabel(label: string, section: string): string {
  const trimmed = String(label || "").trim();
  if (!trimmed) return trimmed;
  if (/^profit$/i.test(trimmed) && /net\s*income/i.test(section)) {
    return "Net Income";
  }
  return trimmed;
}
