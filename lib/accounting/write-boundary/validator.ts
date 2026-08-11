// WBP W1b — Pre-flight validator. Runs BEFORE any provider call.
// Returns { valid: false, issues: [...] } if the JournalEntry violates any rule.
// Callers (W1c adapters) throw WriteRejected(issues) and emit write-rejected
// lifecycle event. Provider is NEVER called on invalid input.

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  JournalEntry,
  ValidationIssue,
  ValidationResult,
  WriteBoundaryConnection,
} from "./types";
import { isForbiddenXeroAccount, isForbiddenQboAccount } from "./forbidden-accounts";
import { readXeroAccounts, readQboAccounts } from "./accounts-cache-repo";
import { findPriorWriteByExternalRef } from "./idempotency";

const EPSILON = 0.01; // 1 cent tolerance for float rounding

export async function validateJournalEntry(
  admin: SupabaseClient,
  entry: JournalEntry,
  connection: WriteBoundaryConnection,
): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  // Structural checks (fast, no DB) --------------------------------------
  if (!entry.narration || entry.narration.trim().length === 0) {
    issues.push({ code: "missing-narration", message: "narration is required" });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.journalDate)) {
    issues.push({
      code: "invalid-date",
      message: `journalDate must be YYYY-MM-DD; got "${entry.journalDate}"`,
    });
  }

  if (!entry.lines || entry.lines.length < 2) {
    issues.push({
      code: "insufficient-lines",
      message: `at least 2 lines required; got ${entry.lines?.length ?? 0}`,
    });
  }

  if (entry.tenantId !== connection.tenant_or_realm_id) {
    issues.push({
      code: "currency-mismatch", // reusing enum; add "tenant-mismatch" in a future widen if needed
      message: `entry.tenantId (${entry.tenantId}) does not match connection.tenant_or_realm_id (${connection.tenant_or_realm_id})`,
    });
  }

  if (connection.home_currency && entry.currency !== connection.home_currency) {
    issues.push({
      code: "currency-mismatch",
      message: `entry.currency (${entry.currency}) does not match connection.home_currency (${connection.home_currency}); multi-currency deferred to W1.5`,
    });
  }

  // Line-level checks ----------------------------------------------------
  let debits = 0;
  let credits = 0;
  entry.lines?.forEach((line, i) => {
    if ((line.debit ?? 0) < 0 || (line.credit ?? 0) < 0) {
      issues.push({
        code: "zero-amount-line",
        message: `line ${i}: negative amounts forbidden; use opposite side`,
        lineIndex: i,
      });
    }
    if ((line.debit ?? 0) === 0 && (line.credit ?? 0) === 0) {
      issues.push({
        code: "zero-amount-line",
        message: `line ${i}: must have non-zero debit OR credit`,
        lineIndex: i,
      });
    }
    if ((line.debit ?? 0) > 0 && (line.credit ?? 0) > 0) {
      issues.push({
        code: "zero-amount-line",
        message: `line ${i}: cannot have both debit and credit`,
        lineIndex: i,
      });
    }
    if (!line.accountCode || line.accountCode.trim().length === 0) {
      issues.push({
        code: "unknown-account-code",
        message: `line ${i}: accountCode is required`,
        lineIndex: i,
      });
    }
    debits += line.debit ?? 0;
    credits += line.credit ?? 0;
  });

  if (Math.abs(debits - credits) > EPSILON) {
    issues.push({
      code: "unbalanced-lines",
      message: `debits (${debits.toFixed(2)}) do not equal credits (${credits.toFixed(2)})`,
    });
  }

  // If structural issues, skip DB-dependent checks --------------------
  if (issues.length > 0) return { valid: false, issues };

  // Account-existence + forbidden-account checks (require accounts cache)
  if (connection.provider === "xero") {
    const accounts = await readXeroAccounts(admin, connection.id);
    const byCode = new Map(accounts.map((a) => [a.account_code, a]));
    entry.lines.forEach((line, i) => {
      const acct = byCode.get(line.accountCode);
      if (!acct) {
        issues.push({
          code: "unknown-account-code",
          message: `line ${i}: Xero account code "${line.accountCode}" not found in accounts cache; refresh cache or verify code`,
          lineIndex: i,
          accountCode: line.accountCode,
        });
        return;
      }
      const forbidden = isForbiddenXeroAccount(acct);
      if (forbidden.forbidden) {
        issues.push({
          code: "forbidden-account",
          message: `line ${i}: ${forbidden.detail}`,
          lineIndex: i,
          accountCode: line.accountCode,
          systemAccount: acct.system_account ?? undefined,
          accountType: acct.account_type,
        });
      }
    });
  } else if (connection.provider === "quickbooks") {
    const accounts = await readQboAccounts(admin, connection.id);
    const byId = new Map(accounts.map((a) => [a.account_id, a]));
    entry.lines.forEach((line, i) => {
      const acct = byId.get(line.accountCode);
      if (!acct) {
        issues.push({
          code: "unknown-account-code",
          message: `line ${i}: QBO account ID "${line.accountCode}" not found in accounts cache; refresh cache or verify ID`,
          lineIndex: i,
          accountCode: line.accountCode,
        });
        return;
      }
      const forbidden = isForbiddenQboAccount(acct);
      if (forbidden.forbidden) {
        issues.push({
          code: "forbidden-account",
          message: `line ${i}: ${forbidden.detail}`,
          lineIndex: i,
          accountCode: line.accountCode,
          systemAccount: acct.account_sub_type ?? undefined,
          accountType: acct.account_type,
        });
      }
    });
  }

  // Idempotency check ---------------------------------------------------
  const prior = await findPriorWriteByExternalRef(admin, connection.id, entry.externalRef);
  if (prior) {
    issues.push({
      code: "duplicate-external-ref",
      message: `externalRef "${entry.externalRef}" already used for lifecycle event ${prior.id} (event_kind=${prior.event_kind}); use a fresh externalRef or query the prior receipt`,
    });
  }

  return { valid: issues.length === 0, issues };
}
