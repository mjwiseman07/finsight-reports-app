// D5.5 — recurring review service. enrichFiresForReview() is pure; it decorates
// proposed fires with the engine-derived amount and a freshly-evaluated
// auto-post gate decision. listFiresForReview() is the impure DB loader that
// feeds it. Gate decisions are NEVER persisted — every read re-derives them.
//
// Impurity budget (listFiresForReview only): getSupabaseAdmin. No ERP calls, no
// network, no direct client-construction literal. enrichFiresForReview touches
// nothing impure.

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { computePeriodAmount } from "./period";
import { evaluateAutoPostGate, type AutoPostClientContext, type GateDecision } from "./auto-post-gate";
import { rowToRecurringScheduleLine, rowToRecurringTemplate } from "./db-mapper";
import type {
  JePayloadTemplate,
  RecurringFire,
  RecurringScheduleLine,
  RecurringTemplate,
} from "./types";

export interface FireReviewRow {
  fire_id: string;
  template_id: string;
  template_name: string;
  cadence: string;
  fire_date: string;
  period_index: number;
  amount: number; // engine truth (same derivation as the D5.3 composer)
  amount_override: number | null;
  status: RecurringFire["status"];
  gate_decision: GateDecision;
  created_at: string;
}

type Row = Record<string, unknown>;

/**
 * Pure enrichment. Preserves input order (the impure caller controls ordering
 * via SQL). Fires whose template is not in the map are skipped entirely.
 */
export function enrichFiresForReview(
  fires: RecurringFire[],
  templatesById: Map<string, RecurringTemplate>,
  scheduleLinesByTemplate: Map<string, RecurringScheduleLine[]>,
  client: AutoPostClientContext,
): FireReviewRow[] {
  const rows: FireReviewRow[] = [];
  for (const fire of fires) {
    const template = templatesById.get(fire.template_id);
    if (!template) continue; // FK+CASCADE make this unreachable in practice

    const lines = scheduleLinesByTemplate.get(fire.template_id) ?? [];
    const amount = deriveAmount(template, fire.period_index, lines);
    const gate_decision = evaluateAutoPostGate(template, client, fire);

    rows.push({
      fire_id: fire.fire_id,
      template_id: fire.template_id,
      template_name: template.name,
      cadence: template.cadence,
      fire_date: fire.fire_date,
      period_index: fire.period_index,
      amount,
      amount_override: fire.amount_override,
      status: fire.status,
      gate_decision,
      created_at: fire.created_at,
    });
  }
  return rows;
}

/**
 * Derive the amount the fire would actually post — the same branching the D5.3
 * composer uses: `fixed` copies through the payload (debit-side total), all
 * other types re-derive per-period from the D5.1 engine. Never trusts
 * amount_override. Returns 0 for a non-derivable amount (broken template shows
 * $0 in review; the Post action fails cleanly via the poster).
 */
function deriveAmount(
  template: RecurringTemplate,
  periodIndex: number,
  lines: RecurringScheduleLine[],
): number {
  if (template.template_type === "fixed") {
    return sumDebitDollars(template.je_payload_template);
  }
  const result = computePeriodAmount(template, periodIndex, lines);
  return Number.isNaN(result.amount) ? 0 : result.amount;
}

/** Sum the Debit side of a QBO-native payload template, in dollars. */
function sumDebitDollars(payload: JePayloadTemplate): number {
  const lines = Array.isArray(payload?.Line) ? payload.Line : [];
  let cents = 0;
  for (const line of lines) {
    const detail = (line as Record<string, unknown>)["JournalEntryLineDetail"] as
      | Record<string, unknown>
      | undefined;
    if (detail?.["PostingType"] !== "Debit") continue;
    const amt = typeof line.Amount === "number" && Number.isFinite(line.Amount) ? line.Amount : 0;
    cents += Math.round(amt * 100);
  }
  return cents / 100;
}

/** Minimal RecurringFire decode. db-mapper has no rowToRecurringFire and is
 *  frozen, so we decode inline — only the fields enrichFiresForReview and the
 *  gate actually read. The result is cast to RecurringFire; unread fields are
 *  intentionally absent because nothing downstream touches them. */
