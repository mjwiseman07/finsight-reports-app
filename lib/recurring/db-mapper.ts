// D5.2 — pure row mappers. Converts snake_case rows from the DB client into the
// strict D5.1 domain types. TOTALLY pure: no DB, no HTTP, no environment reads,
// no clock. Row-in / value-out only. Throws `d5.mapper.*:<field>` on any missing
// or wrong-typed field so a malformed row fails loud rather than silently
// producing a half-typed template.

import type {
  Cadence,
  JePayloadTemplate,
  RecurringScheduleLine,
  RecurringTemplate,
  TemplateOrigin,
  TemplateStatus,
  TemplateType,
} from "./types";

type Row = Record<string, unknown>;

const TEMPLATE_TYPES: readonly TemplateType[] = ["fixed", "straight_line", "schedule"];
const CADENCES: readonly Cadence[] = [
  "weekly",
  "biweekly",
  "semimonthly",
  "monthly",
  "quarterly",
  "annual",
  "custom_days",
];
const STATUSES: readonly TemplateStatus[] = ["active", "paused", "ended", "archived"];
const ORIGINS: readonly TemplateOrigin[] = ["user", "ai_suggested", "ai_accepted", "imported_qbo"];

function present(row: Row, field: string): unknown {
  const value = row[field];
  if (value === undefined || value === null) {
    throw new Error(`d5.mapper.missing_field:${field}`);
  }
  return value;
}

function reqString(row: Row, field: string): string {
  const value = present(row, field);
  if (typeof value !== "string") {
    throw new Error(`d5.mapper.invalid_field:${field}`);
  }
  return value;
}

/** Numeric columns arrive as either a JS number or a precision-preserving
 *  string from PostgREST; accept both, reject anything non-finite. */
function reqNumber(row: Row, field: string): number {
  const value = present(row, field);
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n)) {
    throw new Error(`d5.mapper.invalid_field:${field}`);
  }
  return n;
}

function reqBoolean(row: Row, field: string): boolean {
  const value = present(row, field);
  if (typeof value !== "boolean") {
    throw new Error(`d5.mapper.invalid_field:${field}`);
  }
  return value;
}

function reqObject(row: Row, field: string): Record<string, unknown> {
  const value = present(row, field);
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`d5.mapper.invalid_field:${field}`);
  }
  return value as Record<string, unknown>;
}

function reqEnum<T extends string>(row: Row, field: string, allowed: readonly T[]): T {
  const value = reqString(row, field);
  if (!allowed.includes(value as T)) {
    throw new Error(`d5.mapper.invalid_field:${field}`);
  }
  return value as T;
}

function optString(row: Row, field: string): string | null {
  const value = row[field];
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new Error(`d5.mapper.invalid_field:${field}`);
  }
  return value;
}

function optNumber(row: Row, field: string): number | null {
  const value = row[field];
  if (value === undefined || value === null) return null;
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n)) {
    throw new Error(`d5.mapper.invalid_field:${field}`);
  }
  return n;
}

/** Map a public.recurring_templates row to a strict RecurringTemplate. */
export function rowToRecurringTemplate(row: Row): RecurringTemplate {
  return {
    template_id: reqString(row, "template_id"),
    firm_client_id: reqString(row, "firm_client_id"),
    name: reqString(row, "name"),
    description: optString(row, "description"),
    template_type: reqEnum(row, "template_type", TEMPLATE_TYPES),
    je_payload_template: reqObject(row, "je_payload_template") as JePayloadTemplate,

    cadence: reqEnum(row, "cadence", CADENCES),
    custom_days: optNumber(row, "custom_days"),
    day_of_month: optNumber(row, "day_of_month"),
    day_of_week: optNumber(row, "day_of_week"),
    month_of_year: optNumber(row, "month_of_year"),
    timezone: reqString(row, "timezone"),

    starting_balance: optNumber(row, "starting_balance"),
    total_periods: optNumber(row, "total_periods"),
    periods_elapsed: reqNumber(row, "periods_elapsed"),

    start_date: reqString(row, "start_date"),
    end_date: optString(row, "end_date"),
    next_fire_date: reqString(row, "next_fire_date"),
    last_fired_at: optString(row, "last_fired_at"),
    status: reqEnum(row, "status", STATUSES),

    auto_post: reqBoolean(row, "auto_post"),
    origin: reqEnum(row, "origin", ORIGINS),
    origin_memory_id: optString(row, "origin_memory_id"),

    fire_count: reqNumber(row, "fire_count"),
    post_count: reqNumber(row, "post_count"),
    skip_count: reqNumber(row, "skip_count"),
    reject_count: reqNumber(row, "reject_count"),

    created_at: reqString(row, "created_at"),
    updated_at: reqString(row, "updated_at"),
    created_by_user_id: optString(row, "created_by_user_id"),
    ended_by_user_id: optString(row, "ended_by_user_id"),
    ended_at: optString(row, "ended_at"),
  };
}

/** Map a public.recurring_schedule_lines row to a strict RecurringScheduleLine. */
export function rowToRecurringScheduleLine(row: Row): RecurringScheduleLine {
  return {
    schedule_line_id: reqString(row, "schedule_line_id"),
    template_id: reqString(row, "template_id"),
    period_index: reqNumber(row, "period_index"),
    amount: reqNumber(row, "amount"),
    memo_override: optString(row, "memo_override"),
  };
}
