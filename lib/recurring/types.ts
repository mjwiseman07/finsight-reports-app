// D5.1 — Recurring / Template Entries — shared types.
//
// Pure type surface mirroring the D5.0 schema
// (supabase/migrations/20260714_00_d5_recurring_templates.sql). No runtime,
// no imports, no side effects. Dates are ISO 'YYYY-MM-DD' strings and
// timestamps are ISO-8601 strings, matching how Supabase serializes
// date / timestamptz columns over the JS client.

export type TemplateType = "fixed" | "straight_line" | "schedule";

export type Cadence =
  | "weekly"
  | "biweekly"
  | "semimonthly"
  | "monthly"
  | "quarterly"
  | "annual"
  | "custom_days";

export type TemplateStatus = "active" | "paused" | "ended" | "archived";

export type TemplateOrigin =
  | "user"
  | "ai_suggested"
  | "ai_accepted"
  | "imported_qbo";

export type FireStatus =
  | "proposed"
  | "posted"
  | "skipped"
  | "rejected"
  | "failed"
  | "cash_basis";

/** One line of the stored QBO JournalEntry payload template. */
export interface JePayloadLine {
  Amount?: number;
  [key: string]: unknown;
}

/** The jsonb je_payload_template blob. Kept loose on purpose — the cadence /
 *  period engines never mutate it; only `fixed` templates read Line[].Amount. */
export interface JePayloadTemplate {
  Line?: JePayloadLine[];
  [key: string]: unknown;
}

/** Mirrors public.recurring_templates. */
export interface RecurringTemplate {
  template_id: string;
  firm_client_id: string;
  name: string;
  description: string | null;
  template_type: TemplateType;
  je_payload_template: JePayloadTemplate;

  // Cadence
  cadence: Cadence;
  custom_days: number | null;
  day_of_month: number | null;
  day_of_week: number | null;
  month_of_year: number | null;
  timezone: string;

  // Straight-line / schedule
  starting_balance: number | null;
  total_periods: number | null;
  periods_elapsed: number;

  // Lifecycle
  start_date: string;
  end_date: string | null;
  next_fire_date: string;
  last_fired_at: string | null;
  status: TemplateStatus;

  // Mode
  auto_post: boolean;
  origin: TemplateOrigin;
  origin_memory_id: string | null;

  // Reinforcement counters
  fire_count: number;
  post_count: number;
  skip_count: number;
  reject_count: number;

  created_at: string;
  updated_at: string;
  created_by_user_id: string | null;
  ended_by_user_id: string | null;
  ended_at: string | null;
}

/** Mirrors public.recurring_schedule_lines. */
export interface RecurringScheduleLine {
  schedule_line_id: string;
  template_id: string;
  period_index: number;
  amount: number;
  memo_override: string | null;
}

/** Mirrors public.recurring_fires. */
export interface RecurringFire {
  fire_id: string;
  template_id: string;
  firm_client_id: string;
  fire_date: string;
  fired_at: string;
  period_index: number;
  status: FireStatus;
  je_attempt_id: string | null;
  qbo_je_id: string | null;
  proposal_id: string | null;
  reviewer_user_id: string | null;
  reviewed_at: string | null;
  amount_override: number | null;
  skip_reason: string | null;
  reject_reason: string | null;
  error_detail: string | null;
  created_at: string;
  updated_at: string;
}

/** Result of computeNextFireDate (cadence.ts). */
export interface NextFireResult {
  /** The next scheduled fire date as ISO 'YYYY-MM-DD'. When is_terminal is
   *  true this is the last date considered (or the unchanged anchor). */
  next_fire_date: string;
  is_terminal: boolean;
  reason?: string;
}

/** Result of computePeriodAmount (period.ts). */
export interface PeriodAmountResult {
  /** Period amount in dollars. NaN for `fixed` templates (see reason). */
  amount: number;
  is_terminal: boolean;
  reason?: string;
}
