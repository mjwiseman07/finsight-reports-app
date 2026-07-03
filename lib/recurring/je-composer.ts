// D5.3 — pure JE composer. Translates a recurring template's loose, QBO-native
// je_payload_template.Line[] into D2's strict JEPayload, re-deriving the period
// amount from the D5.1 engine (never trusting the advisory amount_snapshot).
//
// TOTALLY pure: no DB, no HTTP, no clock, no environment reads. Row-in /
// value-out. Never throws — every failure returns { ok:false, reason }.
//
// NOTE (import policy): this module imports ONLY types from @/lib/erp/types via
// `import type`, which is fully erased at compile time and introduces no
// runtime/impurity. This keeps the composer's output byte-identical to D2's
// JEPayload contract instead of duplicating (and drifting from) the shape.

import { computePeriodAmount } from "./period";
import type {
  JePayloadLine,
  JePayloadTemplate,
  RecurringScheduleLine,
  RecurringTemplate,
} from "./types";
import type { JELine, JEPayload } from "@/lib/erp/types";

export type ComposeRejectReason =
  | "template_missing_lines"
  | "line_missing_account_id"
  | "line_missing_posting_type"
  | "amount_not_derivable"
  | "schedule_line_not_found"
  | "unbalanced_template"
  | "amount_distribution_failed";

export interface ComposeInput {
  template: RecurringTemplate;
  period_index: number;
  /** ISO 'YYYY-MM-DD' — becomes JEPayload.transaction_date. */
  fire_date: string;
  /** Required only for template_type='schedule'. */
  schedule_lines?: RecurringScheduleLine[];
}

export type ComposedJE =
  | { ok: true; idempotency_key: string; payload: JEPayload }
  | { ok: false; reason: ComposeRejectReason };

interface NormalizedLine {
  account_id: string;
  posting_type: "Debit" | "Credit";
  /** Template's declared amount for this line (proportion basis). */
  template_amount: number;
  description?: string;
  customer_id?: string;
  class_id?: string;
  department_id?: string;
}

/** Compose the D2 JEPayload for a single fire. Pure; never throws. */
export function composeJEPayloadForFire(input: ComposeInput): ComposedJE {
  const { template, period_index, fire_date } = input;

  // Idempotency is the natural (template, period) key — NOT fire_id. A
  // re-created fire row would get a fresh uuid and defeat D2's UNIQUE
  // (firm_client_id, idempotency_key) retry guard; the natural key survives.
  const idempotency_key = `recurring_${template.template_id}_${period_index}`;

  // 1. Extract + validate the template's QBO-native lines.
  const rawLines = extractLines(template.je_payload_template);
  if (rawLines.length === 0) {
    return { ok: false, reason: "template_missing_lines" };
  }

  const normalized: NormalizedLine[] = [];
  for (const raw of rawLines) {
    const norm = normalizeLine(raw);
    if (norm === "line_missing_account_id" || norm === "line_missing_posting_type") {
      return { ok: false, reason: norm };
    }
    normalized.push(norm);
  }

  // 2. Determine per-line dollar amounts.
  let lineAmounts: number[];
  if (template.template_type === "fixed") {
    // Copy through the template amounts verbatim; the payload IS the source.
    lineAmounts = normalized.map((l) => l.template_amount);
  } else {
    // Re-derive the period total from the engine, then distribute.
    const derived = computePeriodAmount(template, period_index, input.schedule_lines);
    if (Number.isNaN(derived.amount)) {
      // Distinguish "no schedule line" from other non-derivable causes.
      if (
        derived.reason === "no_schedule_line_for_period" ||
        derived.reason === "no_schedule_lines_provided"
      ) {
        return { ok: false, reason: "schedule_line_not_found" };
      }
      return { ok: false, reason: "amount_not_derivable" };
    }
    const distributed = distribute(normalized, derived.amount);
    if (distributed === null) {
      return { ok: false, reason: "amount_distribution_failed" };
    }
    lineAmounts = distributed;
  }

  // 3. Build D2 lines and validate balance (in integer cents).
  const lines: JELine[] = normalized.map((n, i) => {
    const line: JELine = {
      account_id: n.account_id,
      amount: round2(lineAmounts[i]),
      posting_type: n.posting_type,
    };
    if (n.description !== undefined) line.description = n.description;
    if (n.customer_id !== undefined) line.customer_id = n.customer_id;
    if (n.class_id !== undefined) line.class_id = n.class_id;
    if (n.department_id !== undefined) line.department_id = n.department_id;
    return line;
  });

  const drCents = sumCents(lines, "Debit");
  const crCents = sumCents(lines, "Credit");
  if (drCents !== crCents) {
    return { ok: false, reason: "unbalanced_template" };
  }

  const payload: JEPayload = {
    transaction_date: fire_date,
    narration: template.name,
    private_note: `Recurring: ${template.name} (period ${period_index})`,
    lines,
  };

  return { ok: true, idempotency_key, payload };
}

