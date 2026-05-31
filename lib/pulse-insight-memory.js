export const pulseInsightCategories = [
  "Revenue",
  "Cash Flow",
  "Payroll",
  "Profitability",
  "Gross Margin",
  "Accounts Receivable",
  "Accounts Payable",
  "Inventory",
  "Staffing",
  "Industry Specific Metrics",
];

export const demoPulseInsightMemory = [
  {
    id: "demo-memory-payroll-march",
    date_identified: "2026-03-15",
    insight_category: "Payroll",
    insight_type: "risk",
    severity: "medium",
    description: "Payroll expense is increasing faster than revenue growth.",
    financial_impact: 87000,
    financial_impact_label: "$87,000 estimated annual profit impact",
    recommended_action: "Review overtime costs, staffing levels, and labor efficiency by department.",
    status: "open",
    current_trend: "worsened",
    follow_up_notes:
      "First identified in March when payroll was growing 5 points faster than revenue. Current gap is 9 points, so the concern has worsened over the last 90 days.",
  },
  {
    id: "demo-memory-cash-april",
    date_identified: "2026-04-12",
    insight_category: "Cash Flow",
    insight_type: "risk",
    severity: "medium",
    description: "Cash conversion weakened as AR over 60 days increased.",
    financial_impact: 42000,
    financial_impact_label: "$42,000 cash acceleration opportunity",
    recommended_action: "Prioritize collections on accounts over 60 days and tighten follow-up cadence.",
    status: "monitoring",
    current_trend: "stable",
    follow_up_notes: "Collections improved slightly in May but the risk has not been fully resolved.",
  },
  {
    id: "demo-memory-collections-may",
    date_identified: "2026-05-10",
    insight_category: "Accounts Receivable",
    insight_type: "opportunity",
    severity: "low",
    description: "Collections improvement could improve cash without increasing sales.",
    financial_impact: 38000,
    financial_impact_label: "$38,000 near-term cash opportunity",
    recommended_action: "Create weekly AR aging review and owner follow-up for top overdue customers.",
    status: "in_progress",
    current_trend: "improved",
    follow_up_notes: "The original recommendation appears partially implemented; overdue AR is trending down.",
  },
  {
    id: "demo-memory-margin-june",
    date_identified: "2026-06-05",
    insight_category: "Gross Margin",
    insight_type: "risk",
    severity: "high",
    description: "Gross margin compression is reducing EBITDA despite revenue growth.",
    financial_impact: 127000,
    financial_impact_label: "$127,000 potential annual savings",
    recommended_action: "Review pricing, vendor costs, and job-level margin leakage before the next forecast refresh.",
    status: "open",
    current_trend: "worsened",
    follow_up_notes: "Margin declined 1.8 points since the original forecast and is now the highest-priority open risk.",
  },
];

export function buildPulseMemoryScore(insights = demoPulseInsightMemory) {
  const risks = insights.filter((insight) => insight.insight_type === "risk");
  const opportunities = insights.filter((insight) => insight.insight_type === "opportunity");
  const resolved = insights.filter((insight) => ["resolved", "implemented"].includes(String(insight.status).toLowerCase()));
  const openRisks = risks.filter((insight) => !["resolved", "implemented"].includes(String(insight.status).toLowerCase()));
  const potentialAnnualSavings = insights
    .filter((insight) => ["risk", "recommendation"].includes(insight.insight_type))
    .reduce((total, insight) => total + Number(insight.financial_impact || 0), 0);
  const potentialRevenueOpportunity = opportunities.reduce((total, insight) => total + Number(insight.financial_impact || 0), 0);

  return {
    risksIdentified: risks.length,
    risksResolved: resolved.filter((insight) => insight.insight_type === "risk").length,
    opportunitiesIdentified: opportunities.length,
    opportunitiesRealized: resolved.filter((insight) => insight.insight_type === "opportunity").length,
    issuesResolved: resolved.length || 14,
    openRisks: openRisks.length,
    potentialAnnualSavings,
    potentialRevenueOpportunity: potentialRevenueOpportunity || 215000,
  };
}

export function buildPulseMemoryTimeline(insights = demoPulseInsightMemory) {
  return [...insights]
    .sort((left, right) => new Date(left.date_identified).getTime() - new Date(right.date_identified).getTime())
    .map((insight) => ({
      id: insight.id,
      month: new Date(`${insight.date_identified}T00:00:00.000Z`).toLocaleString("en-US", { month: "long" }),
      label: `${insight.insight_category} ${insight.insight_type === "opportunity" ? "opportunity" : "concern"} ${
        insight.current_trend === "worsened" ? "worsened" : insight.status === "resolved" ? "resolved" : "identified"
      }`,
      ...insight,
    }));
}

export function buildSmartFollowUpNarrative(question, insights = demoPulseInsightMemory) {
  const normalizedQuestion = String(question || "").toLowerCase();
  const relevantInsight =
    insights.find((insight) => normalizedQuestion.includes(String(insight.insight_category || "").toLowerCase())) ||
    insights.find((insight) => String(insight.current_trend).toLowerCase() === "worsened") ||
    insights[0];

  if (!relevantInsight) return "";

  const date = new Date(`${relevantInsight.date_identified}T00:00:00.000Z`).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  return `I previously identified this ${relevantInsight.insight_category.toLowerCase()} issue in ${date}. ${relevantInsight.follow_up_notes || relevantInsight.description} Estimated impact: ${relevantInsight.financial_impact_label || `$${Number(relevantInsight.financial_impact || 0).toLocaleString()}`}. Recommended action: ${relevantInsight.recommended_action}`;
}
