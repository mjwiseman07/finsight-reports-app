import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { rateLimit } from "../../../../lib/rate-limit";
import {
  buildPdfCustomizationResponse,
  buildFixedAssetQuestionResponse,
  buildValuationAdjustmentUpdateResponse,
  buildReportPayload,
  canUsePdfReport,
  detectPdfPackageRequest,
  getRequestedRecurrence,
  shouldPersistRecurringPreference,
} from "../../../../lib/pdf-package-customization";

function isMissingSchema(error) {
  const message = String(error?.message || "");
  return error?.code === "42P01" || error?.code === "42703" || message.includes("schema cache") || message.includes("does not exist");
}

async function resolveUser(request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
  if (!token) return { response: NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 }) };

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user?.id) {
    return { response: NextResponse.json({ error: "Invalid or expired token" }, { status: 401 }) };
  }

  return { user: data.user };
}

async function loadSnapshots({ userId, companyId, clientId }) {
  let query = supabaseAdmin
    .from("pulse_historical_snapshots")
    .select("company_id, client_id, user_id, period_start, period_end, balance_sheet, cash_flow, profit_and_loss, payroll, employee_counts, forecast_data, source_metadata")
    .order("period_end", { ascending: false })
    .limit(12);

  if (companyId) query = query.eq("company_id", companyId);
  else if (clientId) query = query.eq("client_id", clientId);
  else query = query.eq("user_id", userId);

  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

function getCurrentPackagePeriod() {
  const now = new Date();
  return now.toLocaleString("en-US", { month: "long", year: "numeric" });
}

async function saveCustomization({
  userId,
  companyId,
  clientId,
  subscriptionPlan,
  requestText,
  reportKey,
  report,
  recurrence,
  response,
  reportPayload,
  packagePeriod,
  packageType,
  action,
}) {
  const { data, error } = await supabaseAdmin
    .from("pdf_package_customizations")
    .insert({
      user_id: userId,
      company_id: companyId || null,
      client_id: clientId || null,
      package_period: packagePeriod,
      package_type: packageType,
      customization_action: action,
      report_key: reportKey,
      report_title: report.title,
      subscription_plan: subscriptionPlan || null,
      recurrence,
      status: "confirmed_recurring_preference",
      request_text: requestText,
      pulse_response: response,
      report_payload: reportPayload,
      added_to_table_of_contents: true,
      added_to_executive_summary: ["executive_summary", "board_package"].includes(report.placement),
      section_placement: report.placement,
    })
    .select("id, status, recurrence")
    .single();

  if (error) {
    if (isMissingSchema(error)) {
      return { saved: false, warning: "Run supabase/migrations/20260531_create_pdf_package_customizations.sql to persist PDF customization preferences." };
    }
    throw error;
  }

  return { saved: true, customization: data };
}

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: "pdf-package-customize", limit: 30, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });
    }

    const resolved = await resolveUser(request);
    if (resolved.response) return resolved.response;

    const body = await request.json().catch(() => ({}));
    const question = String(body.question || body.request || "").trim();
    if (!question) return NextResponse.json({ error: "A package customization request is required." }, { status: 400 });

    const detected = detectPdfPackageRequest(question);
    if (!detected) {
      return NextResponse.json({ matched: false, message: "No PDF package customization request was detected." });
    }

    const subscriptionPlan =
      body.subscriptionPlan ||
      resolved.user.app_metadata?.subscription_plan ||
      resolved.user.user_metadata?.subscription_plan ||
      null;
    const companyId = body.companyId || body.company_id || null;
    const clientId = body.clientId || body.client_id || null;
    const recurrence = body.recurrence || getRequestedRecurrence(question);
    const packagePeriod = body.packagePeriod || getCurrentPackagePeriod();
    const permission = canUsePdfReport(subscriptionPlan, detected.reportKey);

    const snapshots = await loadSnapshots({ userId: resolved.user.id, companyId, clientId });
    const reportPayload = permission.allowed
      ? buildReportPayload({ reportKey: detected.reportKey, snapshots })
      : {};
    const response =
      detected.mode === "valuation_adjustment_update"
        ? { allowed: permission.allowed, response: buildValuationAdjustmentUpdateResponse({ permission }) }
        : detected.mode === "fixed_asset_question"
        ? { allowed: permission.allowed, response: buildFixedAssetQuestionResponse({ reportPayload, permission }) }
        : buildPdfCustomizationResponse({
            reportKey: detected.reportKey,
            reportPayload,
            permission,
            recurrence,
            packagePeriod,
            packageType: detected.packageType,
            action: detected.action,
          });

    const saveResult = response.allowed && detected.mode === "package_customization" && shouldPersistRecurringPreference(recurrence)
      ? await saveCustomization({
          userId: resolved.user.id,
          companyId,
          clientId,
          subscriptionPlan,
          requestText: question,
          reportKey: detected.reportKey,
          report: detected.report,
          recurrence,
          response: response.response,
          reportPayload,
          packagePeriod,
          packageType: detected.packageType,
          action: detected.action,
        })
      : { saved: false };

    return NextResponse.json({
      matched: true,
      allowed: response.allowed,
      reportKey: detected.reportKey,
      reportTitle: detected.report.title,
      requiredTier: permission.requiredTier.name,
      currentTier: permission.tier.name,
      recurrence,
      packageType: detected.packageType,
      action: detected.action,
      answer: response.response,
      report: reportPayload,
      packageUpdates: response.allowed
        ? [
            "table_of_contents",
            "page_numbers",
            detected.packageType === "powerpoint" ? "board_deck_sections" : "supporting_schedules",
            "executive_summary_if_applicable",
          ]
        : [],
      ...saveResult,
    });
  } catch (error) {
    console.error("[pdf-packages/customize] failed", { message: error?.message });
    return NextResponse.json({ error: error?.message || "Unable to customize PDF package." }, { status: 500 });
  }
}
