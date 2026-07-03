/**
 * D4 Proposal Composer — turns Path A detector rows + D3 patterns into
 * uncategorized proposal insert shapes with confidence bucketing.
 *
 * Read-only with respect to uncategorized_proposals (no DB inserts here).
 */
import { getQboForFirmClient } from "@/lib/qbo-for-firm-client.js";
import { qboQuery, extractQueryEntities } from "@/lib/qbo-rest";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { wilsonScoreLower } from "@/lib/learning/confidence";
import { amountBucket } from "@/lib/learning/accumulators/recurring-accumulator";
import type { UncategorizedTxn } from "@/lib/learning/uncategorized-detector";
import type {
  UncategorizedProposalConfidenceBucket,
  UncategorizedProposalSource,
  UncategorizedProposalTxnType,
} from "@/lib/learning/types-d4";

export type ComposedProposal = {
  firm_client_id: string;
  scan_run_id: string;
  txn_id: string;
  txn_type: UncategorizedProposalTxnType;
  txn_date: string;
  txn_amount: number;
  txn_memo: string | null;
  vendor_id: string | null;
  vendor_name: string | null;
  current_account_id: string;
  current_account_name: string;
  suggested_account_id: string | null;
  suggested_account_name: string | null;
  suggested_account_type: string | null;
  suggested_account_subtype: string | null;
  source: UncategorizedProposalSource;
  memory_id: string | null;
  confidence: number;
  confidence_bucket: UncategorizedProposalConfidenceBucket;
  sample_count: number;
  status: "pending";
};

export type ComposeProposalsInput = {
  firmClientId: string;
  scanRunId: string;
  txns: UncategorizedTxn[];
};

type PatternMatch = {
  source: UncategorizedProposalSource;
  memory_id: string;
  account_id: string;
  account_name: string;
  confidence: number;
  sample_count: number;
};

type VendorGLPattern = {
  memory_id: string;
  account_id: string;
  account_name: string;
  sample_count: number;
  matching_count: number;
  weak: boolean;
};

type RecurringPattern = {
  memory_id: string;
  vendor_id: string;
  account_id: string;
  account_name: string;
  amount: number;
  sample_count: number;
  confidence: number;
};

type AmountRangePattern = {
  memory_id: string;
  vendor_id: string;
  account_id: string;
  account_name: string;
  p05: number;
  p95: number;
  sample_count: number;
};

type PatternIndex = {
  vendorGl: Map<string, VendorGLPattern[]>;
  recurring: RecurringPattern[];
  amountRange: AmountRangePattern[];
};

const SOURCE_PRIORITY: Record<UncategorizedProposalSource, number> = {
  vendor_gl_mapping: 3,
  recurring_pattern: 2,
  amount_range: 1,
  no_pattern: 0,
};

/** Spec §4 confidence bucketing. Exported for smoke tests. */
export function assignConfidenceBucket(
  source: UncategorizedProposalSource,
  confidence: number,
  sampleCount: number,
): UncategorizedProposalConfidenceBucket {
  if (source === "no_pattern") return "red";
  if (source === "vendor_gl_mapping" && sampleCount >= 5 && confidence >= 0.85) return "green";
  if (source === "recurring_pattern" && confidence >= 0.85) return "green";
  if (sampleCount >= 3 && confidence >= 0.6) return "yellow";
  return "red";
}

function bestVendorGl(patterns: VendorGLPattern[]): VendorGLPattern | null {
  if (patterns.length === 0) return null;
  return [...patterns].sort((a, b) => {
    const ca = wilsonScoreLower(a.matching_count, a.sample_count);
    const cb = wilsonScoreLower(b.matching_count, b.sample_count);
    return cb - ca;
  })[0];
}

