/**
 * D4 Path B — Inconsistency Scanner (read-only, advisory).
 *
 * Scans recently posted transactions for vendor→account choices that conflict
 * with a confident D3 vendor_gl_mapping pattern. Output is advisory review
 * notes for D8b/D10 — it never emits proposals, never posts JEs, and never
 * modifies human-posted work.
 */
import { getQboForFirmClient } from "@/lib/qbo-for-firm-client.js";
import { qboQuery, extractQueryEntities } from "@/lib/qbo-rest";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { wilsonScoreLower } from "@/lib/learning/confidence";
import { findUncategorizedAccounts } from "@/lib/learning/uncategorized-detector";
import type { Inconsistency } from "@/lib/learning/types-d4";

export type InconsistencyScanInput = {
  firmClientId: string;
  since?: string; // YYYY-MM-DD, default 90d ago
  minConfidence?: number; // default 0.70 per spec §3 Path B
};

export type InconsistencyScanOutput = {
  inconsistencies: Inconsistency[];
  scanned_txns: number;
  vendors_with_patterns: number;
  scan_ms: number;
};

const QUERY_ENTITIES = ["Purchase", "Bill", "JournalEntry", "Deposit"] as const;
const PER_ENTITY_SLEEP_MS = 250;

function defaultSince(): string {
  return new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function is429(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b429\b/.test(msg) || /too many requests/i.test(msg);
}

async function queryWithRetry(
  accessToken: string,
  realmId: string,
  sql: string,
  entityName: string,
): Promise<Record<string, unknown>[]> {
  try {
    return extractQueryEntities(await qboQuery(accessToken, realmId, sql), entityName);
  } catch (err) {
    if (!is429(err)) throw err;
    await sleep(5000);
    return extractQueryEntities(await qboQuery(accessToken, realmId, sql), entityName);
  }
}

type Ref = { value?: string; name?: string; type?: string } | undefined;

interface VendorPattern {
  pattern_account_id: string;
  pattern_account_name: string;
  pattern_confidence: number;
  pattern_sample_count: number;
}

function lineAccountRef(line: Record<string, unknown>): Ref {
  const detail =
    (line.AccountBasedExpenseLineDetail as Record<string, unknown> | undefined) ??
    (line.JournalEntryLineDetail as Record<string, unknown> | undefined) ??
    (line.DepositLineDetail as Record<string, unknown> | undefined);
  return detail?.AccountRef as Ref;
}

function vendorFrom(
  txn: Record<string, unknown>,
  line: Record<string, unknown>,
): { vendor_id: string | null; vendor_name: string | null } {
  const top = (txn.EntityRef as Ref) ?? (txn.VendorRef as Ref);
  if (top?.value && (!top.type || top.type === "Vendor")) {
    return { vendor_id: top.value, vendor_name: top.name ?? null };
  }
  const lineDetail =
    (line.JournalEntryLineDetail as Record<string, unknown> | undefined) ??
    (line.DepositLineDetail as Record<string, unknown> | undefined);
  const entity = lineDetail?.Entity as { Type?: string; EntityRef?: Ref } | undefined;
  if (entity?.EntityRef?.value && (!entity.Type || entity.Type === "Vendor")) {
    return { vendor_id: entity.EntityRef.value, vendor_name: entity.EntityRef.name ?? null };
  }
  return { vendor_id: null, vendor_name: null };
}

export async function scanForInconsistencies(
  input: InconsistencyScanInput,
): Promise<InconsistencyScanOutput> {
  const start = performance.now();
  const since = input.since ?? defaultSince();
  const minConfidence = input.minConfidence ?? 0.7;

  const { accessToken, realmId } = await getQboForFirmClient(input.firmClientId);

  // Resolve company_id — vendor_gl_mapping patterns are scoped by company_id,
  // and sample/matching counts live inside payload (not top-level columns).
  const supabase = getSupabaseAdmin();
  const { data: fc, error: fcErr } = await supabase
    .from("firm_clients")
    .select("company_id")
    .eq("id", input.firmClientId)
    .maybeSingle();
  if (fcErr) throw new Error(`firm_clients lookup failed: ${fcErr.message}`);
  if (!fc?.company_id) {
    throw new Error(`firm_client ${input.firmClientId} has no company_id`);
  }

  const { data: patternRows, error: patErr } = await supabase
    .from("company_memory_records")
    .select("memory_id, payload")
    .eq("company_id", fc.company_id)
    .eq("memory_type", "vendor_gl_mapping");
  if (patErr) throw new Error(`vendor_gl_mapping query failed: ${patErr.message}`);

  const vendorPatterns = new Map<string, VendorPattern>();
  for (const row of patternRows ?? []) {
    const payload = (row.payload as Record<string, unknown>) ?? {};
    const vendorId = payload.vendor_id as string | undefined;
    const accountId = payload.account_id as string | undefined;
    if (!vendorId || !accountId) continue;
    const sampleCount = Number(payload.sample_count) || 0;
    const matchingCount = Number(payload.matching_count) || 0;
    const confidence = wilsonScoreLower(matchingCount, sampleCount);
    if (confidence < minConfidence || sampleCount < 3) continue;

    // Keep the strongest pattern per vendor.
    const existing = vendorPatterns.get(vendorId);
    if (existing && existing.pattern_confidence >= confidence) continue;
    vendorPatterns.set(vendorId, {
      pattern_account_id: accountId,
      pattern_account_name: (payload.account_name as string) || "(unknown)",
      pattern_confidence: Number(confidence.toFixed(3)),
      pattern_sample_count: sampleCount,
    });
  }

  // Uncategorized buckets are Path A territory — exclude them here.
  const uncategorizedAccounts = await findUncategorizedAccounts(accessToken, realmId);
  const bucketIds = new Set(uncategorizedAccounts.map((a) => a.account_id));

  const inconsistencies: Inconsistency[] = [];
  let scannedTxns = 0;
  let first = false; // findUncategorizedAccounts already issued one query

  for (const entity of QUERY_ENTITIES) {
    if (first) await sleep(PER_ENTITY_SLEEP_MS);
    first = true;

    const sql = `SELECT * FROM ${entity} WHERE TxnDate >= '${since}' MAXRESULTS 1000`;
    const rows = await queryWithRetry(accessToken, realmId, sql, entity);

    for (const txn of rows) {
      scannedTxns += 1;
      const txnId = String(txn.Id ?? "");
      const txnDate = String(txn.TxnDate ?? "");
      const lines = (txn.Line as Record<string, unknown>[]) ?? [];

      for (const line of lines) {
        const acctRef = lineAccountRef(line);
        if (!acctRef?.value || bucketIds.has(acctRef.value)) continue;

        const { vendor_id, vendor_name } = vendorFrom(txn, line);
        if (!vendor_id) continue;

        const pattern = vendorPatterns.get(vendor_id);
        if (!pattern) continue;
        if (pattern.pattern_account_id === acctRef.value) continue; // consistent

        inconsistencies.push({
          txn_id: txnId,
          txn_date: txnDate,
          vendor_id,
          vendor_name: vendor_name ?? "",
          posted_account_id: acctRef.value,
          posted_account_name: acctRef.name ?? "(unknown)",
          pattern_account_id: pattern.pattern_account_id,
          pattern_account_name: pattern.pattern_account_name,
          pattern_confidence: pattern.pattern_confidence,
          pattern_sample_count: pattern.pattern_sample_count,
        });
      }
    }
  }

  return {
    inconsistencies,
    scanned_txns: scannedTxns,
    vendors_with_patterns: vendorPatterns.size,
    scan_ms: performance.now() - start,
  };
}
