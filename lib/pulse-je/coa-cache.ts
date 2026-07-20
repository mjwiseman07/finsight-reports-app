import { resolveQBOTokenForFirmClient } from "@/lib/erp/quickbooks/token-resolver";
import { qboApiFetch } from "@/lib/qbo/api-fetch.js";
import type { ResolvedAccountCandidate } from "./types";

// 60s per firm_client cache. In-memory only — no persisted table.

type CacheEntry = {
  fetched_at_ms: number;
  accounts: ResolvedAccountCandidate[];
};

const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

function qboApiBase(): string {
  return process.env.QB_ENVIRONMENT === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

function normalize(row: Record<string, unknown>): ResolvedAccountCandidate {
  const name = String(row?.Name || "").trim();
  const fq = String(row?.FullyQualifiedName || name).trim();
  const currencyRef = row?.CurrencyRef as { value?: string } | undefined;
  return {
    qbo_id: String(row?.Id || ""),
    fully_qualified_name: fq,
    name,
    account_type: String(row?.AccountType || ""),
    account_sub_type: row?.AccountSubType ? String(row.AccountSubType) : undefined,
    currency_code: currencyRef?.value ? String(currencyRef.value) : undefined,
    active: row?.Active !== false,
    match_kind: "exact",
    match_score: 0,
  };
}

async function loadFromQbo(firmClientId: string): Promise<ResolvedAccountCandidate[]> {
  // Prefer the shipped firm_client → owner → accounting_connections resolver
  // (accounting_connections has no firm_client_id column).
  const token = await resolveQBOTokenForFirmClient(firmClientId);
  if (!token?.accessToken || !token.realmId) {
    throw new Error(`no_active_qbo_connection_for_firm_client:${firmClientId}`);
  }

  const query =
    "SELECT Id, Name, FullyQualifiedName, AccountType, AccountSubType, CurrencyRef, Active " +
    "FROM Account WHERE Active IN (true, false) MAXRESULTS 1000";
  const url = `${qboApiBase()}/v3/company/${token.realmId}/query?query=${encodeURIComponent(query)}&minorversion=70`;
  const resp = await qboApiFetch(url, {
    accessToken: token.accessToken,
    method: "GET",
    context: { userId: token.ownerUserId, realmId: token.realmId },
  });
  if (!resp.ok) {
    throw new Error(
      `qbo_coa_query_failed:${resp.status}:${resp.json?.Fault?.Error?.[0]?.Message || "unknown"}`,
    );
  }
  const rows = resp.json?.QueryResponse?.Account || [];
  return (Array.isArray(rows) ? rows : []).map(normalize);
}

export async function getCoaForFirmClient(
  firmClientId: string,
  opts?: { forceRefresh?: boolean },
): Promise<{ accounts: ResolvedAccountCandidate[]; fromCache: boolean; ttlSeconds: number }> {
  const now = Date.now();
  const entry = CACHE.get(firmClientId);
  if (!opts?.forceRefresh && entry && now - entry.fetched_at_ms < TTL_MS) {
    return { accounts: entry.accounts, fromCache: true, ttlSeconds: 60 };
  }
  const accounts = await loadFromQbo(firmClientId);
  CACHE.set(firmClientId, { fetched_at_ms: now, accounts });
  return { accounts, fromCache: false, ttlSeconds: 60 };
}

export function invalidateCoaCache(firmClientId: string) {
  CACHE.delete(firmClientId);
}
