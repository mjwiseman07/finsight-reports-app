// D5.4 — impure auto-post dispatcher. Batch-evaluates proposed fires through
// the pure gate and dispatches approved ones to D5.3's postFire(). Never talks
// to QBO directly (postFire → D2 owns that). Never throws — every failure is
// captured into the summary.
//
// Impurity budget: getSupabaseAdmin (DB) and postFire (delegates to D5.3 → D2).
// Nothing else impure.

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { postFire } from "./je-poster";
import type { PostFireResult } from "./je-poster";
import {
  evaluateAutoPostGate,
  type AutoPostClientContext,
  type GateHoldReason,
} from "./auto-post-gate";
import { rowToRecurringTemplate } from "./db-mapper";
import type { RecurringFire, RecurringTemplate } from "./types";

export interface DispatchOutcome {
  fire_id: string;
  template_id: string;
  decision: "dispatched" | "held";
  hold_reason?: GateHoldReason;
  post_result?: PostFireResult;
  error?: string;
}

export interface ClientDispatchSummary {
  firm_client_id: string;
  fires_scanned: number;
  dispatched: number;
  posted: number;
  failed: number;
  rejected: number;
  held: number;
  hold_reasons: Record<GateHoldReason, number>;
  outcomes: DispatchOutcome[];
  errors: string[];
}

type Row = Record<string, unknown>;

/** All 5 hold reasons initialized to 0 for a predictable JSON shape. */
function emptyHoldReasons(): Record<GateHoldReason, number> {
  return {
    fire_not_proposed: 0,
    template_not_active: 0,
    cash_basis_client: 0,
    client_auto_post_disabled: 0,
    template_auto_post_off: 0,
  };
}

/** Minimal RecurringFire decode — only the fields the gate + dispatch read.
 *  db-mapper.ts has no rowToRecurringFire and is frozen, so we decode inline. */
function decodeFire(row: Row): Pick<RecurringFire, "fire_id" | "template_id" | "status" | "period_index"> {
  return {
    fire_id: String(row.fire_id),
    template_id: String(row.template_id),
    status: String(row.status) as RecurringFire["status"],
    period_index: Number(row.period_index),
  };
}

export async function dispatchAutoPostForClient(
  firmClientId: string,
): Promise<ClientDispatchSummary> {
  const supabase = getSupabaseAdmin();
  const summary: ClientDispatchSummary = {
    firm_client_id: firmClientId,
    fires_scanned: 0,
    dispatched: 0,
    posted: 0,
    failed: 0,
    rejected: 0,
    held: 0,
    hold_reasons: emptyHoldReasons(),
    outcomes: [],
    errors: [],
  };

  // 1. Load client context.
  const { data: clientRow, error: clientErr } = await supabase
    .from("firm_clients")
    .select("id, recurring_auto_post_enabled, accounting_method")
    .eq("id", firmClientId)
    .maybeSingle();
  if (clientErr) {
    summary.errors.push(`client_load_failed:${clientErr.message}`);
    return summary;
  }
  if (!clientRow) {
    summary.errors.push("client_not_found");
    return summary;
  }
  const clientCtx: AutoPostClientContext = {
    firm_client_id: firmClientId,
    recurring_auto_post_enabled: (clientRow as Row).recurring_auto_post_enabled === true,
    accounting_method: String((clientRow as Row).accounting_method ?? ""),
  };

  // 2. Query proposed fires, deterministic order.
  const { data: fireRows, error: fireErr } = await supabase
    .from("recurring_fires")
    .select("*")
    .eq("firm_client_id", firmClientId)
    .eq("status", "proposed")
    .order("fire_date", { ascending: true })
    .order("period_index", { ascending: true });
  if (fireErr) {
    summary.errors.push(`fire_query_failed:${fireErr.message}`);
    return summary;
  }
  const fires = (fireRows ?? []).map((r: Row) => decodeFire(r));
  summary.fires_scanned = fires.length;
  if (fires.length === 0) return summary;

  // 3. Batch-load templates in one shot.
  const templateIds = [...new Set(fires.map((f: { template_id: string }) => f.template_id))];
  const templateMap = new Map<string, RecurringTemplate>();
  const { data: tplRows, error: tplErr } = await supabase
    .from("recurring_templates")
    .select("*")
    .in("template_id", templateIds);
  if (tplErr) {
    summary.errors.push(`template_query_failed:${tplErr.message}`);
    return summary;
  }
  for (const row of tplRows ?? []) {
    try {
      const tpl = rowToRecurringTemplate(row as Row);
      templateMap.set(tpl.template_id, tpl);
    } catch (err) {
      summary.errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  // 4. Evaluate + dispatch each fire.
  for (const fire of fires) {
    const template = templateMap.get(fire.template_id);
    if (!template) {
      summary.errors.push(`template_missing:${fire.template_id}`);
      continue;
    }

    const decision = evaluateAutoPostGate(template, clientCtx, fire as RecurringFire);
    if (decision.action === "hold") {
      summary.hold_reasons[decision.reason] += 1;
      summary.held += 1;
      summary.outcomes.push({
        fire_id: fire.fire_id,
        template_id: fire.template_id,
        decision: "held",
        hold_reason: decision.reason,
      });
      continue;
    }

    // dispatch
    summary.dispatched += 1;
    try {
      const postResult = await postFire(fire.fire_id);
      summary.outcomes.push({
        fire_id: fire.fire_id,
        template_id: fire.template_id,
        decision: "dispatched",
        post_result: postResult,
      });
      if (postResult.final_fire_status === "posted") summary.posted += 1;
      else if (postResult.final_fire_status === "rejected") summary.rejected += 1;
      else if (postResult.final_fire_status === "failed") summary.failed += 1;
    } catch (err) {
      summary.failed += 1;
      summary.outcomes.push({
        fire_id: fire.fire_id,
        template_id: fire.template_id,
        decision: "dispatched",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return summary;
}

export async function dispatchAutoPostForAllClients(): Promise<{
  processed: number;
  summaries: ClientDispatchSummary[];
}> {
  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from("recurring_templates")
    .select("firm_client_id")
    .eq("status", "active")
    .eq("auto_post", true);
  if (error) {
    throw new Error(`d5.dispatcher.client_list_failed:${error.message}`);
  }

  const idSet = new Set<string>();
  for (const r of (rows ?? []) as Row[]) {
    idSet.add(String(r.firm_client_id));
  }
  const clientIds: string[] = [...idSet];
  const summaries: ClientDispatchSummary[] = [];
  for (const id of clientIds) {
    summaries.push(await dispatchAutoPostForClient(id));
  }

  return { processed: summaries.length, summaries };
}