function decodeFire(row: Row): RecurringFire {
  const fire = {
    fire_id: String(row.fire_id),
    template_id: String(row.template_id),
    firm_client_id: String(row.firm_client_id),
    fire_date: String(row.fire_date),
    fired_at: String(row.fired_at),
    period_index: Number(row.period_index),
    status: String(row.status) as RecurringFire["status"],
    amount_override:
      row.amount_override === null || row.amount_override === undefined
        ? null
        : Number(row.amount_override),
    created_at: String(row.created_at),
  };
  return fire as unknown as RecurringFire;
}

/**
 * Impure loader. Returns proposed fires enriched with live gate decisions.
 * Never throws — every DB error path returns via the errors array.
 */
export async function listFiresForReview(firmClientId: string): Promise<{
  rows: FireReviewRow[];
  errors: string[];
}> {
  const supabase = getSupabaseAdmin();

  // 1. Client context.
  const { data: clientRow, error: clientErr } = await supabase
    .from("firm_clients")
    .select("id, recurring_auto_post_enabled, accounting_method")
    .eq("id", firmClientId)
    .maybeSingle();
  if (clientErr) {
    return { rows: [], errors: [`client_load_failed:${clientErr.message}`] };
  }
  if (!clientRow) {
    return { rows: [], errors: ["client_not_found"] };
  }
  const client: AutoPostClientContext = {
    firm_client_id: firmClientId,
    recurring_auto_post_enabled: (clientRow as Row).recurring_auto_post_enabled === true,
    accounting_method: String((clientRow as Row).accounting_method ?? ""),
  };

  // 2. Proposed fires, deterministic order.
  const { data: fireRows, error: fireErr } = await supabase
    .from("recurring_fires")
    .select("*")
    .eq("firm_client_id", firmClientId)
    .eq("status", "proposed")
    .order("fire_date", { ascending: true })
    .order("period_index", { ascending: true });
  if (fireErr) {
    return { rows: [], errors: [`fire_load_failed:${fireErr.message}`] };
  }
  const fires = (fireRows ?? []).map((r: Row) => decodeFire(r));
  if (fires.length === 0) {
    return { rows: [], errors: [] };
  }

  const errors: string[] = [];

  // 3. Batch-load templates.
  const templateIds = [...new Set(fires.map((f: RecurringFire) => f.template_id))];
  const templatesById = new Map<string, RecurringTemplate>();
  const { data: tplRows, error: tplErr } = await supabase
    .from("recurring_templates")
    .select("*")
    .in("template_id", templateIds);
  if (tplErr) {
    return { rows: [], errors: [`template_load_failed:${tplErr.message}`] };
  }
  for (const row of tplRows ?? []) {
    try {
      const tpl = rowToRecurringTemplate(row as Row);
      templatesById.set(tpl.template_id, tpl);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  // 4. Batch-load schedule lines for straight_line / schedule templates.
  const scheduleLinesByTemplate = new Map<string, RecurringScheduleLine[]>();
  const relevantIds = [...templatesById.values()]
    .filter((t) => t.template_type === "straight_line" || t.template_type === "schedule")
    .map((t) => t.template_id);
  if (relevantIds.length > 0) {
    const { data: lineRows, error: lineErr } = await supabase
      .from("recurring_schedule_lines")
      .select("*")
      .in("template_id", relevantIds);
    if (lineErr) {
      errors.push(`schedule_lines_load_failed:${lineErr.message}`);
    } else {
      for (const row of lineRows ?? []) {
        try {
          const line = rowToRecurringScheduleLine(row as Row);
          const bucket = scheduleLinesByTemplate.get(line.template_id) ?? [];
          bucket.push(line);
          scheduleLinesByTemplate.set(line.template_id, bucket);
        } catch (err) {
          errors.push(err instanceof Error ? err.message : String(err));
        }
      }
    }
  }

  // 5. Enrich (pure).
  const rows = enrichFiresForReview(fires, templatesById, scheduleLinesByTemplate, client);
  return { rows, errors };
}
