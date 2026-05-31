import { advisacorProductMission, getProductTier, getPulseQuestionLimit } from "./product-tiers";
import { answerPulseCfoQuestion, pulseMemoryDataCategories } from "./pulse-predict";
import { buildSmartFollowUpNarrative } from "./pulse-insight-memory";

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

function monthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function truncateJson(value, maxLength = 18000) {
  const serialized = JSON.stringify(value || null);
  if (serialized.length <= maxLength) return value;
  return {
    truncated: true,
    original_length: serialized.length,
    preview: serialized.slice(0, maxLength),
  };
}

async function safeSelect(label, query, fallback) {
  const { data, error, count } = await query;
  if (error) {
    console.warn(`[pulse-context] ${label} unavailable`, { message: error.message });
    return fallback;
  }
  return typeof count === "number" ? { data: data || [], count } : data || fallback;
}

export async function getPulseUsageState({ supabase, userId, subscriptionPlan }) {
  const tier = getProductTier(subscriptionPlan);
  const limit = getPulseQuestionLimit(subscriptionPlan);

  if (limit === "unlimited") {
    return { allowed: true, used: 0, limit, tier };
  }

  const result = await safeSelect(
    "usage",
    supabase
      .from("pulse_usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", monthStart()),
    { count: 0 },
  );
  const used = result.count || 0;
  return {
    allowed: used < limit,
    used,
    limit,
    tier,
  };
}

export async function recordPulseUsage({ supabase, userId, companyId, clientId, subscriptionPlan, question, responseSource }) {
  const { error } = await supabase.from("pulse_usage_events").insert({
    user_id: userId,
    company_id: companyId || null,
    client_id: clientId || null,
    subscription_plan: subscriptionPlan || null,
    question,
    response_source: responseSource,
    tokens_estimated: Math.ceil((question || "").length / 4),
  });

  if (error) {
    console.warn("[pulse-context] usage insert failed", { message: error.message });
  }
}

