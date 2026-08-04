import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { recordIssue } from "./issue-recorder";

export type ChainMonitorResult = {
  partitions_checked: number;
  broken_chains: number;
  errors: number;
  dedup_hits: number;
};

export async function runChainIntegrityMonitor(): Promise<ChainMonitorResult> {
  const result: ChainMonitorResult = {
    partitions_checked: 0,
    broken_chains: 0,
    errors: 0,
    dedup_hits: 0,
  };

  const admin = getSupabaseAdmin();

  const { data: recent, error: recentErr } = await admin
    .from("pilot_lifecycle_events")
    .select("company_id, firm_id, event_at")
    .gt("event_at", new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString())
    .limit(10000);

  if (recentErr) {
    result.errors += 1;
    console.error(
      "[chain-monitor] failed to enumerate recent partitions",
      recentErr.message,
    );
    return result;
  }

  const uniq = new Set<string>();
  for (const row of recent ?? []) {
    const key = `${row.company_id ?? ""}|${row.firm_id ?? ""}`;
    uniq.add(key);
  }

  for (const key of uniq) {
    const [companyId, firmId] = key.split("|");
    const cId = companyId || null;
    const fId = firmId || null;
    if (!cId && !fId) continue;

    result.partitions_checked += 1;

    const { data: breaks, error: verifyErr } = await admin.rpc(
      "pilot_lifecycle_events_verify_chain",
      {
        p_company_id: cId,
        p_firm_id: fId,
      },
    );

    if (verifyErr) {
      result.errors += 1;
      await recordIssue({
        fingerprint: `chain-monitor:verify-error:${cId ?? "null"}:${fId ?? "null"}`,
        level: "error",
        issueKind: "pilot.lifecycle.monitor.error",
        companyId: cId,
        firmId: fId,
        extra: { error: verifyErr.message },
        message: `Chain monitor: verify_chain RPC failed for partition (${cId ?? "-"} / ${fId ?? "-"})`,
      });
      continue;
    }

    if (Array.isArray(breaks) && breaks.length > 0) {
      result.broken_chains += 1;
      const first = breaks[0] as {
        first_broken_event_id: string;
        first_broken_event_at: string;
        expected_prev_hash: string;
        actual_prev_hash: string;
        expected_row_hash: string;
        actual_row_hash: string;
      };
      const r = await recordIssue({
        fingerprint: `chain-broken:${cId ?? "null"}:${fId ?? "null"}:${first.first_broken_event_id}`,
        level: "fatal",
        issueKind: "pilot.lifecycle.chain.integrity.broken",
        companyId: cId,
        firmId: fId,
        tags: {
          first_broken_event_id: String(first.first_broken_event_id),
        },
        extra: {
          first_broken_event_at: first.first_broken_event_at,
          expected_prev_hash: first.expected_prev_hash,
          actual_prev_hash: first.actual_prev_hash,
          expected_row_hash: first.expected_row_hash,
          actual_row_hash: first.actual_row_hash,
        },
        message: `CHAIN INTEGRITY BREAK in partition (${cId ?? "-"} / ${fId ?? "-"}) at event ${first.first_broken_event_id}`,
      });
      if (r.deduped) result.dedup_hits += 1;
    }
  }

  return result;
}
