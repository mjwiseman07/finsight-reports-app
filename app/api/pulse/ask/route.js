import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { rateLimit } from "../../../../lib/rate-limit";
import {
  askOpenAiWithPulseContext,
  buildPulseContextPackage,
  getPulseUsageState,
  recordPulseUsage,
} from "../../../../lib/pulse-context-engine";
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

function isMissingColumnError(error) {
  const message = String(error?.message || "");
  return error?.code === "42703" || message.includes("column") || message.includes("schema cache");
}

async function loadUserSubscription(userId) {
  const primary = await supabaseAdmin
    .from("users")
    .select("subscription_plan, subscription_status, business_name")
    .eq("id", userId)
    .limit(1);

  if (!primary.error || !isMissingColumnError(primary.error)) {
    return Array.isArray(primary.data) ? primary.data[0] || null : null;
  }

  const fallback = await supabaseAdmin
    .from("users")
    .select("subscription_status, business_name")
    .eq("id", userId)
    .limit(1);

  if (fallback.error) throw fallback.error;
  const row = Array.isArray(fallback.data) ? fallback.data[0] || null : null;
  return row ? { ...row, subscription_plan: null } : null;
}

async function loadPackageSnapshots({ userId, companyId, clientId }) {
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

async function savePdfCustomization({
  userId,
  companyId,
  clientId,
  subscriptionPlan,
  question,
  reportKey,
  report,
  recurrence,
  answer,
  reportPayload,
  packageType,
  action,
}) {
  const { data, error } = await supabaseAdmin
    .from("pdf_package_customizations")
    .insert({
      user_id: userId,
      company_id: companyId || null,
      client_id: clientId || null,
      package_period: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }),
      package_type: packageType,
      customization_action: action,
      report_key: reportKey,
      report_title: report.title,
      subscription_plan: subscriptionPlan || null,
      recurrence,
      status: "confirmed_recurring_preference",
      request_text: question,
      pulse_response: answer,
      report_payload: reportPayload,
      added_to_table_of_contents: true,
      added_to_executive_summary: ["executive_summary", "board_package"].includes(report.placement),
      section_placement: report.placement,
    })
    .select("id, status, recurrence")
    .single();

  if (error) {
    const message = String(error?.message || "");
    if (error?.code === "42P01" || error?.code === "42703" || message.includes("schema cache") || message.includes("does not exist")) {
      return null;
    }
    throw error;
  }
  return data;
}

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: "pulse-ask", limit: 30, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });
    }

    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
    if (!token) return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user?.id) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const question = String(body.question || "").trim();
    if (!question || question.length > 1200) {
      return NextResponse.json({ error: "Please ask a business question under 1,200 characters." }, { status: 400 });
    }

    const userRecord = await loadUserSubscription(authData.user.id);
    const subscriptionPlan =
      userRecord?.subscription_plan ||
      authData.user.app_metadata?.subscription_plan ||
      authData.user.user_metadata?.subscription_plan ||
      null;
    const usage = await getPulseUsageState({
      supabase: supabaseAdmin,
      userId: authData.user.id,
      subscriptionPlan,
    });

    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: `Monthly Pulse question limit reached for ${usage.tier.name}.`,
          usage: { used: usage.used, limit: usage.limit, tier: usage.tier.name },
        },
        { status: 429 },
      );
    }

    const companyId = body.companyId || body.company_id || null;
    const clientId = body.clientId || body.client_id || null;
    const pdfCustomization = detectPdfPackageRequest(question);

    if (pdfCustomization) {
      const recurrence = body.recurrence || getRequestedRecurrence(question);
      const permission = canUsePdfReport(subscriptionPlan, pdfCustomization.reportKey);
      const snapshots = await loadPackageSnapshots({ userId: authData.user.id, companyId, clientId });
      const reportPayload = permission.allowed
        ? buildReportPayload({ reportKey: pdfCustomization.reportKey, snapshots })
        : {};
      const customizationResponse =
        pdfCustomization.mode === "valuation_adjustment_update"
          ? { allowed: permission.allowed, response: buildValuationAdjustmentUpdateResponse({ permission }) }
          : pdfCustomization.mode === "fixed_asset_question"
          ? { allowed: permission.allowed, response: buildFixedAssetQuestionResponse({ reportPayload, permission }) }
          : buildPdfCustomizationResponse({
              reportKey: pdfCustomization.reportKey,
              reportPayload,
              permission,
              recurrence,
              packagePeriod: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }),
              packageType: pdfCustomization.packageType,
              action: pdfCustomization.action,
            });
      const savedCustomization =
        customizationResponse.allowed &&
        pdfCustomization.mode === "package_customization" &&
        shouldPersistRecurringPreference(recurrence)
        ? await savePdfCustomization({
            userId: authData.user.id,
            companyId,
            clientId,
            subscriptionPlan,
            question,
            reportKey: pdfCustomization.reportKey,
            report: pdfCustomization.report,
            recurrence,
            answer: customizationResponse.response,
            reportPayload,
            packageType: pdfCustomization.packageType,
            action: pdfCustomization.action,
          })
        : null;

      await recordPulseUsage({
        supabase: supabaseAdmin,
        userId: authData.user.id,
        companyId,
        clientId,
        subscriptionPlan,
        question,
        responseSource: "pdf_package_customization",
      });

      await supabaseAdmin.from("pulse_conversation_memory").insert({
        user_id: authData.user.id,
        company_id: companyId,
        client_id: clientId,
        question,
        response: customizationResponse.response,
        intent: "pdf_package_customization",
        source_context: {
          report_key: pdfCustomization.reportKey,
          recurrence,
          package_type: pdfCustomization.packageType,
          action: pdfCustomization.action,
          subscription_plan: subscriptionPlan,
          customization_id: savedCustomization?.id || null,
        },
      });

      return NextResponse.json({
        question,
        answer: customizationResponse.response,
        source: "pdf_package_customization",
        packageCustomization: {
          matched: true,
          allowed: customizationResponse.allowed,
          mode: pdfCustomization.mode,
          reportKey: pdfCustomization.reportKey,
          reportTitle: pdfCustomization.report.title,
          recurrence,
          packageType: pdfCustomization.packageType,
          action: pdfCustomization.action,
          preferenceSaved: Boolean(savedCustomization?.id),
          customizationId: savedCustomization?.id || null,
          report: reportPayload,
        },
        usage: {
          used: usage.limit === "unlimited" ? null : usage.used + 1,
          limit: usage.limit,
          tier: usage.tier.name,
        },
      });
    }

    const contextPackage = await buildPulseContextPackage({
      supabase: supabaseAdmin,
      userId: authData.user.id,
      companyId,
      clientId,
      subscriptionPlan,
      question,
    });

    const pulseResponse = await askOpenAiWithPulseContext({ question, contextPackage });

    await recordPulseUsage({
      supabase: supabaseAdmin,
      userId: authData.user.id,
      companyId,
      clientId,
      subscriptionPlan,
      question,
      responseSource: pulseResponse.source,
    });

    await supabaseAdmin.from("pulse_conversation_memory").insert({
      user_id: authData.user.id,
      company_id: companyId,
      client_id: clientId,
      question,
      response: pulseResponse.answer,
      intent: "executive_question",
      source_context: {
        response_source: pulseResponse.source,
        subscription_plan: subscriptionPlan,
        context_categories: contextPackage.available_data_categories,
      },
    });

    return NextResponse.json({
      question,
      answer: pulseResponse.answer,
      source: pulseResponse.source,
      usage: {
        used: usage.limit === "unlimited" ? null : usage.used + 1,
        limit: usage.limit,
        tier: usage.tier.name,
      },
    });
  } catch (error) {
    console.error("[pulse/ask] failed", { message: error?.message });
    return NextResponse.json({ error: error?.message || "Pulse could not answer this question." }, { status: 500 });
  }
}
