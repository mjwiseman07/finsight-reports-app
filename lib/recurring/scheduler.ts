// D5.2 — fire scheduler (impure orchestrator). Scans due recurring templates,
// creates one `proposed` recurring_fires row per due template, then advances
// the template with optimistic concurrency. Does NOT post JEs and does NOT
// write to je_posting_audit (that FK requires a je_post_attempts row, which
// only exists after D5.3). D5.2's audit trail is recurring_fires itself + the
// cron endpoint response.
//
// Impurity budget: this file may import getSupabaseAdmin and read the clock via
// the injected `now`. Nothing else impure — no HTTP calls, no environment
// reads, no direct client construction.

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { computeNextFireDate } from "./cadence";
import { rowToRecurringScheduleLine, rowToRecurringTemplate } from "./db-mapper";
import { computePeriodAmount } from "./period";
import type { RecurringScheduleLine, RecurringTemplate } from "./types";
import { wallClockToday } from "./tz";

export interface ClientFireSummary {
  firm_client_id: string;
  client_timezone: string;
  today: string; // ISO date in client tz
  templates_scanned: number;
  fires_created: number;
  templates_terminated: number;
  errors: Array<{ template_id?: string; error: string }>;
}

/** Round a dollar amount to 2 decimal places (cent precision). */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Fire all due templates for a single client. Never throws — every failure is
 * captured into `summary.errors` so a bad template can't halt the batch.
 */
