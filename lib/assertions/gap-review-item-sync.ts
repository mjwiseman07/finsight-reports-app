/**
 * D-Assertions Part 5 — Sync detected gaps to close_gap_review_items.
 *
 * Called at the end of runProjectionWorker (after coverage upsert + reasoner).
 * Contract:
 *   - Every current gap becomes (or refreshes) an open close_gap_review_items row.
 *   - Any previously-open gap item NOT in the current gap set is auto-closed
 *     with resolution_status='resolved_stale' (means: coverage improved without
 *     a reviewer decision — likely because a rule fired late).
 *   - Any previously-resolved gap that reappears is REOPENED with prior status
 *     preserved on resolution_status_prior for audit.
 *   - Never DELETE — only status transitions. Audit trail is sacred.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DetectedGap } from "./gap-detector";
import type {
  AccountCategory,
  AssertionId,
} from "@/lib/pre-close/assertions-types";
import type { RelevanceLevel } from "@/lib/pre-close/assertions-coverage-types";

export interface GapSyncProjectionRow {
  account_category: AccountCategory;
  assertion_id: AssertionId;
  relevance_at_computation: RelevanceLevel;
  gap_recommendation: string | null;
}

export interface GapSyncResult {
  opened: number;
  refreshed: number;
  auto_closed_stale: number;
  reopened: number;
}

export async function syncGapReviewItems(
  db: SupabaseClient,
  firmClientId: string,
  closePeriodId: string,
  engagementId: string,
  gaps: DetectedGap[],
  rows: GapSyncProjectionRow[],
  workerRunId: string,
): Promise<GapSyncResult> {
  const relevanceByPair = new Map<string, string>();
  for (const r of rows) {
    relevanceByPair.set(
      `${r.account_category}|${r.assertion_id}`,
      r.relevance_at_computation,
    );
  }
  const recommendationByPair = new Map<string, string | null>();
  for (const r of rows) {
    recommendationByPair.set(
      `${r.account_category}|${r.assertion_id}`,
      r.gap_recommendation ?? null,
    );
  }

  const { data: existing, error: existErr } = await db
    .from("close_gap_review_items")
    .select("id, account_category, assertion_id, resolution_status")
    .eq("firm_client_id", firmClientId)
    .eq("close_period_id", closePeriodId);
  if (existErr) throw existErr;

  const existingByKey = new Map<string, { id: string; status: string }>();
  for (const e of existing ?? []) {
    existingByKey.set(
      `${e.account_category as string}|${e.assertion_id as string}`,
      { id: e.id as string, status: e.resolution_status as string },
    );
  }

  const currentGapKeys = new Set(
    gaps.map((g) => `${g.account_category}|${g.assertion_id}`),
  );

  let opened = 0;
  let refreshed = 0;
  let reopened = 0;
  let auto_closed_stale = 0;

  for (const g of gaps) {
    const key = `${g.account_category}|${g.assertion_id}`;
    const relevance = relevanceByPair.get(key) ?? "relevant";
    const severity = relevance === "relevant" ? "critical" : "warning";
    const recommendation = recommendationByPair.get(key) ?? null;
    const now = new Date().toISOString();
    const priorRow = existingByKey.get(key);

    if (priorRow && priorRow.status !== "open") {
      const { error } = await db
        .from("close_gap_review_items")
        .update({
          resolution_status: "open",
          resolution_status_prior: priorRow.status,
          reopened_at: now,
          resolution_type: null,
          resolved_by_user_id: null,
          resolved_at: null,
          gap_root_cause_code: g.root_cause_code,
          gap_recommendation: recommendation,
          relevance_at_detection: relevance,
          severity,
          last_projected_at: now,
        })
        .eq("id", priorRow.id);
      if (error) throw error;
      reopened++;
    } else {
      const { error } = await db.from("close_gap_review_items").upsert(
        {
          firm_client_id: firmClientId,
          engagement_id: engagementId,
          close_period_id: closePeriodId,
          account_category: g.account_category,
          assertion_id: g.assertion_id,
          gap_root_cause_code: g.root_cause_code,
          gap_recommendation: recommendation,
          relevance_at_detection: relevance,
          severity,
          last_projected_at: now,
        },
        {
          onConflict:
            "firm_client_id,close_period_id,account_category,assertion_id",
        },
      );
      if (error) throw error;
      if (priorRow) refreshed++;
      else opened++;
    }
  }

  for (const [key, prior] of existingByKey.entries()) {
    if (prior.status !== "open") continue;
    if (currentGapKeys.has(key)) continue;
    const now = new Date().toISOString();
    const { error } = await db
      .from("close_gap_review_items")
      .update({
        resolution_status: "resolved_stale",
        resolution_type: "rule_activation",
        resolution_metadata: {
          auto_closed_by_worker: true,
          worker_run_id: workerRunId,
          note: "coverage improved without reviewer decision",
        },
        resolved_at: now,
      })
      .eq("id", prior.id);
    if (error) throw error;
    auto_closed_stale++;
  }

  return { opened, refreshed, auto_closed_stale, reopened };
}
