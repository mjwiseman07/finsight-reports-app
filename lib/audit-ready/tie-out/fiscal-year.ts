import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { fetchQboCompanyInfo } from "./qbo-reports";

/**
 * Ensure the engagement has a cached fiscal_year_start_month. If null, fetch from QBO
 * CompanyInfo and persist it. Returns the month (1-12).
 */
export async function resolveFiscalYearStartMonth(input: {
  engagementId: string;
  realmId: string;
  accessToken: string;
}): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { data: eng } = await supabase
    .from("audit_ready_engagements")
    .select("fiscal_year_start_month")
    .eq("id", input.engagementId)
    .maybeSingle();
  const cached =
    (eng?.fiscal_year_start_month as number | null | undefined) ?? null;
  if (cached && cached >= 1 && cached <= 12) return cached;
  const info = await fetchQboCompanyInfo({
    realmId: input.realmId,
    accessToken: input.accessToken,
  });
  const month = info.fiscalYearStartMonth || 1;
  await supabase
    .from("audit_ready_engagements")
    .update({ fiscal_year_start_month: month })
    .eq("id", input.engagementId);
  return month;
}

/**
 * Compute the default activity window: fiscal-year-start (of the FY containing asOfDate)
 * through asOfDate.
 */
export function activityWindowForFiscalYear(
  asOfDate: string,
  fiscalYearStartMonth: number,
): { start: string; end: string } {
  const d = new Date(asOfDate + "T00:00:00Z");
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1; // 1-12
  const fyStartYear = m >= fiscalYearStartMonth ? y : y - 1;
  const startIso = `${fyStartYear}-${String(fiscalYearStartMonth).padStart(2, "0")}-01`;
  return { start: startIso, end: asOfDate };
}
