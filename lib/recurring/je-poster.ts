// D5.3 — impure post orchestrator. Bridges a recurring_fires row to D2's
// qboJournalEntryPoster.post(). Loads the fire + template + client, composes
// the JE via the pure composer, delegates the actual QBO write to D2, then maps
// D2's result back onto the fire row.
//
// Impurity budget: getSupabaseAdmin (DB) and qboJournalEntryPoster (delegates
// to D2 — never talks to QBO directly). Everything else imported here is pure.
// Never throws except on the initial fire-load DB error.

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { qboJournalEntryPoster } from "@/lib/erp/quickbooks/journal-entry-poster";
import { composeJEPayloadForFire } from "./je-composer";
import { rowToRecurringScheduleLine, rowToRecurringTemplate } from "./db-mapper";
import { triggerRunnerForRecurringFire } from "@/lib/rules/hooks/trigger-runner";
import type { FireStatus, RecurringScheduleLine, RecurringTemplate } from "./types";

export interface PostFireResult {
  fire_id: string;
  final_fire_status: FireStatus;
  reason?: string;
  je_attempt_id?: string;
  qbo_je_id?: string;
}

type Row = Record<string, unknown>;

/**
 * Post a single recurring fire. Idempotent by construction: D2's UNIQUE
 * (firm_client_id, idempotency_key) guard means re-running postFire on the same
 * fire returns the existing posted attempt rather than double-posting.
 */
export async function postFire(fireId: string): Promise<PostFireResult> {
  const supabase = getSupabaseAdmin();

  // 1. Load fire — the ONLY step allowed to throw (a DB read failure here is
  //    not something we can meaningfully record against a fire we can't read).
  const { data: fire, error: fireErr } = await supabase
    .from("recurring_fires")
    .select("*")
    .eq("fire_id", fireId)
    .maybeSingle();
  if (fireErr) {
    throw new Error(`d5.poster.fire_load_failed:${fireErr.message}`);
  }
  if (!fire) {
    return { fire_id: fireId, final_fire_status: "proposed", reason: "fire_not_found" };
  }

  const fireRow = fire as Row;
  const status = String(fireRow.status) as FireStatus;

  // 2. Only proposed fires post. Never re-post a settled fire.
  if (status !== "proposed") {
    return {
      fire_id: fireId,
      final_fire_status: status,
      reason: "not_proposed",
      je_attempt_id: asString(fireRow.je_attempt_id),
      qbo_je_id: asString(fireRow.qbo_je_id),
    };
  }

  const templateId = String(fireRow.template_id);
  const firmClientId = String(fireRow.firm_client_id);
  const fireDate = String(fireRow.fire_date);
  const periodIndex = Number(fireRow.period_index);

  // 3. Load template.
  const { data: tplRow, error: tplErr } = await supabase
    .from("recurring_templates")
    .select("*")
    .eq("template_id", templateId)
    .maybeSingle();
  if (tplErr) {
    return await markFailed(supabase, fireId, `template_load_failed:${tplErr.message}`);
  }
  if (!tplRow) {
    return await markFailed(supabase, fireId, "template_missing");
  }

  let template: RecurringTemplate;
  try {
    template = rowToRecurringTemplate(tplRow as Row);
  } catch (err) {
    return await markFailed(supabase, fireId, err instanceof Error ? err.message : String(err));
  }

  // 4. Load client (existence guard).
  const { data: client, error: clientErr } = await supabase
    .from("firm_clients")
    .select("id")
    .eq("id", firmClientId)
    .maybeSingle();
  if (clientErr) {
    return await markFailed(supabase, fireId, `client_load_failed:${clientErr.message}`);
  }
  if (!client) {
    return await markFailed(supabase, fireId, "client_missing");
  }

  // 5. Load schedule lines when needed.
  let scheduleLines: RecurringScheduleLine[] | undefined;
  if (template.template_type === "schedule") {
    const { data: lineRows, error: lineErr } = await supabase
      .from("recurring_schedule_lines")
      .select("*")
      .eq("template_id", templateId);
    if (lineErr) {
      return await markFailed(supabase, fireId, `schedule_lines_load_failed:${lineErr.message}`);
    }
    scheduleLines = (lineRows ?? []).map((r: Row) => rowToRecurringScheduleLine(r));
  }

  // 6. Compose the JE (pure). ok:false → fire failed with reason detail.
  const composed = composeJEPayloadForFire({
    template,
    period_index: periodIndex,
    fire_date: fireDate,
    schedule_lines: scheduleLines,
  });
  if (!composed.ok) {
    return await markFailed(supabase, fireId, `reason:${composed.reason}`);
  }

  // 7. Delegate the write to D2. source_type='recurring', posted_by='ai'.
  const result = await qboJournalEntryPoster.post({
    firm_client_id: firmClientId,
    idempotency_key: composed.idempotency_key,
    source_type: "recurring",
    source_id: fireId,
    posted_by: "ai",
    payload: composed.payload,
  });

  // 8. Map D2 result → fire status.
  if (result.status === "posted") {
    await supabase
      .from("recurring_fires")
      .update({
        status: "posted",
        je_attempt_id: result.attempt_id,
        qbo_je_id: result.qbo_je_id,
      })
      .eq("fire_id", fireId);

    await bumpPostCount(supabase, template);

    // D6.3 — fire the rule runner after the recurring JE landed + status
    // committed to 'posted'. Fire-and-forget; runner failures must never break
    // the post path (trigger swallows internally).
    void triggerRunnerForRecurringFire(fireId).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn("[d6.3] runner trigger failed for recurring fire", fireId, err?.message);
    });

    return {
      fire_id: fireId,
      final_fire_status: "posted",
      je_attempt_id: result.attempt_id,
      qbo_je_id: result.qbo_je_id,
    };
  }

  if (result.status === "rejected") {
    await supabase
      .from("recurring_fires")
      .update({
        status: "rejected",
        je_attempt_id: result.attempt_id || null,
        error_detail: `reason:${result.reason}`,
      })
      .eq("fire_id", fireId);
    return {
      fire_id: fireId,
      final_fire_status: "rejected",
      reason: result.reason,
      je_attempt_id: result.attempt_id || undefined,
    };
  }

  // failed
  await supabase
    .from("recurring_fires")
    .update({
      status: "failed",
      je_attempt_id: result.attempt_id || null,
      error_detail: `error:${result.error}`,
    })
    .eq("fire_id", fireId);
  return {
    fire_id: fireId,
    final_fire_status: "failed",
    reason: result.error,
    je_attempt_id: result.attempt_id || undefined,
  };
}

/** Mark a fire failed (non-terminal). Never throws. */
async function markFailed(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  fireId: string,
  detail: string,
): Promise<PostFireResult> {
  await supabase
    .from("recurring_fires")
    .update({ status: "failed", error_detail: detail })
    .eq("fire_id", fireId);
  return { fire_id: fireId, final_fire_status: "failed", reason: detail };
}

/** Bump template.post_count with optimistic concurrency. A lost race is a warn,
 *  NOT a failure — the fire is already posted and the D2 attempt exists. */
async function bumpPostCount(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  template: RecurringTemplate,
): Promise<void> {
  const { data: updated, error } = await supabase
    .from("recurring_templates")
    .update({ post_count: template.post_count + 1 })
    .eq("template_id", template.template_id)
    .eq("post_count", template.post_count)
    .select("template_id");
  if (error || !updated || updated.length === 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `d5.poster.post_count_bump_lost template=${template.template_id} (fire already posted; non-fatal)`,
    );
  }
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}
