import { supabaseAdmin } from "../supabase";

const highImpactSeverities = new Set(["high", "critical"]);

const recommendationTemplates = {
  dso: {
    recommendation_type: "working_capital_review",
    title: "Review DSO and collection workflow",
    actions: ["Review aging buckets", "Identify payer or customer delays", "Confirm collection workflow ownership", "Review billing timing"],
    expected_impact: "Improved cash conversion and clearer collection priorities.",
    package_type: "month_end",
  },
  ar_over_60: {
    recommendation_type: "ar_aging_review",
    title: "Review AR aging movement",
    actions: ["Review balances over 60 days", "Identify customer concentration", "Prioritize collection outreach", "Confirm invoice dispute status"],
    expected_impact: "Reduced collection risk and stronger short-term cash visibility.",
    package_type: "month_end",
  },
  ar_over_90: {
    recommendation_type: "ar_aging_review",
    title: "Review AR over 90 days",
    actions: ["Review AR over 90 days", "Identify payer or customer delays", "Escalate collection workflow", "Assess reserve exposure"],
    expected_impact: "Reduced aging exposure and clearer reserve risk.",
    package_type: "healthcare_rcm",
  },
  gross_margin: {
    recommendation_type: "gross_margin_analysis",
    title: "Analyze gross margin movement",
    actions: ["Review revenue and cost mix", "Analyze labor and material movement", "Review customer or job profitability", "Identify margin compression drivers"],
    expected_impact: "Clearer margin bridge and prioritized profitability actions.",
    package_type: "month_end",
  },
  ebitda: {
    recommendation_type: "ebitda_variance_review",
    title: "Review EBITDA variance",
    actions: ["Review revenue variance", "Review operating expenses", "Isolate one-time costs", "Prepare management commentary"],
    expected_impact: "More reliable executive-level earnings explanation.",
    package_type: "board_package",
  },
  revenue: {
    recommendation_type: "revenue_variance_review",
    title: "Review revenue movement",
    actions: ["Compare revenue by customer", "Review volume and pricing movement", "Identify timing impacts", "Prepare executive revenue commentary"],
    expected_impact: "Clearer explanation of top-line movement and follow-up actions.",
    package_type: "month_end",
  },
  cash_balance: {
    recommendation_type: "cash_pressure_review",
    title: "Review cash balance decline",
    actions: ["Review cash receipts and disbursements", "Analyze AR collection timing", "Review AP timing", "Prepare short-term liquidity view"],
    expected_impact: "Improved liquidity visibility and cash timing decisions.",
    package_type: "month_end",
  },
  ap_past_due: {
    recommendation_type: "ap_pressure_review",
    title: "Review AP pressure",
    actions: ["Review past-due vendor balances", "Prioritize critical vendors", "Align payment timing with collections", "Assess working capital pressure"],
    expected_impact: "Reduced vendor pressure and stronger payment prioritization.",
    package_type: "month_end",
  },
  clean_claim_rate: {
    recommendation_type: "healthcare_rcm_review",
    title: "Review clean claim rate decline",
    actions: ["Review denial and rejection trends", "Identify billing workflow gaps", "Compare payer delays", "Prioritize RCM process review"],
    expected_impact: "Improved revenue cycle visibility and claim quality focus.",
    package_type: "healthcare_rcm",
  },
  ppd: {
    recommendation_type: "healthcare_ppd_review",
    title: "Review per patient day cost increase",
    actions: ["Run staffing scenario analysis", "Compare census movement", "Review payroll and contract labor", "Identify cost per patient day drivers"],
    expected_impact: "Clearer staffing and census alignment decisions.",
    package_type: "healthcare_rcm",
  },
  job_cost_overrun: {
    recommendation_type: "construction_wip_review",
    title: "Review job cost overrun",
    actions: ["Review WIP schedule", "Compare budget to actual cost", "Review change orders", "Assess margin fade"],
    expected_impact: "Earlier identification of job profitability risk.",
    package_type: "construction_wip",
  },
  retainage: {
    recommendation_type: "retainage_risk_review",
    title: "Review retainage exposure",
    actions: ["Review retainage by job", "Assess collection timing", "Review contract terms", "Identify exposure concentration"],
    expected_impact: "Better retainage visibility and cash collection planning.",
    package_type: "construction_wip",
  },
  under_over_billing: {
    recommendation_type: "billing_variance_review",
    title: "Review underbilling and overbilling variance",
    actions: ["Review WIP billing position", "Compare earned revenue to billings", "Assess revenue recognition risk", "Prepare job-level commentary"],
    expected_impact: "Improved WIP accuracy and billing risk visibility.",
    package_type: "construction_wip",
  },
  material_variance: {
    recommendation_type: "manufacturing_variance_review",
    title: "Review material variance",
    actions: ["Review BOM standards", "Analyze purchase price variance", "Review scrap and usage", "Identify supplier or product drivers"],
    expected_impact: "Clearer material cost control and variance accountability.",
    package_type: "manufacturing_variance",
  },
  labor_efficiency_variance: {
    recommendation_type: "manufacturing_variance_review",
    title: "Review labor efficiency variance",
    actions: ["Review labor efficiency", "Compare standard to actual hours", "Identify production bottlenecks", "Assess staffing or training needs"],
    expected_impact: "Improved production efficiency visibility.",
    package_type: "manufacturing_variance",
  },
  scrap_variance: {
    recommendation_type: "manufacturing_variance_review",
    title: "Review scrap variance",
    actions: ["Review scrap trends", "Identify product or shift concentration", "Compare standard loss to actual", "Assess quality control actions"],
    expected_impact: "Improved quality cost visibility and production focus.",
    package_type: "manufacturing_variance",
  },
};

