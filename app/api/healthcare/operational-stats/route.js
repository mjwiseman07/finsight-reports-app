import { NextResponse } from "next/server";
import { getAuthenticatedCompanyUser, resolveCompanyMembership } from "../../../../lib/company-security";
import {
  buildHealthcareExecutiveCommentary,
  buildPerPatientDayChartSeries,
  buildPerPatientDayTrendAnalysis,
  calculatePerPatientDayMetrics,
  healthcareIndustryType,
  healthcareOperationalInputSources,
  healthcarePeriodTypes,
  normalizeHealthcareOperationalStats,
} from "../../../../lib/healthcare-operational-intelligence";
import { rateLimit } from "../../../../lib/rate-limit";
import { supabaseAdmin } from "../../../../lib/supabase";

function numberOrZero(value) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function normalizeInputSource(inputSource) {
  return healthcareOperationalInputSources.includes(inputSource) ? inputSource : "manual";
}

function normalizePeriodType(periodType) {
  return healthcarePeriodTypes.includes(periodType) ? periodType : "month";
}

async function assertHealthcareCompany(companyId) {
  const { data: company, error } = await supabaseAdmin
    .from("companies")
    .select("id, industry_type")
    .eq("id", companyId)
    .maybeSingle();

  if (error?.code === "42P01" || error?.code === "42703") {
    return { response: NextResponse.json({ error: "Company industry storage is not configured." }, { status: 501 }) };
  }

  if (error || !company) {
    return { response: NextResponse.json({ error: "Company not found." }, { status: 404 }) };
  }

  if (company.industry_type !== healthcareIndustryType) {
    return { response: NextResponse.json({ error: "Healthcare operational intelligence requires industry_type = Healthcare." }, { status: 403 }) };
  }

  return { company };
}

export async function GET(request) {
  const rateLimitResponse = rateLimit(request, { key: "healthcare-operational-stats-read", limit: 60, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const access = await getAuthenticatedCompanyUser(request);
  if (access.response) return access.response;

  const { searchParams } = new URL(request.url);
  const companyId = String(searchParams.get("companyId") || "").trim();
  const periodType = normalizePeriodType(String(searchParams.get("periodType") || "month"));

  if (!companyId) return NextResponse.json({ error: "companyId is required." }, { status: 400 });

  const membership = await resolveCompanyMembership({ userId: access.user.id, companyId });
  if (membership.response) return membership.response;

  const healthcareCompany = await assertHealthcareCompany(companyId);
  if (healthcareCompany.response) return healthcareCompany.response;

  const { data: rows, error } = await supabaseAdmin
    .from("healthcare_operational_stats")
    .select("*")
    .eq("company_id", companyId)
    .eq("period_type", periodType)
    .order("period_start", { ascending: true })
    .order("created_at", { ascending: true });

  if (error?.code === "42P01") {
    return NextResponse.json({ error: "Run the healthcare operational stats migration first." }, { status: 501 });
  }

  if (error) return NextResponse.json({ error: "Unable to load healthcare operational stats." }, { status: 500 });

  const normalizedRows = (rows || []).map(normalizeHealthcareOperationalStats);
  const currentStats = normalizedRows[normalizedRows.length - 1] || null;
  const priorMonthStats = normalizedRows[normalizedRows.length - 2] || null;

  return NextResponse.json({
    rows: normalizedRows,
    current_metrics: currentStats ? calculatePerPatientDayMetrics(currentStats) : {},
    trend_analysis: currentStats
      ? buildPerPatientDayTrendAnalysis(currentStats, {
          priorMonth: priorMonthStats,
          priorQuarter: priorMonthStats,
          priorYear: normalizedRows[0],
        })
      : {},
    executive_commentary: currentStats
      ? buildHealthcareExecutiveCommentary({
          currentStats,
          priorQuarterStats: priorMonthStats,
          priorYearStats: normalizedRows[0],
        })
      : [],
    chart_series: buildPerPatientDayChartSeries(normalizedRows),
  });
}

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: "healthcare-operational-stats-write", limit: 30, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const access = await getAuthenticatedCompanyUser(request);
  if (access.response) return access.response;

  const body = await request.json().catch(() => ({}));
  const companyId = String(body.company_id || "").trim();
  if (!companyId) return NextResponse.json({ error: "company_id is required." }, { status: 400 });

  const membership = await resolveCompanyMembership({
    userId: access.user.id,
    companyId,
    requiredPermission: "manage_company_settings",
  });
  if (membership.response) return membership.response;

  const healthcareCompany = await assertHealthcareCompany(companyId);
  if (healthcareCompany.response) return healthcareCompany.response;

  const periodLabel = String(body.period_label || "").trim();
  if (!periodLabel) return NextResponse.json({ error: "period_label is required." }, { status: 400 });

  const row = {
    company_id: companyId,
    period_type: normalizePeriodType(String(body.period_type || "month")),
    period_label: periodLabel,
    period_start: body.period_start || null,
    period_end: body.period_end || null,
    patient_days: numberOrZero(body.patient_days),
    total_operating_expenses: numberOrZero(body.total_operating_expenses),
    payroll_expense: numberOrZero(body.payroll_expense),
    total_revenue: numberOrZero(body.total_revenue),
    medical_supplies_expense: numberOrZero(body.medical_supplies_expense),
    contract_labor_expense: numberOrZero(body.contract_labor_expense),
    input_source: normalizeInputSource(body.input_source),
    census_file_name: body.census_file_name || null,
    import_batch_id: body.import_batch_id || null,
    created_by: access.user.id,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from("healthcare_operational_stats")
    .upsert(row, { onConflict: "company_id,period_type,period_label" })
    .select("*")
    .single();

  if (error?.code === "42P01") {
    return NextResponse.json({ error: "Run the healthcare operational stats migration first." }, { status: 501 });
  }

  if (error) return NextResponse.json({ error: "Unable to save healthcare operational stats." }, { status: 500 });

  const normalizedStats = normalizeHealthcareOperationalStats(data);
  return NextResponse.json({
    ok: true,
    stats: normalizedStats,
    metrics: calculatePerPatientDayMetrics(normalizedStats),
  });
}
