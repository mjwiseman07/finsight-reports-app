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

async function verifyQBOAccountsExist(
  realmId: string,
  accessToken: string,
  accountIds: string[],
): Promise<{ valid: boolean; missing?: string[] }> {
  const idList = accountIds.map((id) => `'${id}'`).join(",");
  const query = encodeURIComponent(`SELECT Id FROM Account WHERE Id IN (${idList})`);
  const resp = await fetch(
    `${qboApiBase()}/v3/company/${realmId}/query?query=${query}&minorversion=73`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );
  if (!resp.ok) {
    return { valid: false, missing: accountIds };
  }
  const data = await resp.json();
  const foundIds = new Set((data?.QueryResponse?.Account ?? []).map((a: { Id: string }) => a.Id));
  const missing = accountIds.filter((id) => !foundIds.has(id));
  return missing.length === 0 ? { valid: true } : { valid: false, missing };
}