export async function buildPulseContextPackage({ supabase, userId, companyId = null, clientId = null, subscriptionPlan = null, question }) {
  const tier = getProductTier(subscriptionPlan);
  const userRows = await safeSelect(
    "user profile",
    supabase
      .from("users")
      .select("id, email, business_name, subscription_status, subscription_plan")
      .eq("id", userId)
      .limit(1),
    [],
  );

  let snapshotQuery = supabase
    .from("pulse_historical_snapshots")
    .select(
      "company_id, client_id, user_id, period_start, period_end, profit_and_loss, balance_sheet, cash_flow, payroll, employee_counts, customer_metrics, vendor_metrics, industry_metrics, forecast_data, generated_forecasts, generated_reports, source_metadata",
    )
    .order("period_end", { ascending: false })
    .limit(12);

  if (companyId) snapshotQuery = snapshotQuery.eq("company_id", companyId);
  else if (clientId) snapshotQuery = snapshotQuery.eq("client_id", clientId);
  else snapshotQuery = snapshotQuery.eq("user_id", userId);

  const snapshots = await safeSelect("historical snapshots", snapshotQuery, []);

  let conversationQuery = supabase
    .from("pulse_conversation_memory")
    .select("question, response, intent, source_context, created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  if (companyId) conversationQuery = conversationQuery.eq("company_id", companyId);
  else if (clientId) conversationQuery = conversationQuery.eq("client_id", clientId);
  else conversationQuery = conversationQuery.eq("user_id", userId);

  const conversations = await safeSelect("conversation memory", conversationQuery, []);

  let insightQuery = supabase
    .from("pulse_insight_memory")
    .select(
      "id, company_id, client_id, user_id, date_identified, insight_category, insight_type, severity, description, financial_impact, financial_impact_label, recommended_action, status, current_trend, follow_up_notes, source_type, source_reference, last_reviewed_at, created_at, updated_at",
    )
    .order("date_identified", { ascending: false })
    .limit(20);

  if (companyId) insightQuery = insightQuery.eq("company_id", companyId);
  else if (clientId) insightQuery = insightQuery.eq("client_id", clientId);
  else insightQuery = insightQuery.eq("user_id", userId);

  const insightMemory = await safeSelect("insight memory", insightQuery, []);

  const accountingConnections = await safeSelect(
    "accounting connections",
    supabase
      .from("accounting_connections")
      .select("provider, provider_family, provider_product, external_entity_id, external_entity_name, status, scopes, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(5),
    [],
  );

  return truncateJson({
    mission: advisacorProductMission,
    question,
    subscription: {
      plan: subscriptionPlan,
      tier: tier.name,
      pulse_question_limit_monthly: tier.entitlements.pulseQuestionLimitMonthly,
      intelligence_level: tier.entitlements.pulseIntelligenceLevel,
      historical_data_months: tier.entitlements.historicalDataMonths,
      forecast_days: tier.entitlements.forecastDays,
    },
    customer: {
      user: userRows?.[0] || null,
      company_id: companyId,
      client_id: clientId,
    },
    available_data_categories: pulseMemoryDataCategories,
    historical_snapshots: snapshots,
    prior_pulse_conversations: conversations,
    pulse_insight_memory: insightMemory,
    accounting_connections: accountingConnections,
    response_requirements: [
      "Act as a CFO, controller, financial analyst, FP&A manager, and business advisor.",
      "Reference prior recommendations, concerns, forecasts, alerts, opportunities, and executive briefings when relevant.",
      "Explain whether prior issues have improved, worsened, stayed stable, or been resolved.",
      "Use customer-specific data when present; clearly state when a data category is not yet populated.",
      "Explain findings, identify risks, identify opportunities, recommend actions, and quantify financial impact.",
      "Avoid generic chatbot language.",
      "Keep the answer executive-ready and plain English.",
    ],
  });
}

export async function askOpenAiWithPulseContext({ question, contextPackage }) {
  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey || openAiKey.includes("PASTE_") || openAiKey.includes("_HERE")) {
    return {
      source: "fallback",
      answer: [
        buildSmartFollowUpNarrative(question, contextPackage?.pulse_insight_memory),
        answerPulseCfoQuestion(question, {
          companyName: contextPackage?.customer?.user?.business_name || "this business",
          tierName: contextPackage?.subscription?.tier || "your Advisacor tier",
          scenarioHorizon: `${contextPackage?.subscription?.forecast_days || 90} days`,
          scenarioLimit: `${contextPackage?.subscription?.pulse_question_limit_monthly || "available"} monthly Pulse questions`,
        }),
      ]
        .filter(Boolean)
        .join("\n\n"),
    };
  }

  const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_OPENAI_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are Pulse, Advisacor's AI CFO. You are not a generic chatbot. Use the provided customer context and persistent insight memory to explain what happened, predict what will happen, and recommend what to do next. Reference prior recommendations, prior concerns, prior forecasts, risk alerts, opportunities, executive briefings, and conversations when relevant. Always explain whether issues improved, worsened, stayed stable, or were resolved, and include quantified financial impact where data supports it.",
        },
        {
          role: "user",
          content: JSON.stringify({
            question,
            context: contextPackage,
          }),
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.warn("[pulse-context] OpenAI request failed", { status: response.status, error: payload?.error?.message });
    return {
      source: "fallback",
      answer: [
        buildSmartFollowUpNarrative(question, contextPackage?.pulse_insight_memory),
        answerPulseCfoQuestion(question, {
          companyName: contextPackage?.customer?.user?.business_name || "this business",
          tierName: contextPackage?.subscription?.tier || "your Advisacor tier",
          scenarioHorizon: `${contextPackage?.subscription?.forecast_days || 90} days`,
          scenarioLimit: `${contextPackage?.subscription?.pulse_question_limit_monthly || "available"} monthly Pulse questions`,
        }),
      ]
        .filter(Boolean)
        .join("\n\n"),
    };
  }

  return {
    source: "openai",
    answer: payload?.choices?.[0]?.message?.content || "Pulse could not generate a response from the available context.",
  };
}