function resolvePatternMatch(txn: UncategorizedTxn, index: PatternIndex): PatternMatch | null {
  const candidates: PatternMatch[] = [];

  if (txn.vendor_id) {
    const vendorPatterns = index.vendorGl.get(txn.vendor_id) ?? [];
    const best = bestVendorGl(vendorPatterns);
    if (best) {
      const confidence = wilsonScoreLower(best.matching_count, best.sample_count);
      candidates.push({
        source: "vendor_gl_mapping",
        memory_id: best.memory_id,
        account_id: best.account_id,
        account_name: best.account_name || "(unknown)",
        confidence: Number(confidence.toFixed(3)),
        sample_count: best.sample_count,
      });
    }

    const bucket = amountBucket(txn.txn_amount);
    for (const r of index.recurring) {
      if (r.vendor_id !== txn.vendor_id || r.amount !== bucket) continue;
      candidates.push({
        source: "recurring_pattern",
        memory_id: r.memory_id,
        account_id: r.account_id,
        account_name: r.account_name || "(unknown)",
        confidence: Number(r.confidence.toFixed(3)),
        sample_count: r.sample_count,
      });
    }

    for (const ar of index.amountRange) {
      if (ar.vendor_id !== txn.vendor_id) continue;
      const amt = txn.txn_amount;
      if (amt < ar.p05 || amt > ar.p95) continue;
      const confidence = Number(Math.min(0.84, 0.55 + Math.min(1, (ar.sample_count - 3) / 12)).toFixed(3));
      candidates.push({
        source: "amount_range",
        memory_id: ar.memory_id,
        account_id: ar.account_id,
        account_name: ar.account_name || "(unknown)",
        confidence,
        sample_count: ar.sample_count,
      });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source];
  });
  return candidates[0];
}

async function loadPatternIndex(firmClientId: string): Promise<PatternIndex> {
  const supabase = getSupabaseAdmin();
  const { data: fc, error: fcErr } = await supabase
    .from("firm_clients")
    .select("company_id")
    .eq("id", firmClientId)
    .maybeSingle();
  if (fcErr) throw new Error(`firm_clients lookup failed: ${fcErr.message}`);
  if (!fc?.company_id) throw new Error(`firm_client ${firmClientId} has no company_id`);

  const { data: rows, error } = await supabase
    .from("company_memory_records")
    .select("memory_id, memory_type, payload")
    .eq("company_id", fc.company_id)
    .eq("memory_status", "active")
    .eq("persistence_status", "persisted")
    .in("memory_type", ["vendor_gl_mapping", "recurring_pattern", "amount_range"]);
  if (error) throw new Error(`pattern query failed: ${error.message}`);

  const vendorGl = new Map<string, VendorGLPattern[]>();
  const recurring: RecurringPattern[] = [];
  const amountRange: AmountRangePattern[] = [];

  for (const row of rows ?? []) {
    const payload = (row.payload as Record<string, unknown>) ?? {};
    if (row.memory_type === "vendor_gl_mapping") {
      const vendorId = payload.vendor_id as string | undefined;
      const accountId = payload.account_id as string | undefined;
      if (!vendorId || !accountId) continue;
      const entry: VendorGLPattern = {
        memory_id: row.memory_id,
        account_id: accountId,
        account_name: (payload.account_name as string) ?? "",
        sample_count: Number(payload.sample_count) || 0,
        matching_count: Number(payload.matching_count) || 0,
        weak: Boolean(payload.weak),
      };
      const list = vendorGl.get(vendorId) ?? [];
      list.push(entry);
      vendorGl.set(vendorId, list);
    } else if (row.memory_type === "recurring_pattern") {
      const vendorId = payload.vendor_id as string | undefined;
      const accountId = payload.account_id as string | undefined;
      if (!vendorId || !accountId) continue;
      recurring.push({
        memory_id: row.memory_id,
        vendor_id: vendorId,
        account_id: accountId,
        account_name: (payload.account_name as string) ?? "",
        amount: Number(payload.amount) || 0,
        sample_count: Number(payload.sample_count) || 0,
        confidence: Number(payload.confidence) || 0,
      });
    } else if (row.memory_type === "amount_range") {
      const vendorId = payload.vendor_id as string | undefined;
      const accountId = payload.account_id as string | undefined;
      if (!vendorId || !accountId) continue;
      amountRange.push({
        memory_id: row.memory_id,
        vendor_id: vendorId,
        account_id: accountId,
        account_name: (payload.account_name as string) ?? "",
        p05: Number(payload.p05) || 0,
        p95: Number(payload.p95) || 0,
        sample_count: Number(payload.sample_count) || 0,
      });
    }
  }

  return { vendorGl, recurring, amountRange };
}

