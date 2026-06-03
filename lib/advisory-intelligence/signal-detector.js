import { supabaseAdmin } from "../supabase";
import { getAdvisoryThresholds } from "./thresholds";

function numeric(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function percentVariance(current, prior) {
  if (!Number.isFinite(current) || !Number.isFinite(prior) || prior === 0) return null;
  return ((current - prior) / Math.abs(prior)) * 100;
}

function absoluteVariance(current, prior) {
  if (!Number.isFinite(current) || !Number.isFinite(prior)) return null;
  return current - prior;
}

function metricValue(metrics = {}, key) {
  return numeric(metrics[key]);
}

function severityFromVariance({ variancePercent, varianceAmount, threshold, direction = "absolute" }) {
  const basis = Math.abs(Number.isFinite(variancePercent) ? variancePercent : varianceAmount || 0);
  const ratio = threshold ? basis / threshold : 0;
  if (ratio >= 2.5) return "critical";
  if (ratio >= 1.5) return "high";
  if (ratio >= 1) return "medium";
  return direction === "absolute" && basis > 0 ? "low" : null;
}

function confidenceFromInputs(current, prior, severity) {
  let confidence = 0.74;
  if (Number.isFinite(current) && Number.isFinite(prior)) confidence += 0.12;
  if (severity === "critical") confidence += 0.08;
  if (severity === "high") confidence += 0.05;
  return Math.min(0.97, Number(confidence.toFixed(2)));
}

function titleForMetric(metric, severity) {
  const labels = {
    revenue: "Revenue movement exceeded threshold",
    gross_margin: "Gross margin movement exceeded threshold",
    ebitda: "EBITDA movement exceeded threshold",
    cash_balance: "Cash balance declined",
    ar_over_60: "AR aging increased",
    ap_past_due: "AP pressure increased",
    dso: "DSO increased",
    clean_claim_rate: "Clean claim rate declined",
    ppd: "Per patient day cost increased",
    ar_over_90: "AR over 90 days increased",
    job_cost_overrun: "Job cost overrun detected",
    retainage: "Retainage risk increased",
    under_over_billing: "Billing variance exceeded threshold",
    material_variance: "Material variance exceeded threshold",
    labor_efficiency_variance: "Labor efficiency variance exceeded threshold",
    scrap_variance: "Scrap variance exceeded threshold",
  };
  return `${labels[metric] || "Advisory signal detected"} (${severity})`;
}

function descriptionForMetric({ metric, current, prior, varianceAmount, variancePercent, threshold }) {
  const formattedVariance = Number.isFinite(variancePercent)
    ? `${variancePercent.toFixed(1)}%`
    : Number.isFinite(varianceAmount)
      ? `${varianceAmount.toFixed(2)}`
      : "above threshold";
  return `${metric.replaceAll("_", " ")} changed from ${prior ?? "n/a"} to ${current ?? "n/a"}, with variance ${formattedVariance} versus threshold ${threshold}.`;
}

function makeSignal({ companyId, industry, signalType, metric, sourceModule, period, current, prior, threshold, direction }) {
  const varianceAmount = absoluteVariance(current, prior);
  const variancePercent = percentVariance(current, prior);
  const severity = severityFromVariance({ variancePercent, varianceAmount, threshold, direction });
  if (!severity || severity === "low") return null;
  return {
    company_id: companyId,
    signal_type: signalType,
    industry,
    severity,
    title: titleForMetric(metric, severity),
    description: descriptionForMetric({ metric, current, prior, varianceAmount, variancePercent, threshold }),
    detected_metric: metric,
    detected_period: period,
    prior_value: prior,
    current_value: current,
    variance_amount: varianceAmount,
    variance_percent: variancePercent,
    confidence_score: confidenceFromInputs(current, prior, severity),
    source_module: sourceModule,
    status: "new",
  };
}

function changeExceeds({ current, prior, threshold, mode = "absolute_percent", direction = "absolute" }) {
  if (!Number.isFinite(current) || !Number.isFinite(prior)) return false;
  if (mode === "days") return current - prior > threshold;
  const variance = percentVariance(current, prior);
  if (!Number.isFinite(variance)) return false;
  if (direction === "decline") return variance <= -threshold;
  if (direction === "increase") return variance >= threshold;
  return Math.abs(variance) >= threshold;
}

function buildCandidateSignals({ companyId, industry, currentMetrics, priorMetrics, period, sourceModule, thresholdOverrides }) {
  const thresholds = getAdvisoryThresholds(industry, thresholdOverrides);
  const general = thresholds.general;
  const industryThresholds = thresholds[thresholds.industryKey] || {};
  const definitions = [
    ["revenue_variance", "revenue", general.revenueVariancePercent, "absolute"],
    ["gross_margin_variance", "gross_margin", general.grossMarginVariancePercent, "absolute"],
    ["ebitda_variance", "ebitda", general.ebitdaVariancePercent, "absolute"],
    ["cash_decline", "cash_balance", general.cashDeclinePercent, "decline"],
    ["ar_aging_increase", "ar_over_60", general.arOver60IncreasePercent, "increase"],
    ["ap_pressure", "ap_past_due", general.apPastDueIncreasePercent, "increase"],
    ["dso_increase", "dso", industryThresholds.dsoIncreaseDays, "increase", "days"],
    ["clean_claim_rate_decline", "clean_claim_rate", industryThresholds.cleanClaimRateDeclinePercent, "decline"],
    ["ppd_increase", "ppd", industryThresholds.ppdIncreasePercent, "increase"],
    ["ar_aging_increase", "ar_over_90", industryThresholds.arOver90IncreasePercent, "increase"],
    ["job_cost_overrun", "job_cost_overrun", industryThresholds.jobCostOverrunPercent, "increase"],
    ["retainage_risk", "retainage", industryThresholds.retainageIncreasePercent, "increase"],
    ["billing_variance", "under_over_billing", industryThresholds.underOverBillingVariancePercent, "absolute"],
    ["material_variance", "material_variance", industryThresholds.materialVariancePercent, "absolute"],
    ["labor_efficiency_variance", "labor_efficiency_variance", industryThresholds.laborEfficiencyVariancePercent, "absolute"],
    ["scrap_variance", "scrap_variance", industryThresholds.scrapVariancePercent, "increase"],
  ];

  return definitions
    .filter(([, , threshold]) => Number.isFinite(Number(threshold)))
    .map(([signalType, metric, threshold, direction, mode]) => {
      const current = metricValue(currentMetrics, metric);
      const prior = metricValue(priorMetrics, metric);
      if (!changeExceeds({ current, prior, threshold, mode, direction })) return null;
      return makeSignal({
        companyId,
        industry,
        signalType,
        metric,
        sourceModule,
        period,
        current,
        prior,
        threshold,
        direction,
      });
    })
    .filter(Boolean);
}

async function insertSignalIfNew(supabase, signal) {
  const { data: existing, error: existingError } = await supabase
    .from("advisory_signals")
    .select("*")
    .eq("company_id", signal.company_id)
    .eq("signal_type", signal.signal_type)
    .eq("detected_metric", signal.detected_metric)
    .eq("detected_period", signal.detected_period)
    .eq("source_module", signal.source_module)
    .in("status", ["new", "reviewed", "converted_to_package"])
    .maybeSingle();

  if (existingError && existingError.code !== "PGRST116") throw existingError;
  if (existing) return { signal: existing, created: false };

  const { data, error } = await supabase
    .from("advisory_signals")
    .insert(signal)
    .select("*")
    .single();
  if (error) throw error;
  return { signal: data, created: true };
}

export async function detectAdvisorySignals({
  companyId,
  industry = "general",
  currentMetrics = {},
  priorMetrics = {},
  period = "current",
  sourceModule = "advisory_intelligence",
  thresholdOverrides = {},
  supabase = supabaseAdmin,
}) {
  if (!supabase) throw new Error("Supabase admin client is not configured.");
  if (!companyId) throw new Error("companyId is required.");

  const candidates = buildCandidateSignals({
    companyId,
    industry,
    currentMetrics,
    priorMetrics,
    period,
    sourceModule,
    thresholdOverrides,
  });

  const results = [];
  for (const candidate of candidates) {
    results.push(await insertSignalIfNew(supabase, candidate));
  }

  return {
    companyId,
    industry,
    period,
    evaluatedSignals: candidates.length,
    createdSignals: results.filter((result) => result.created).map((result) => result.signal),
    existingSignals: results.filter((result) => !result.created).map((result) => result.signal),
    signals: results.map((result) => result.signal),
  };
}

export const advisorySignalInternals = {
  buildCandidateSignals,
  severityFromVariance,
  changeExceeds,
};