/** Pull the QBO-native Line[] out of a template payload. */
function extractLines(payload: JePayloadTemplate): JePayloadLine[] {
  const line = payload?.Line;
  if (!Array.isArray(line)) return [];
  return line;
}

/** Translate one QBO-native line to a NormalizedLine, or a reject reason. */
function normalizeLine(
  raw: JePayloadLine,
): NormalizedLine | "line_missing_account_id" | "line_missing_posting_type" {
  const detail = (raw as Record<string, unknown>)["JournalEntryLineDetail"] as
    | Record<string, unknown>
    | undefined;

  const accountRef = detail?.["AccountRef"] as Record<string, unknown> | undefined;
  const accountId = accountRef?.["value"];
  if (typeof accountId !== "string" || accountId.length === 0) {
    return "line_missing_account_id";
  }

  const postingType = detail?.["PostingType"];
  if (postingType !== "Debit" && postingType !== "Credit") {
    return "line_missing_posting_type";
  }

  const amount = typeof raw.Amount === "number" && Number.isFinite(raw.Amount) ? raw.Amount : 0;

  const description = typeof raw["Description"] === "string" ? (raw["Description"] as string) : undefined;

  // Entity → customer_id (only when the entity is a Customer).
  let customerId: string | undefined;
  const entity = detail?.["Entity"] as Record<string, unknown> | undefined;
  if (entity && entity["Type"] === "Customer") {
    const entityRef = entity["EntityRef"] as Record<string, unknown> | undefined;
    const v = entityRef?.["value"];
    if (typeof v === "string") customerId = v;
  }

  const classId = refValue(detail?.["ClassRef"]);
  const departmentId = refValue(detail?.["DepartmentRef"]);

  return {
    account_id: accountId,
    posting_type: postingType,
    template_amount: amount,
    description,
    customer_id: customerId,
    class_id: classId,
    department_id: departmentId,
  };
}

function refValue(ref: unknown): string | undefined {
  const value = (ref as Record<string, unknown> | undefined)?.["value"];
  return typeof value === "string" ? value : undefined;
}

/**
 * Distribute `total` dollars across `lines`, per side, proportionally to each
 * line's template amount. Residual pennies land in the largest-magnitude line
 * on each side. Returns per-line dollar amounts aligned to `lines`, or null if
 * a side has lines but a zero proportion basis (can't distribute).
 */
function distribute(lines: NormalizedLine[], total: number): number[] | null {
  const totalCents = Math.round(total * 100);
  const out = new Array<number>(lines.length).fill(0);

  for (const side of ["Debit", "Credit"] as const) {
    const idxs = lines
      .map((l, i) => ({ l, i }))
      .filter((x) => x.l.posting_type === side)
      .map((x) => x.i);
    if (idxs.length === 0) continue;

    const basis = idxs.reduce((s, i) => s + Math.abs(lines[i].template_amount), 0);
    if (basis === 0) return null; // side present but no proportion basis

    let assigned = 0;
    let largestIdx = idxs[0];
    let largestMag = Math.abs(lines[idxs[0]].template_amount);
    for (const i of idxs) {
      const cents = Math.round(totalCents * (Math.abs(lines[i].template_amount) / basis));
      out[i] = cents;
      assigned += cents;
      const mag = Math.abs(lines[i].template_amount);
      if (mag > largestMag) {
        largestMag = mag;
        largestIdx = i;
      }
    }
    // Residual pennies → largest-magnitude line on this side.
    out[largestIdx] += totalCents - assigned;
  }

  return out.map((c) => c / 100);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function sumCents(lines: JELine[], side: "Debit" | "Credit"): number {
  return lines
    .filter((l) => l.posting_type === side)
    .reduce((s, l) => s + Math.round(l.amount * 100), 0);
}