function templateForSignal(signal) {
  return recommendationTemplates[signal.detected_metric] || {
    recommendation_type: `${signal.detected_metric || "signal"}_review`,
    title: `Review ${String(signal.detected_metric || "advisory signal").replaceAll("_", " ")}`,
    actions: ["Review supporting detail", "Compare current and prior period", "Identify operational drivers", "Prepare executive commentary"],
    expected_impact: "Clearer advisor review and executive decision support.",
    package_type: "month_end",
  };
}

function summaryForSignal(signal) {
  return `${signal.title}. ${signal.description} Advisacor recommends review before sending or sharing any package externally.`;
}

async function insertRecommendationIfNew(supabase, signal) {
  const template = templateForSignal(signal);
  const { data: existing, error: existingError } = await supabase
    .from("advisory_recommendations")
    .select("*")
    .eq("signal_id", signal.id)
    .eq("recommendation_type", template.recommendation_type)
    .maybeSingle();
  if (existingError && existingError.code !== "PGRST116") throw existingError;
  if (existing) return { recommendation: existing, created: false, packageType: template.package_type };

  const row = {
    company_id: signal.company_id,
    signal_id: signal.id,
    recommendation_type: template.recommendation_type,
    title: template.title,
    summary: summaryForSignal(signal),
    recommended_actions: template.actions,
    expected_impact: template.expected_impact,
  };
  const { data, error } = await supabase
    .from("advisory_recommendations")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return { recommendation: data, created: true, packageType: template.package_type };
}

async function enqueuePackageIfNeeded(supabase, signal, packageType) {
  if (!packageType || !highImpactSeverities.has(signal.severity)) return null;
  const { data: existing, error: existingError } = await supabase
    .from("advisory_package_queue")
    .select("*")
    .eq("company_id", signal.company_id)
    .eq("package_type", packageType)
    .eq("trigger_signal_id", signal.id)
    .in("status", ["pending_review", "approved"])
    .maybeSingle();
  if (existingError && existingError.code !== "PGRST116") throw existingError;
  if (existing) return existing;

  const { data, error } = await supabase
    .from("advisory_package_queue")
    .insert({
      company_id: signal.company_id,
      package_type: packageType,
      trigger_source: "signal",
      trigger_signal_id: signal.id,
      status: "pending_review",
      recommended_period: signal.detected_period || "month_end",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function generateRecommendationsForSignals({ signals = [], supabase = supabaseAdmin, enqueuePackages = true }) {
  if (!supabase) throw new Error("Supabase admin client is not configured.");
  const eligibleSignals = signals.filter((signal) => highImpactSeverities.has(signal.severity));
  const recommendations = [];
  const packageQueue = [];

  for (const signal of eligibleSignals) {
    const result = await insertRecommendationIfNew(supabase, signal);
    recommendations.push(result.recommendation);
    if (enqueuePackages) {
      const queueItem = await enqueuePackageIfNeeded(supabase, signal, result.packageType);
      if (queueItem) packageQueue.push(queueItem);
    }
  }

  return {
    recommendations,
    packageQueue,
    eligibleSignals,
  };
}

export const advisoryRecommendationInternals = {
  templateForSignal,
  summaryForSignal,
};