export async function fireDueTemplatesForClient(
  firmClientId: string,
  now?: Date,
): Promise<ClientFireSummary> {
  const supabase = getSupabaseAdmin();
  const effectiveNow = now ?? new Date();
  const nowIso = effectiveNow.toISOString();

  const summary: ClientFireSummary = {
    firm_client_id: firmClientId,
    client_timezone: "",
    today: "",
    templates_scanned: 0,
    fires_created: 0,
    templates_terminated: 0,
    errors: [],
  };

  // 1. Fetch client (need timezone).
  const { data: client, error: clientErr } = await supabase
    .from("firm_clients")
    .select("id, timezone")
    .eq("id", firmClientId)
    .maybeSingle();
  if (clientErr) {
    summary.errors.push({ error: `client_fetch_failed:${clientErr.message}` });
    return summary;
  }
  if (!client) {
    summary.errors.push({ error: "client_not_found" });
    return summary;
  }

  const timezone = typeof client.timezone === "string" ? client.timezone : "America/New_York";
  summary.client_timezone = timezone;

  // 2. today = client wall-clock (NOT server UTC).
  const today = wallClockToday(timezone, effectiveNow);
  summary.today = today;

  // 3. Fetch active, due templates.
  const { data: rows, error: tplErr } = await supabase
    .from("recurring_templates")
    .select("*")
    .eq("firm_client_id", firmClientId)
    .eq("status", "active")
    .lte("next_fire_date", today);
  if (tplErr) {
    summary.errors.push({ error: `template_fetch_failed:${tplErr.message}` });
    return summary;
  }

  const templateRows = rows ?? [];
  summary.templates_scanned = templateRows.length;

  for (const rawRow of templateRows) {
    const rawId = typeof (rawRow as Record<string, unknown>).template_id === "string"
      ? ((rawRow as Record<string, unknown>).template_id as string)
      : undefined;
    try {
      await fireOneTemplate(supabase, rawRow as Record<string, unknown>, firmClientId, today, effectiveNow, nowIso, summary);
    } catch (err) {
      summary.errors.push({ template_id: rawId, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return summary;
}

async function fireOneTemplate(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  rawRow: Record<string, unknown>,
  firmClientId: string,
  today: string,
  effectiveNow: Date,
  nowIso: string,
  summary: ClientFireSummary,
): Promise<void> {
  // a. Map row → RecurringTemplate.
  const template: RecurringTemplate = rowToRecurringTemplate(rawRow);

  // b. Load schedule lines when needed.
  let scheduleLines: RecurringScheduleLine[] | undefined;
  if (template.template_type === "schedule") {
    const { data: lineRows, error: lineErr } = await supabase
      .from("recurring_schedule_lines")
      .select("*")
      .eq("template_id", template.template_id);
    if (lineErr) {
      summary.errors.push({ template_id: template.template_id, error: `schedule_lines_fetch_failed:${lineErr.message}` });
      return;
    }
    scheduleLines = (lineRows ?? []).map((r: Record<string, unknown>) =>
      rowToRecurringScheduleLine(r),
    );
  }

  // c. Compute the advisory amount snapshot.
  const periodIndex = template.periods_elapsed + 1;
  let amountSnapshot: number | null = null;
  if (template.template_type !== "fixed") {
    const amt = computePeriodAmount(template, periodIndex, scheduleLines);
    if (Number.isNaN(amt.amount)) {
      // NaN → store null; log the reason (advisory only, non-fatal).
      // eslint-disable-next-line no-console
      console.warn(
        `d5.scheduler.amount_null template=${template.template_id} period=${periodIndex} reason=${amt.reason ?? "unknown"}`,
      );
      amountSnapshot = null;
    } else {
      amountSnapshot = round2(amt.amount);
    }
  }

  // d. Insert the proposed fire.
  //
  // NOTE (drift): the D5.2 spec step (d) lists `je_payload_snapshot =
  // template.je_payload_template`, but public.recurring_fires (D5.0 schema) has
  // no such column and D5.2 must not change schema. Omitted here; D5.3 re-derives
  // the payload from the template when it composes the JE. Flagged in report.
  const fireRow = {
    template_id: template.template_id,
    firm_client_id: firmClientId,
    fire_date: today,
    period_index: periodIndex,
    status: "proposed",
    amount_override: amountSnapshot,
  };
  const { error: insErr } = await supabase.from("recurring_fires").insert(fireRow);
  if (insErr) {
    // g. UNIQUE(template_id, period_index) violation → idempotent no-op. Do NOT
    //    advance the template.
    if (insErr.code === "23505") {
      summary.errors.push({ template_id: template.template_id, error: "already_fired_this_period" });
      return;
    }
    summary.errors.push({ template_id: template.template_id, error: `fire_insert_failed:${insErr.message}` });
    return;
  }
  summary.fires_created += 1;

  // e. Compute the next fire date.
  const nextFire = computeNextFireDate(template, today, effectiveNow);

  // f. Advance the template with optimistic concurrency on fire_count.
  //
  // NOTE (drift): the spec's step (f) field list omits periods_elapsed, but
  // period_index is derived from it and recurring_fires has UNIQUE(template_id,
  // period_index). Without incrementing periods_elapsed here, every subsequent
  // fire would collide on period_index=1 and be permanently blocked. So we
  // advance periods_elapsed in lockstep with fire_count. Flagged in report.
  const updatePayload: Record<string, unknown> = {
    next_fire_date: nextFire.is_terminal ? template.next_fire_date : nextFire.next_fire_date,
    last_fired_at: nowIso,
    fire_count: template.fire_count + 1,
    periods_elapsed: template.periods_elapsed + 1,
  };
  if (nextFire.is_terminal) {
    updatePayload.status = "ended";
    updatePayload.ended_at = nowIso;
  }

  const { data: updated, error: updErr } = await supabase
    .from("recurring_templates")
    .update(updatePayload)
    .eq("template_id", template.template_id)
    .eq("fire_count", template.fire_count)
    .select("template_id");
  if (updErr) {
    summary.errors.push({ template_id: template.template_id, error: `template_update_failed:${updErr.message}` });
    return;
  }
  if (!updated || updated.length === 0) {
    // Optimistic-concurrency loss: another run advanced fire_count first.
    summary.errors.push({ template_id: template.template_id, error: "concurrent_update_lost" });
    return;
  }

  if (nextFire.is_terminal) {
    summary.templates_terminated += 1;
  }
}

/**
 * Fire due templates for every client that has an owner. Delegates per-client
 * work to fireDueTemplatesForClient (which never throws), so a single client's
 * failure cannot halt the batch.
 */
export async function fireDueTemplatesForAllClients(
  now?: Date,
): Promise<{ processed: number; summaries: ClientFireSummary[] }> {
  const supabase = getSupabaseAdmin();
  const { data: clients, error } = await supabase
    .from("firm_clients")
    .select("id")
    .not("owner_user_id", "is", null);
  if (error) {
    throw new Error(`d5.scheduler.client_list_failed:${error.message}`);
  }

  const summaries: ClientFireSummary[] = [];
  for (const client of clients ?? []) {
    const summary = await fireDueTemplatesForClient(client.id as string, now);
    summaries.push(summary);
  }

  return { processed: summaries.length, summaries };
}
