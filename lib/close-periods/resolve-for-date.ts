import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

export interface ResolvedClosePeriod {
  close_period_id: string;
  period_start: Date;
  period_end: Date;
}

function toISODate(date: Date | string): string {
  if (typeof date === "string") return date.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

/**
 * Resolve the close period whose [period_start, period_end] range contains
 * `date` for the given client. Returns null when no period covers the date —
 * callers must treat that as "nothing to evaluate", never an error.
 */
export async function resolveClosePeriodForDate(
  firmClientId: string,
  date: Date | string,
): Promise<ResolvedClosePeriod | null> {
  const iso = toISODate(date);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("close_periods")
    .select("id, period_start, period_end")
    .eq("firm_client_id", firmClientId)
    .lte("period_start", iso)
    .gte("period_end", iso)
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return {
    close_period_id: data.id as string,
    period_start: new Date(data.period_start as string),
    period_end: new Date(data.period_end as string),
  };
}

/**
 * Resolve the most recent close period for a client (used by the manual runner
 * endpoint when neither a close_period_id nor a txn_date is supplied).
 */
export async function resolveMostRecentClosePeriod(
  firmClientId: string,
): Promise<ResolvedClosePeriod | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("close_periods")
    .select("id, period_start, period_end")
    .eq("firm_client_id", firmClientId)
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return {
    close_period_id: data.id as string,
    period_start: new Date(data.period_start as string),
    period_end: new Date(data.period_end as string),
  };
}
