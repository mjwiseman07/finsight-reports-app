import { randomUUID } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { projectCoverage, summarize } from "@/lib/assertions/coverage-projection";
import { detectGaps } from "@/lib/assertions/gap-detector";
import { reasonGaps } from "@/lib/assertions/gap-reasoner";
import type {
  ProjectionInput,
  ProjectedCoverageRow,
  CoverageEventRow,
} from "@/lib/pre-close/assertions-coverage-types";

export interface WorkerResult {
  workerRunId: string;
  closePeriodId: string;
  firmClientId: string;
  rowsWritten: number;
  gapsDetected: number;
  reasonerEnabled: boolean;
  reasonerSucceeded: number;
  reasonerFailed: number;
  summary: ReturnType<typeof summarize>;
}

export async function loadProjectionInput(
  firmClientId: string,
  closePeriodId: string,
  workerRunId: string,
): Promise<ProjectionInput> {
  const db = createServiceClient();
  const [relRes, covRes, firesRes] = await Promise.all([
    db.from("assertion_relevance_matrix").select("account_category, assertion_id, relevance"),
    db
      .from("rule_assertion_coverage")
      .select("rule_id, assertion_id, coverage_strength, account_categories"),
    db
      .from("pre_close_review_items")
      .select("fire_id, rule_id, curated_rule_fires!inner(outcome, rule_id, fire_id)")
      .eq("firm_client_id", firmClientId)
      .eq("close_period_id", closePeriodId),
  ]);

  if (relRes.error) throw relRes.error;
  if (covRes.error) throw covRes.error;
  if (firesRes.error) throw firesRes.error;

  interface RiWithFire {
    fire_id: string;
    rule_id: string;
    curated_rule_fires: { outcome: string; rule_id: string; fire_id: string } | null;
  }

  const firesRaw = (firesRes.data ?? []) as unknown as RiWithFire[];
  const fires = firesRaw
    .map((ri) => ri.curated_rule_fires)
    .filter((f): f is NonNullable<RiWithFire["curated_rule_fires"]> => !!f)
    .map((f) => ({
      fire_id: f.fire_id,
      rule_id: f.rule_id,
      outcome: f.outcome as "fired" | "suppressed" | "error" | "not_implemented",
    }));

  return {
    firmClientId,
    closePeriodId,
    workerRunId,
    relevance: (relRes.data ?? []) as ProjectionInput["relevance"],
    ruleCoverage: (covRes.data ?? []) as ProjectionInput["ruleCoverage"],
    fires,
  };
}

async function insertEvent(
  event: Omit<CoverageEventRow, "event_id" | "occurred_at">,
): Promise<void> {
  const db = createServiceClient();
  const { error } = await db.from("close_assertion_coverage_events").insert(event);
  if (error) throw error;
}

async function loadFirmClientVertical(firmClientId: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("firm_clients")
    .select("industry_vertical")
    .eq("id", firmClientId)
    .maybeSingle();
  if (error) throw error;
  return (data?.industry_vertical as string) ?? "general";
}

