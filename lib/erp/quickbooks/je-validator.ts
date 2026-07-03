/**
 * JE Validator (Doc D2).
 *
 * Pure guardrails run before any QBO write: balance, line completeness,
 * locked-period rejection, and live account-existence verification.
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import type { JEPayload } from "@/lib/erp/types";

export type ValidationResult =
  | { valid: true }
  | { valid: false; reason: string; details?: unknown };

// Env-aware base URL: the sandbox realm/token only works against the sandbox host.
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

  // 3. Locked period check — reject if txn date falls inside a period with
  //    status IN ('locked','signed_off').
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

  return { valid: true };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// A single account's existence check. An HTTP 200 is authoritative — whether the
// account is found or not, we return immediately (zero retry latency on the happy
// path AND on a genuine "account not found"). Retries fire ONLY on transient QBO
// faults (429 rate-limit or 5xx application/system faults), which is what caused
// the earlier bulk-post flakiness under load.
async function accountExists(
  realmId: string,
  accessToken: string,
  accountId: string,
): Promise<boolean> {
  const maxAttempts = 3;
  const query = encodeURIComponent(`SELECT Id FROM Account WHERE Id = '${accountId}'`);
  const url = `${qboApiBase()}/v3/company/${realmId}/query?query=${query}&minorversion=73`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });

    if (resp.ok) {
      const data = await resp.json();
      const rows = data?.QueryResponse?.Account;
      return Array.isArray(rows) ? rows.length > 0 : !!rows;
    }

    // Non-2xx: retry only on transient faults; otherwise treat as not found.
    const transient = resp.status === 429 || resp.status >= 500;
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
  // Parallel per-account checks keep wall-clock ≈ one round trip on the happy path.
  const checks = await Promise.all(
    accountIds.map(async (id) => ({ id, exists: await accountExists(realmId, accessToken, id) })),
  );
  const missing = checks.filter((c) => !c.exists).map((c) => c.id);
  return missing.length === 0 ? { valid: true } : { valid: false, missing };
}