async function hydrateAccountMeta(
  firmClientId: string,
  accountIds: string[],
): Promise<Map<string, { type: string; subtype: string; name: string }>> {
  const map = new Map<string, { type: string; subtype: string; name: string }>();
  const unique = [...new Set(accountIds)].filter(Boolean);
  if (unique.length === 0) return map;

  const { accessToken, realmId } = await getQboForFirmClient(firmClientId);
  for (const id of unique) {
    const sql = `SELECT Id, Name, AccountType, AccountSubType FROM Account WHERE Id = '${id}'`;
    try {
      const rows = extractQueryEntities(await qboQuery(accessToken, realmId, sql), "Account");
      const row = rows[0];
      if (!row) continue;
      map.set(id, {
        type: String(row.AccountType ?? ""),
        subtype: String(row.AccountSubType ?? ""),
        name: String(row.Name ?? ""),
      });
    } catch {
      // Best-effort hydration — pattern payload names remain the fallback.
    }
  }
  return map;
}

export async function composeProposals(input: ComposeProposalsInput): Promise<ComposedProposal[]> {
  const index = await loadPatternIndex(input.firmClientId);
  const composed: ComposedProposal[] = [];

  const suggestedIds: string[] = [];
  const draftRows: Array<{ txn: UncategorizedTxn; match: PatternMatch | null }> = [];

  for (const txn of input.txns) {
    const match = resolvePatternMatch(txn, index);
    draftRows.push({ txn, match });
    if (match?.account_id) suggestedIds.push(match.account_id);
  }

  const accountMeta = await hydrateAccountMeta(input.firmClientId, suggestedIds);

  for (const { txn, match } of draftRows) {
    if (!match) {
      composed.push({
        firm_client_id: input.firmClientId,
        scan_run_id: input.scanRunId,
        txn_id: txn.txn_id,
        txn_type: txn.txn_type,
        txn_date: txn.txn_date,
        txn_amount: txn.txn_amount,
        txn_memo: txn.txn_memo,
        vendor_id: txn.vendor_id,
        vendor_name: txn.vendor_name,
        current_account_id: txn.current_account_id,
        current_account_name: txn.current_account_name,
        suggested_account_id: null,
        suggested_account_name: null,
        suggested_account_type: null,
        suggested_account_subtype: null,
        source: "no_pattern",
        memory_id: null,
        confidence: 0,
        confidence_bucket: "red",
        sample_count: 0,
        status: "pending",
      });
      continue;
    }

    const meta = accountMeta.get(match.account_id);
    composed.push({
      firm_client_id: input.firmClientId,
      scan_run_id: input.scanRunId,
      txn_id: txn.txn_id,
      txn_type: txn.txn_type,
      txn_date: txn.txn_date,
      txn_amount: txn.txn_amount,
      txn_memo: txn.txn_memo,
      vendor_id: txn.vendor_id,
      vendor_name: txn.vendor_name,
      current_account_id: txn.current_account_id,
      current_account_name: txn.current_account_name,
      suggested_account_id: match.account_id,
      suggested_account_name: meta?.name || match.account_name,
      suggested_account_type: meta?.type ?? null,
      suggested_account_subtype: meta?.subtype ?? null,
      source: match.source,
      memory_id: match.memory_id,
      confidence: match.confidence,
      confidence_bucket: assignConfidenceBucket(match.source, match.confidence, match.sample_count),
      sample_count: match.sample_count,
      status: "pending",
    });
  }

  return composed;
}
