/**
 * JE Validator (Doc D2, Phase MC-3 extended).
 *
 * Pure guardrails run before any QBO write: balance, line completeness,
 * locked-period rejection, live account-existence verification, and
 * (MC-3) currency-active verification.
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { qboApiFetch } from "../../qbo/api-fetch.js";
import type { JEPayload } from "@/lib/erp/types";

export type ValidationResult =
  | { valid: true }
  | { valid: false; reason: string; details?: unknown };

function qboApiBase(): string {
  return process.env.QB_ENVIRONMENT === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

export async function validateJEPayload(
  firmClientId: string,
  payload: JEPayload,
  realmId: string,
  accessToken: string,
  resolvedCurrency?: string,
  homeCurrency?: string,
): Promise<ValidationResult> {
  // 1. Balance check (tolerance 0.005)
  const drTotal = payload.lines
    .filter((l) => l.posting_type === "Debit")
    .reduce((s, l) => s + Number(l.amount), 0);
  const crTotal = payload.lines
    .filter((l) => l.posting_type === "Credit")
    .reduce((s, l) => s + Number(l.amount), 0);
  if (Math.abs(drTotal - crTotal) > 0.005) {
    return { valid: false, reason: "unbalanced", details: { drTotal, crTotal } };
  }

  // 2. Line completeness
  for (const [i, line] of payload.lines.entries()) {
    if (!line.account_id) return { valid: false, reason: "missing_account_id", details: { line: i } };
    if (!line.amount || line.amount <= 0) return { valid: false, reason: "invalid_amount", details: { line: i } };
    if (!["Debit", "Credit"].includes(line.posting_type)) {
      return { valid: false, reason: "invalid_posting_type", details: { line: i } };
    }
  }

  // 3. Locked period check
  const supabase = getSupabaseAdmin();
  const { data: lockedPeriod } = await supabase
    .from("close_periods")
    .select("id, period_start, period_end, status")
    .eq("firm_client_id", firmClientId)
    .in("status", ["locked", "signed_off"])
    .lte("period_start", payload.transaction_date)
    .gte("period_end", payload.transaction_date)
    .maybeSingle();
  if (lockedPeriod) {
    return { valid: false, reason: "period_locked", details: lockedPeriod };
  }

  // 4. Account existence (batched)
  const uniqueAccountIds = [...new Set(payload.lines.map((l) => l.account_id))];
  const accountsValid = await verifyQBOAccountsExist(realmId, accessToken, uniqueAccountIds);
  if (!accountsValid.valid) {
    return { valid: false, reason: "invalid_account_id", details: accountsValid.missing };
  }

  // 5. MC-3: currency-active verification. Fast-path when currency === home
  //    (always active by definition). Only queries when caller supplied a
  //    resolved currency (poster always does post-MC-3; legacy callers do not).
  if (resolvedCurrency && homeCurrency) {
    if (resolvedCurrency.toUpperCase() !== homeCurrency.toUpperCase()) {
      const active = await verifyCurrencyActive(realmId, accessToken, resolvedCurrency);
      if (!active) {
        return {
          valid: false,
          reason: "currency_not_active",
          details: { currency: resolvedCurrency },
        };
      }
    }
  }

  return { valid: true };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function accountExists(
  realmId: string,
  accessToken: string,
  accountId: string,
): Promise<boolean> {
  const maxAttempts = 3;
  const query = encodeURIComponent(`SELECT Id FROM Account WHERE Id = '${accountId}'`);
  const url = `${qboApiBase()}/v3/company/${realmId}/query?query=${query}&minorversion=73`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { ok, status, json } = await qboApiFetch(url, {
      accessToken,
      method: "GET",
    });
    if (ok) {
      const rows = json?.QueryResponse?.Account;
      return Array.isArray(rows) ? rows.length > 0 : !!rows;
    }
    const transient = status === 429 || status >= 500;
    if (!transient || attempt === maxAttempts) return false;
    await sleep(800 * attempt);
  }
  return false;
}

async function verifyQBOAccountsExist(
  realmId: string,
  accessToken: string,
  accountIds: string[],
): Promise<{ valid: boolean; missing?: string[] }> {
  const checks = await Promise.all(
    accountIds.map(async (id) => ({ id, exists: await accountExists(realmId, accessToken, id) })),
  );
  const missing = checks.filter((c) => !c.exists).map((c) => c.id);
  return missing.length === 0 ? { valid: true } : { valid: false, missing };
}

// MC-3: verify currency is in the QBO active currency list.
async function verifyCurrencyActive(
  realmId: string,
  accessToken: string,
  currency: string,
): Promise<boolean> {
  const maxAttempts = 3;
  const upper = currency.toUpperCase();
  const query = encodeURIComponent(
    `SELECT Id, Code FROM CompanyCurrency WHERE Code = '${upper}'`,
  );
  const url = `${qboApiBase()}/v3/company/${realmId}/query?query=${query}&minorversion=73`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { ok, status, json } = await qboApiFetch(url, {
      accessToken,
      method: "GET",
    });
    if (ok) {
      const rows = json?.QueryResponse?.CompanyCurrency;
      return Array.isArray(rows) ? rows.length > 0 : !!rows;
    }
    const transient = status === 429 || status >= 500;
    if (!transient || attempt === maxAttempts) return false;
    await sleep(800 * attempt);
  }
  return false;
}
