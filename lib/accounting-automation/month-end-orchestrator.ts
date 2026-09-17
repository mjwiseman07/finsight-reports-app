import { createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { buildMonthEndReviewPackage, type MonthEndReviewPackage } from "./month-end-review";
import { loadWeeklyCandidates, type WeeklyCandidate, type WeeklyFinding } from "./weekly-completeness";

export function priorUtcMonthEnd(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)).toISOString().slice(0, 10);
}

function packageKey(candidate: WeeklyCandidate, periodEnd: string): string {
  return createHash("sha256")
    .update(`${candidate.firm_client_id}:${candidate.accounting_sync_id}:${periodEnd}:month-end-v1`)
    .digest("hex");
}

async function loadWeeklyFindings(firmClientId: string, periodEnd: string): Promise<WeeklyFinding[]> {
  const db = createServiceClient();
  const { data: runs, error } = await db.from("ra_pro_weekly_completeness_runs")
    .select("id")
    .eq("firm_client_id", firmClientId)
    .lte("week_ending", periodEnd)
    .order("week_ending", { ascending: false })
    .limit(1);
  if (error) throw error;
  if (!runs?.[0]?.id) return [];
  const { data, error: findingError } = await db.from("ra_pro_weekly_completeness_findings")
    .select("category, code, severity, item_count, amount_cents, evidence")
    .eq("run_id", runs[0].id);
  if (findingError) throw findingError;
  return (data ?? []) as WeeklyFinding[];
}

export async function runRaProMonthEndReview(options?: {
  now?: Date;
  loadCandidates?: () => Promise<WeeklyCandidate[]>;
  loadFindings?: (firmClientId: string, periodEnd: string) => Promise<WeeklyFinding[]>;
  persist?: (record: Record<string, unknown>) => Promise<unknown>;
}) {
  const now = options?.now ?? new Date();
  const periodEnd = priorUtcMonthEnd(now);
  const candidates = await (options?.loadCandidates ?? loadWeeklyCandidates)();
  const loadFindings = options?.loadFindings ?? loadWeeklyFindings;
  const persist = options?.persist ?? (async (record) => {
    const { error } = await createServiceClient().rpc("persist_ra_pro_month_end_review_package", { p_package: record });
    if (error) throw error;
  });
  let completed = 0;
  const failures: Array<{ firm_client_id: string; code: string }> = [];

  for (const candidate of candidates) {
    try {
      if (candidate.normalized_payload.reportPeriod.endDate !== periodEnd) {
        throw new Error("month_end_period_snapshot_missing");
      }
      const weeklyFindings = await loadFindings(candidate.firm_client_id, periodEnd);
      const reviewPackage: MonthEndReviewPackage = buildMonthEndReviewPackage({
        payload: candidate.normalized_payload,
        weeklyFindings,
      });
      await persist({
        firm_id: candidate.firm_id,
        firm_client_id: candidate.firm_client_id,
        company_id: candidate.company_id,
        accounting_sync_id: candidate.accounting_sync_id,
        provider: candidate.provider,
        period_end: periodEnd,
        status: reviewPackage.status,
        review_package: reviewPackage,
        idempotency_key: packageKey(candidate, periodEnd),
        completed_at: now.toISOString(),
      });
      completed += 1;
    } catch {
      failures.push({ firm_client_id: candidate.firm_client_id, code: "month_end_review_failed" });
    }
  }
  return { status: failures.length ? "partial" : "ok", period_end: periodEnd, eligible_clients: candidates.length, completed, failed: failures.length, failures };
}
