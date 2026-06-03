function moneyOrNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "not available";
  if (Math.abs(numeric) >= 1000) {
    return numeric.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  }
  return numeric.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function percentLabel(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "not available";
  return `${numeric.toFixed(1)}%`;
}

function signalImpact(signal) {
  if (Number.isFinite(Number(signal.variance_percent))) return percentLabel(signal.variance_percent);
  if (Number.isFinite(Number(signal.variance_amount))) return moneyOrNumber(signal.variance_amount);
  return "above configured threshold";
}

export function summarizeAdvisorySignal(signal, recommendation = null) {
  const metric = String(signal.detected_metric || "metric").replaceAll("_", " ");
  const actionText = Array.isArray(recommendation?.recommended_actions)
    ? recommendation.recommended_actions.slice(0, 3).join("; ")
    : "Review supporting detail, confirm drivers, and prepare advisor commentary.";
  const packageRecommended = ["high", "critical"].includes(signal.severity);

  return {
    title: signal.title || "Advisory intelligence signal",
    severity: signal.severity || "medium",
    what_changed: `${metric} moved from ${moneyOrNumber(signal.prior_value)} to ${moneyOrNumber(signal.current_value)}.`,
    why_it_matters: `${signal.description || "The change exceeded the configured advisory threshold."}`,
    financial_impact: `Detected impact: ${signalImpact(signal)}.`,
    recommended_next_steps: actionText,
    should_generate_package: packageRecommended,
    package_guidance: packageRecommended
      ? "A recommended package is available for review and approval. Nothing is sent externally unless a user approves it."
      : "Monitor the signal and review if it persists.",
  };
}

export function summarizeAdvisorySignals({ signals = [], recommendations = [] }) {
  const recommendationBySignalId = new Map(recommendations.map((recommendation) => [recommendation.signal_id, recommendation]));
  const summaries = signals.map((signal) => summarizeAdvisorySignal(signal, recommendationBySignalId.get(signal.id)));
  const highPriority = summaries.filter((summary) => ["high", "critical"].includes(summary.severity));
  return {
    headline: highPriority.length
      ? "Advisacor detected changes that may require advisor review. A recommended package is available."
      : "Advisacor is monitoring for meaningful financial and operational changes.",
    summaries,
    package_recommended: highPriority.some((summary) => summary.should_generate_package),
  };
}
