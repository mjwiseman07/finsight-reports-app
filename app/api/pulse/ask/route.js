import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { rateLimit } from "../../../../lib/rate-limit";
import {
  askOpenAiWithPulseContext,
  buildPulseContextPackage,
  getPulseUsageState,
  mergeConversationEntityMemory,
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

    const body = await request.json().catch(() => ({}));
    const question = String(body.question || "").trim();
    if (!question || question.length > 1200) {
      return NextResponse.json({ error: "Please ask a business question under 1,200 characters." }, { status: 400 });
    }

    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
    const requestedLeadId = String(body.leadId || request.headers.get("x-free-review-lead-id") || "").trim();

    if (!token && requestedLeadId) {
      const { data: lead, error: leadError } = await supabaseAdmin
        .from("free_review_leads")
        .select("id, first_name, last_name, business_name, email, industry, revenue_range, fiscal_year, status, additional_business_information")
        .eq("id", requestedLeadId)
        .maybeSingle();

      if (leadError || !lead?.id) {
        return NextResponse.json({ error: "Lead session is not valid for Pulse." }, { status: 401 });
      }

      const contextPackage = {
        mission: "Advisacor Pulse answers business questions using the customer's available onboarding, lead, QuickBooks, and package-generation context.",
        question,
        subscription: {
          plan: "free_review",
          tier: "Free Review",
          pulse_question_limit_monthly: 100,
          intelligence_level: "trial_cfo_context",
          historical_data_months: 12,
          forecast_days: 90,
        },
        customer: {
          user: {
            business_name: lead.business_name || body.leadContext?.companyName || "Free Review Company",
            email: lead.email,
            industry: lead.industry || body.leadContext?.industryType || "Industry Intelligence",
            revenue_range: lead.revenue_range,
            fiscal_year: lead.fiscal_year,
          },
          company_id: null,
          client_id: null,
        },
        available_data_categories: [
          "Lead capture profile",
          "Onboarding company context",
          "QuickBooks connection status when available",
          "Generated financial package context",
          "Dashboard KPI context",
        ],
        historical_snapshots: [],
        prior_pulse_conversations: [],
        active_conversation_entities: body.conversationMemory || {},
        conversation_entity_hints: [],
        pulse_insight_memory: [],
        accounting_connections: [],
        lead_context: body.leadContext || {},
        investigation_workflow: {
          ordered_search_steps: [
            "Search generated package",
            "Search dashboard metrics",
            "Search Pulse memory",
            "Search imported QuickBooks reports",
            "Search transaction detail",
            "Search GL detail",
            "Search subledgers",
            "Search supporting schedules",
            "Generate response only after reviewing available evidence",
          ],
          note: "Free-review lead sessions do not expose stored QuickBooks transaction tokens unless the customer has a saved authenticated accounting connection.",
        },
        quickbooks_transaction_investigation: {
          available: false,
          reason: "No authenticated stored QuickBooks connection is available for this lead session.",
        },
        generated_package_investigation_facts: {
          fixed_asset_roll_forward: {
            gross_fixed_assets_beginning: 704000,
            additions: 0,
            disposals: -25000,
            transfers: 0,
            step_up_valuation_adjustment: 0,
            step_down_valuation_adjustment: 0,
            gross_fixed_assets_ending: 679000,
            accumulated_depreciation_ending: -114000,
            net_book_value_ending: 565000,
            known_limitation:
              "The generated package identifies a $25,000 gross fixed asset disposal, but the lead/session context does not include the fixed asset detail schedule or QuickBooks transaction detail needed to identify the specific asset.",
          },
          customer_sales_context: {
            total_revenue: 824000,
            top_customers: [
              {
                customer_name: "Blue Ridge Industrial Services",
                current_month_revenue: 186000,
                percent_of_revenue: 22.6,
                prior_month_revenue: 162000,
                change: 24000,
                concentration_risk: "Moderate",
              },
              {
                customer_name: "Summit Field Operations",
                current_month_revenue: 128000,
                percent_of_revenue: 15.5,
                prior_month_revenue: 119000,
                change: 9000,
                concentration_risk: "Watch",
              },
            ],
          },
          financial_statement_context: {
            cash_balance: 428000,
            current_month_revenue: 824000,
            current_month_net_income: 269900,
            profitability_percent: 14.6,
            gross_margin_percent: 42,
            accounts_receivable: 146000,
            accounts_payable: 78000,
            working_capital: 330000,
            payroll_and_labor_available: true,
            current_fte: 57,
            prior_fte: 52,
            payroll_cost_per_fte: 4250,
            revenue_per_fte: 14456,
            source_note: "Summarized financial statement and dashboard data is sufficient for Pulse Predict scenario modeling without transaction-level QuickBooks detail.",
          },
        },
        response_requirements: [
          "Use OpenAI to answer as Pulse, Advisacor's AI CFO.",
          "Answer the user's question directly first.",
          "Default to one short executive-ready sentence when the answer exists.",
          "Do not automatically include supporting data, financial impact, business implication, recommended action, searched-data explanations, report inventories, or technical process details unless requested.",
          "For Pulse Predict / Scenario Modeling questions such as can I afford, what if, should I hire, what happens if, predict, or forecast, use available summarized financial statement and dashboard data instead of requiring transaction-level QuickBooks detail.",
          "Estimate monthly, quarterly, annual, and multi-year impact when relevant, state assumptions clearly, and provide a CFO-style recommendation.",
          "Do not say data is unavailable for Pulse Predict scenarios unless no financial statement or dashboard financial data is available at all.",
          "Never answer with internal process language such as 'I need to investigate', 'I should review', 'I should search', or 'I should analyze'. Perform the analysis from available context and provide the conclusion.",
          "When the answer is unavailable, identify the reason in one short sentence.",
          "Advisacor package limitation: say the analysis or detail is available but is not included in the customer's current Advisacor package.",
          "QuickBooks data limitation: say Pulse can perform the analysis, however the required detail is not currently available from QuickBooks data.",
          "Data not yet imported or synchronized: say Pulse can answer once the specific detail has been imported from QuickBooks.",
          "No data exists: say the information required to answer the question is not currently available.",
          "Answer using the business context available from onboarding and generated package data.",
          "Maintain CFO meeting-style continuity. Resolve pronouns such as their, they, them, it, this, and that against active_conversation_entities before answering.",
          "Remember customers, vendors, assets, employees, accounts, reports, and prior answers discussed in the current conversation.",
          "Keep the answer short, direct, clear, and business-focused.",
        ],
      };

      const pulseResponse = await askOpenAiWithPulseContext({ question, contextPackage });
      const conversationMemory = mergeConversationEntityMemory({
        question,
        answer: pulseResponse.answer,
        contextPackage,
        previousMemory: body.conversationMemory,
      });

      return NextResponse.json({
        question,
        answer: pulseResponse.answer,
        source: pulseResponse.source,
        conversationMemory,
        usage: {
          used: null,
          limit: 100,
          tier: "Free Review",
        },
      });
    }

    if (!token) return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user?.id) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
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
      conversationMemory: body.conversationMemory || null,
    });

    const pulseResponse = await askOpenAiWithPulseContext({ question, contextPackage });
    const conversationMemory = mergeConversationEntityMemory({
      question,
      answer: pulseResponse.answer,
      contextPackage,
      previousMemory: body.conversationMemory,
    });

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
        active_conversation_entities: conversationMemory,
      },
    });

    return NextResponse.json({
      question,
      answer: pulseResponse.answer,
      source: pulseResponse.source,
      conversationMemory,
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
