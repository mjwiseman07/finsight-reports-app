export const advisacorProductMission = {
  overview:
    "Advisacor is an AI-powered financial intelligence and CFO automation platform for business owners, bookkeeping firms, CPA firms, controllers, and fractional CFOs.",
  objectives: ["Explain what happened", "Predict what will happen", "Recommend what to do next"],
  promise:
    "Provide every business with an AI-powered CFO, analyst, controller, and board reporting team through a single platform.",
};

export const advisacorProductTiers = [
  {
    key: "pulse_starter",
    legacyKeys: ["essential"],
    name: "Pulse Starter",
    priceRange: "$49-$79/mo",
    targetCustomer: "Small business owners, solopreneurs, and companies under $1M revenue",
    stripeEnvVar: "STRIPE_PRICE_PULSE_STARTER",
    fallbackStripeEnvVar: "STRIPE_PRICE_ESSENTIAL",
    features: [
      "Financial dashboard",
      "Revenue trends",
      "Expense trends",
      "Cash balance tracking",
      "Gross profit tracking",
      "Net income tracking",
      "Financial health score",
      "Pulse AI natural language chat",
      "Financial and KPI explanations",
      "Weekly AI briefing",
      "Revenue, expense, and cash forecasts",
      "30, 60, and 90-day projections",
      "Simple What-If Analysis",
    ],
    summaryFeatures: [
      "QuickBooks integration",
      "Business dashboard",
      "Revenue and expense trends",
      "Basic KPI monitoring",
      "Weekly AI business briefing",
      "Pulse AI chat",
      "Basic 30-60 day forecasting",
      "Financial health score",
    ],
    entitlements: {
      quickbooksIntegration: true,
      dashboard: true,
      weeklyPulseBrief: true,
      pulseChat: true,
      pulseQuestionLimitMonthly: 100,
      pulseIntelligenceLevel: "ai-cfo",
      historicalDataMonths: 12,
      forecastDays: 60,
      whatIfModeling: "simple",
      savedScenarioLimit: 3,
      scenarioVariables: "single-variable",
      scenarioForecastHorizon: "90 days",
      customKpis: false,
      boardPackages: false,
      multiCompany: false,
      whiteLabel: false,
    },
    whatIfScenario: {
      label: "Simple What-If Analysis",
      inputs: ["Revenue increase/decrease %", "Expense increase/decrease %", "One-time expense additions", "One employee hire"],
      outputs: ["Estimated profit impact", "Cash impact", "Basic forecast changes"],
      limits: ["3 saved scenarios", "Single-variable changes only", "90-day forecast horizon"],
      examples: [
        "What happens if sales increase 10%?",
        "What happens if I hire one employee at $50,000?",
        "What happens if rent increases by $1,000 per month?",
      ],
    },
  },
  {
    key: "pulse_pro",
    legacyKeys: [],
    name: "Pulse Pro",
    priceRange: "$149-$249/mo",
    targetCustomer: "Growing businesses and businesses with internal accounting staff",
    stripeEnvVar: "STRIPE_PRICE_PULSE_PRO",
    fallbackStripeEnvVar: "STRIPE_PRICE_PROFESSIONAL",
    features: [
      "Everything in Starter",
      "Advanced revenue, EBITDA, cash flow, and budget forecasting",
      "Custom KPI builder",
      "Department and operational metrics",
      "Advanced predictive analytics",
      "Revenue, expense, margin, and cash runway predictions",
      "Predictive alerts",
      "Advanced What-If Modeling",
    ],
    summaryFeatures: [
      "Advanced forecasting",
      "Custom KPI creation",
      "Predictive alerts",
      "Cash flow forecasting",
      "Scenario planning",
      "Employee productivity metrics",
      "Enhanced Pulse AI analysis",
    ],
    entitlements: {
      quickbooksIntegration: true,
      dashboard: true,
      weeklyPulseBrief: true,
      pulseChat: true,
      pulseQuestionLimitMonthly: 500,
      pulseIntelligenceLevel: "ai-cfo",
      historicalDataMonths: 12,
      unlimitedSavedConversations: true,
      forecastDays: 90,
      whatIfModeling: "advanced",
      savedScenarioLimit: "unlimited",
      scenarioVariables: "multi-variable",
      scenarioForecastHorizon: "12 months",
      customKpis: true,
      scenarioPlanning: true,
      predictiveAlerts: true,
      boardPackages: false,
      multiCompany: false,
      whiteLabel: false,
    },
    whatIfScenario: {
      label: "Advanced What-If Modeling",
      inputs: ["Multiple revenue drivers", "Multiple expense categories", "Hiring plans", "Pricing changes", "Customer growth assumptions"],
      outputs: ["Profit forecast", "Cash forecast", "EBITDA forecast", "KPI impact analysis"],
      limits: ["Unlimited scenarios", "Multi-variable scenarios", "12-month forecasting"],
      examples: [
        "What happens if I hire 2 technicians and increase prices by 5%?",
        "What happens if revenue grows 15% but labor costs increase 8%?",
      ],
    },
  },
  {
    key: "advisacor_professional",
    legacyKeys: ["professional"],
    name: "Advisacor Professional",
    priceRange: "$399-$799/mo",
    targetCustomer: "Bookkeeping firms, CPA firms, and multi-location companies",
    stripeEnvVar: "STRIPE_PRICE_ADVISACOR_PROFESSIONAL",
    fallbackStripeEnvVar: "STRIPE_PRICE_PROFESSIONAL",
    featured: true,
    features: [
      "Everything in Pro",
      "Automated board packages",
      "Financial statements",
      "KPI dashboards",
      "Variance analysis",
      "Executive summaries",
      "PowerPoint generation",
      "Flux Analysis Engine",
      "AI-generated management commentary",
      "Multi-company support",
      "Client portfolio dashboard",
      "Industry-specific analytics",
      "Monthly executive reporting",
      "White-label branding options",
      "Healthcare, Construction, and Manufacturing dashboards",
    ],
    summaryFeatures: [
      "Automated board packages",
      "PowerPoint generation",
      "Flux analysis",
      "AI-generated management commentary",
      "Client portfolio dashboard",
      "Industry-specific analytics",
      "White-label branding options",
    ],
    entitlements: {
      quickbooksIntegration: true,
      dashboard: true,
      weeklyPulseBrief: true,
      pulseChat: true,
      pulseQuestionLimitMonthly: 2500,
      pulseIntelligenceLevel: "ai-cfo",
      historicalDataMonths: 12,
      forecastDays: 90,
      whatIfModeling: "strategic",
      savedScenarioLimit: "unlimited",
      scenarioVariables: "client, department, budget, workforce",
      scenarioForecastHorizon: "12 months",
      customKpis: true,
      scenarioPlanning: true,
      predictiveAlerts: true,
      boardPackages: true,
      powerpointGeneration: true,
      multiCompany: true,
      whiteLabel: true,
    },
    whatIfScenario: {
      label: "Strategic Scenario Planning",
      inputs: ["Client-wide scenario analysis", "Industry benchmarking", "Department-level modeling", "Budget planning scenarios", "Workforce planning"],
      outputs: ["Client portfolio impact", "Department-level forecast", "Budget scenario variance", "Workforce planning impact"],
      limits: ["Unlimited scenarios", "Multi-company/client modeling", "12-month forecasting"],
      examples: [
        "What happens if all 20 clients increase labor costs by 10%?",
        "What impact would opening a new location have?",
      ],
    },
  },
  {
    key: "advisacor_cfo",
    legacyKeys: ["virtual_cfo", "virtualCfo"],
    name: "Advisacor CFO",
    priceRange: "$999-$2,499+/mo",
    targetCustomer: "Fractional CFO firms and mid-market organizations",
    stripeEnvVar: "STRIPE_PRICE_ADVISACOR_CFO",
    fallbackStripeEnvVar: "STRIPE_PRICE_VIRTUAL_CFO",
    features: [
      "Everything in Professional",
      "Strategic Planning Suite",
      "Advanced predictive models",
      "Multi-year forecasting",
      "Scenario simulations",
      "Risk analysis",
      "Capital planning",
      "Acquisition modeling",
      "Executive scorecards",
      "Investor reporting",
    ],
    summaryFeatures: [
      "Strategic planning tools",
      "Advanced predictive models",
      "Capital investment analysis",
      "Acquisition modeling",
      "Executive scorecards",
    ],
    entitlements: {
      quickbooksIntegration: true,
      dashboard: true,
      weeklyPulseBrief: true,
      pulseChat: true,
      pulseQuestionLimitMonthly: "unlimited",
      pulseIntelligenceLevel: "ai-cfo",
      historicalDataMonths: 12,
      forecastDays: 365,
      whatIfModeling: "ai-strategic-planning",
      savedScenarioLimit: "unlimited",
      scenarioVariables: "probability, capital, acquisition, long-range",
      scenarioForecastHorizon: "long-range",
      customKpis: true,
      scenarioPlanning: true,
      predictiveAlerts: true,
      boardPackages: true,
      powerpointGeneration: true,
      multiCompany: true,
      whiteLabel: true,
      workforcePlanning: true,
      dedicatedSupport: true,
    },
    whatIfScenario: {
      label: "AI Strategic Planning Engine",
      inputs: ["Monte Carlo simulations", "Probability-based forecasting", "Risk-adjusted projections", "Long-range planning", "Capital investment analysis", "Acquisition modeling"],
      outputs: ["Risk-adjusted forecast", "Probability range", "Capital ROI estimate", "Strategic recommendation"],
      limits: ["Unlimited scenarios", "Probability-based modeling", "Long-range planning"],
      examples: [
        "Should we open a second location?",
        "What is the probability we miss our EBITDA target?",
        "What is the likely ROI of a $500,000 equipment purchase?",
      ],
    },
  },
];

export const productTierRank = advisacorProductTiers.reduce((accumulator, tier, index) => {
  accumulator[tier.key] = index + 1;
  tier.legacyKeys.forEach((legacyKey) => {
    accumulator[legacyKey] = index + 1;
  });
  return accumulator;
}, {});

export function normalizeProductTierKey(key) {
  const tier = advisacorProductTiers.find((item) => item.key === key || item.legacyKeys.includes(key));
  return tier?.key || "pulse_starter";
}

export function getProductTier(key) {
  const normalizedKey = normalizeProductTierKey(key);
  return advisacorProductTiers.find((tier) => tier.key === normalizedKey) || advisacorProductTiers[0];
}

export function getPulseQuestionLimit(key) {
  return getProductTier(key).entitlements.pulseQuestionLimitMonthly;
}

export function getTierPriceId(tier) {
  return process.env[tier.stripeEnvVar] || process.env[tier.fallbackStripeEnvVar] || "";
}

export function getCheckoutTiers() {
  return advisacorProductTiers.map((tier) => ({
    ...tier,
    priceId: getTierPriceId(tier),
  }));
}