export async function runProjectionWorker(
  firmClientId: string,
  closePeriodId: string,
): Promise<WorkerResult> {
  const workerRunId = randomUUID();
  const db = createServiceClient();

  const { data: flagRow } = await db
    .from("advisacor_flags")
    .select("flag_value")
    .eq("flag_key", "assertions_projection_worker_enabled")
    .maybeSingle();
  if (flagRow?.flag_value === false) {
    throw new Error("assertions_projection_worker_enabled=false; refusing to run");
  }

  await insertEvent({
    firm_client_id: firmClientId,
    close_period_id: closePeriodId,
    worker_run_id: workerRunId,
    event_type: "projection_started",
    account_category: null,
    assertion_id: null,
    payload: {},
    actor_type: "system",
    actor_id: null,
    linked_action_id: null,
    correlation_id: workerRunId,
  });

  let rows: ProjectedCoverageRow[];
  try {
    const input = await loadProjectionInput(firmClientId, closePeriodId, workerRunId);
    rows = projectCoverage(input);
  } catch (e) {
    await insertEvent({
      firm_client_id: firmClientId,
      close_period_id: closePeriodId,
      worker_run_id: workerRunId,
      event_type: "projection_failed",
      account_category: null,
      assertion_id: null,
      payload: { error: e instanceof Error ? e.message : String(e) },
      actor_type: "system",
      actor_id: null,
      linked_action_id: null,
      correlation_id: workerRunId,
    });
    throw e;
  }

  const upsertPayload = rows.map((r) => ({
    firm_client_id: firmClientId,
    close_period_id: closePeriodId,
    account_category: r.account_category,
    assertion_id: r.assertion_id,
    relevance_at_computation: r.relevance_at_computation,
    coverage_status: r.coverage_status,
    covering_rule_ids: r.covering_rule_ids,
    covering_fire_ids: r.covering_fire_ids,
    evidence_strength: r.evidence_strength,
    gap_root_cause_code: r.gap_root_cause_code,
    computed_by_worker_run_id: workerRunId,
    updated_at: new Date().toISOString(),
  }));

  const { error: upsertErr } = await db.from("close_assertion_coverage").upsert(upsertPayload, {
    onConflict: "firm_client_id,close_period_id,account_category,assertion_id",
  });
  if (upsertErr) throw upsertErr;

  const gaps = detectGaps(rows);
  for (const g of gaps) {
    await insertEvent({
      firm_client_id: firmClientId,
      close_period_id: closePeriodId,
      worker_run_id: workerRunId,
      event_type: "gap_detected",
      account_category: g.account_category,
      assertion_id: g.assertion_id,
      payload: { root_cause_code: g.root_cause_code },
      actor_type: "system",
      actor_id: null,
      linked_action_id: null,
      correlation_id: workerRunId,
    });
  }

  const industryVertical = await loadFirmClientVertical(firmClientId);
  const reasonerOutcome = await reasonGaps(gaps, {
    firmClientId,
    closePeriodId,
    workerRunId,
    industryVertical,
  });

  let reasonerSucceeded = 0;
  let reasonerFailed = 0;

  if (!reasonerOutcome.enabled) {
    await insertEvent({
      firm_client_id: firmClientId,
      close_period_id: closePeriodId,
      worker_run_id: workerRunId,
      event_type: "gap_reasoner_skipped_flag_off",
      account_category: null,
      assertion_id: null,
      payload: { gap_count: gaps.length },
      actor_type: "system",
      actor_id: null,
      linked_action_id: null,
      correlation_id: workerRunId,
    });
  } else {
    for (const r of reasonerOutcome.results) {
      if (r.result) {
        reasonerSucceeded++;
        const { error: updErr } = await db
          .from("close_assertion_coverage")
          .update({
            gap_root_cause_code: r.result.root_cause_code,
            gap_recommendation: r.result.recommendation,
            gap_reasoning_action_id: r.result.action_id,
            updated_at: new Date().toISOString(),
          })
          .eq("firm_client_id", firmClientId)
          .eq("close_period_id", closePeriodId)
          .eq("account_category", r.gap.account_category)
          .eq("assertion_id", r.gap.assertion_id);
        if (updErr) throw updErr;

        await insertEvent({
          firm_client_id: firmClientId,
          close_period_id: closePeriodId,
          worker_run_id: workerRunId,
          event_type: "gap_reasoner_completed",
          account_category: r.gap.account_category,
          assertion_id: r.gap.assertion_id,
          payload: {
            root_cause_code: r.result.root_cause_code,
            recommendation: r.result.recommendation,
          },
          actor_type: "system",
          actor_id: null,
          linked_action_id: r.result.action_id,
          correlation_id: workerRunId,
        });
      } else {
        reasonerFailed++;
        await insertEvent({
          firm_client_id: firmClientId,
          close_period_id: closePeriodId,
          worker_run_id: workerRunId,
          event_type: "gap_reasoner_failed",
          account_category: r.gap.account_category,
          assertion_id: r.gap.assertion_id,
          payload: { error: r.error ?? "unknown" },
          actor_type: "system",
          actor_id: null,
          linked_action_id: null,
          correlation_id: workerRunId,
        });
      }
    }
  }

  const summary = summarize(rows);
  await insertEvent({
    firm_client_id: firmClientId,
    close_period_id: closePeriodId,
    worker_run_id: workerRunId,
    event_type: "projection_completed",
    account_category: null,
    assertion_id: null,
    payload: {
      rows_written: rows.length,
      gaps_detected: gaps.length,
      reasoner_enabled: reasonerOutcome.enabled,
      reasoner_succeeded: reasonerSucceeded,
      reasoner_failed: reasonerFailed,
      summary,
    },
    actor_type: "system",
    actor_id: null,
    linked_action_id: null,
    correlation_id: workerRunId,
  });

  return {
    workerRunId,
    closePeriodId,
    firmClientId,
    rowsWritten: rows.length,
    gapsDetected: gaps.length,
    reasonerEnabled: reasonerOutcome.enabled,
    reasonerSucceeded,
    reasonerFailed,
    summary,
  };
}
