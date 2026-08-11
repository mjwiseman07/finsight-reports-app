// WBP W1b — Forbidden-account rules per provider.
// Sources: WBP W0.5 spike (Xero silent-strip finding 3A) + Intuit QBO docs.
// PARITY doc: docs/wbp/PARITY_XERO_QBO_STATUS.md.
//
// Client-side enforcement is CRITICAL — Xero silently strips forbidden lines
// with HTTP 200. QBO behaviour still ❓ in PARITY doc; W1c smoke will fill it in.

import type { XeroAccountSnapshot, QboAccountSnapshot } from "./types";

// --- Xero ---

const XERO_FORBIDDEN_TYPES: ReadonlySet<string> = new Set(["BANK"]);
const XERO_FORBIDDEN_SYSTEM_ACCOUNTS: ReadonlySet<string> = new Set([
  "DEBTORS",
  "CREDITORS",
  "RETAINEDEARNINGS",
  "SALESTAXPAYABLE",
  "SALESTAXRECEIVABLE",
  "UNPAIDEXPCLM",
  "HISTADJUSTMENT",
  "GST",
  "GSTONIMPORTS",
]);

export type ForbiddenAccountReason = {
  forbidden: boolean;
  reasonCode?: "forbidden-type" | "forbidden-system-account";
  detail?: string;
};

export function isForbiddenXeroAccount(account: XeroAccountSnapshot): ForbiddenAccountReason {
  if (XERO_FORBIDDEN_TYPES.has(account.account_type)) {
    return {
      forbidden: true,
      reasonCode: "forbidden-type",
      detail: `Xero Account.Type="${account.account_type}" cannot appear in ManualJournal lines`,
    };
  }
  if (account.system_account && XERO_FORBIDDEN_SYSTEM_ACCOUNTS.has(account.system_account)) {
    return {
      forbidden: true,
      reasonCode: "forbidden-system-account",
      detail: `Xero SystemAccount="${account.system_account}" cannot appear in ManualJournal lines (Xero silently strips per W0.5 finding 3A)`,
    };
  }
  return { forbidden: false };
}

// --- QBO ---

const QBO_FORBIDDEN_TYPES: ReadonlySet<string> = new Set([
  "Bank",
  "Accounts Receivable",
  "Accounts Payable",
  "Credit Card",
]);
const QBO_FORBIDDEN_SUB_TYPES: ReadonlySet<string> = new Set([
  "OpeningBalanceEquity",
  "RetainedEarnings",
  "UndepositedFunds",
]);

export function isForbiddenQboAccount(account: QboAccountSnapshot): ForbiddenAccountReason {
  if (QBO_FORBIDDEN_TYPES.has(account.account_type)) {
    return {
      forbidden: true,
      reasonCode: "forbidden-type",
      detail: `QBO AccountType="${account.account_type}" cannot appear in JournalEntry lines`,
    };
  }
  if (account.account_sub_type && QBO_FORBIDDEN_SUB_TYPES.has(account.account_sub_type)) {
    return {
      forbidden: true,
      reasonCode: "forbidden-system-account",
      detail: `QBO AccountSubType="${account.account_sub_type}" cannot appear in JournalEntry lines`,
    };
  }
  return { forbidden: false };
}

// --- Public helpers ---

/**
 * Snapshot the current forbidden allowlists. Used by the PARITY doc snapshot
 * generator (future) and by tests to assert the module hasn't quietly widened
 * the rules.
 */
export function forbiddenRulesSnapshot() {
  return {
    xero: {
      types: Array.from(XERO_FORBIDDEN_TYPES).sort(),
      system_accounts: Array.from(XERO_FORBIDDEN_SYSTEM_ACCOUNTS).sort(),
    },
    qbo: {
      types: Array.from(QBO_FORBIDDEN_TYPES).sort(),
      sub_types: Array.from(QBO_FORBIDDEN_SUB_TYPES).sort(),
    },
  };
}
