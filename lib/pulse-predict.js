export const pulsePredictCapabilities = {
  revenue: [
    "Predict next month revenue",
    "Predict next quarter revenue",
    "Predict year-end revenue",
    "Highlight revenue risks",
  ],
  expense: [
    "Predict future spending",
    "Detect abnormal spending trends",
    "Forecast cash requirements",
  ],
  cashFlow: [
    "30 day forecast",
    "60 day forecast",
    "90 day forecast",
    "Working capital projections",
  ],
  payroll: [
    "Predict payroll growth",
    "Forecast labor costs",
    "Headcount planning",
  ],
};

export const pulseAiCoreQuestions = [
  "I need to reduce expenses. Where should I start?",
  "What concerns you most about my business?",
  "What happens if I hire another employee?",
  "Why is cash projected to decline?",
  "What is my biggest financial risk?",
  "What is likely to happen next quarter?",
  "Why are margins shrinking?",
  "Which customers generate the most profit?",
  "What should I focus on this month?",
  "What expenses seem unusually high?",
  "What should I do to improve cash flow?",
];

export const pulseMemoryDataCategories = [
  "Profit & Loss",
  "Balance Sheet",
  "Cash Flow",
  "Payroll",
  "Employee Counts",
  "Customer Metrics",
  "Vendor Metrics",
  "Industry Specific Metrics",
  "Forecast Data",
  "Prior Pulse Conversations",
  "Generated Reports",
  "Generated Forecasts",
];

export const pulseHistoricalPatterns = [
  "Revenue always declines in January.",
  "Payroll costs have increased 18% over the last 12 months.",
  "Gross margin has declined for 4 consecutive quarters.",
  "Cash balances are lower than the same period last year.",
];

export const executiveInsightSnapshot = {
  risks: [
    "Payroll growing faster than revenue",
    "Cash forecast concern in 60 days",
    "Margin compression detected",
  ],
  opportunities: [
    "Pricing increase opportunity",
    "Expense reduction opportunity",
    "Improved collections opportunity",
  ],
  recommendedActions: [
    "Review overtime expenses",
    "Accelerate collections",
    "Adjust pricing strategy",
  ],
};

export const pulsePredictIndustryModels = {
  Healthcare: ["PPD forecasting", "Staffing recommendations", "Census modeling"],
  Construction: ["Job profitability forecasts", "Retainage forecasting", "WIP projections"],
  Manufacturing: ["Variance forecasting", "Inventory projections", "Production efficiency trends"],
};

export const pulsePredictQuestions = [
  "Pulse, why is cash projected to decline in July?",
  "Pulse, what happens if we hire two employees?",
  "Pulse, which expense categories concern you?",
  "Pulse, what will year-end profit likely be?",
  "Pulse, what are the biggest risks over the next 90 days?",
  "What if sales increase by 15%?",
  "What if I lose my largest customer?",
  "What if I hire another project manager?",
  "What if payroll rises 8%?",
];

export const whatIfScenarioExamples = [
  "What if sales increase by 15%?",
  "What if I lose my largest customer?",
  "What if I hire another project manager?",
  "What if payroll rises 8%?",
];

export function buildPulsePredictSnapshot({ industryType = "General", companyName = "this business" } = {}) {
  const industryModels = pulsePredictIndustryModels[industryType] || [
    "Revenue trend modeling",
    "Expense risk monitoring",
    "Cash flow timing analysis",
  ];

  return {
    moduleName: "Pulse Predict",
    companyName,
    industryType,
    forecasts: [
      {
        label: "Revenue Forecast",
        value: "$1.94M",
        trend: "+7.8%",
        explanation:
          "Pulse expects revenue to improve because current sales momentum is above the prior period, but the forecast depends on collections staying on schedule.",
      },
      {
        label: "EBITDA Forecast",
        value: "$284K",
        trend: "14.6%",
        explanation:
          "Projected EBITDA remains positive, with the biggest sensitivity coming from payroll, overhead, and gross margin discipline.",
      },
      {
        label: "Cash Forecast",
        value: "$392K",
        trend: "-8.4%",
        explanation:
          "Cash is projected to decline modestly because vendor payments and payroll are expected to move faster than incoming receipts.",
      },
      {
        label: "Payroll Forecast",
        value: "$238K",
        trend: "+5.2%",
        explanation:
          "Payroll is expected to rise with staffing levels and operating volume. Pulse recommends reviewing productivity before adding headcount.",
      },
      {
        label: "Risk Score",
        value: "31 / 100",
        trend: "Moderate",
        explanation:
          "The main 90-day risks are cash timing, working capital pressure, and revenue growth slowing against fixed costs.",
      },
      {
        label: "Opportunity Score",
        value: "74 / 100",
        trend: "Strong",
        explanation:
          "The best opportunity is margin expansion through pricing discipline, expense review, and faster collections.",
      },
    ],
    alerts: [
      "Cash shortage predicted",
      "Payroll costs trending higher",
      "Revenue slowdown predicted",
      "Margin decline predicted",
      "Working capital risk detected",
    ],
    predictiveAlerts: [
      {
        title: "Revenue slowdown predicted",
        explanation: "Pulse sees the current revenue pace softening compared with the recent run rate.",
        financialImpact: "Lower revenue could reduce EBITDA and weaken cash conversion over the next quarter.",
        recommendedAction: "Review sales pipeline, top customer activity, and pricing assumptions before the next forecast update.",
      },
      {
        title: "Cash shortage predicted",
        explanation: "Vendor payments and payroll are expected to move faster than customer receipts.",
        financialImpact: "Cash could tighten in 45 days if collections slip or spending remains unchanged.",
        recommendedAction: "Prioritize overdue AR, sequence vendor payments, and update the 13-week cash view.",
      },
      {
        title: "Margin decline predicted",
        explanation: "Labor and overhead are trending faster than gross profit.",
        financialImpact: "EBITDA margin could compress if pricing or productivity does not improve.",
        recommendedAction: "Review gross margin by product, service line, job, or department.",
      },
      {
        title: "Customer concentration risk detected",
        explanation: "A small number of customers appear to drive a meaningful share of revenue or collections.",
        financialImpact: "Losing one major customer could pressure revenue, cash runway, and staffing plans.",
        recommendedAction: "Model a customer-loss scenario and create a replacement revenue plan.",
      },
      {
        title: "Working capital risk detected",
        explanation: "Receivables, vendor timing, or inventory may be absorbing more cash than expected.",
        financialImpact: "Working capital pressure can reduce available cash even when the income statement looks healthy.",
        recommendedAction: "Review AR aging, inventory movement, and payment timing weekly.",
      },
    ],
    scores: [
      { label: "Risk Score", value: "31 / 100", explanation: "Moderate risk from cash timing and margin sensitivity." },
      { label: "Opportunity Score", value: "74 / 100", explanation: "Strong upside from pricing, collections, and productivity focus." },
      { label: "Growth Score", value: "68 / 100", explanation: "Growth is healthy, but quality depends on margin and working capital discipline." },
    ],
    industryModels,
    whatIfScenarios: [
      {
        label: "Sales Increase",
        prompt: "What if sales increase by 15%?",
        outcome: "Profit and cash improve if gross margin holds and working capital does not absorb the added growth.",
      },
      {
        label: "Largest Customer Loss",
        prompt: "What if I lose my largest customer?",
        outcome: "Revenue concentration risk increases and Pulse would model the cash runway needed to replace that volume.",
      },
      {
        label: "Additional Hire",
        prompt: "What if I hire another project manager?",
        outcome: "Payroll rises immediately; EBITDA improves only if the hire unlocks revenue, throughput, or delivery capacity.",
      },
      {
        label: "Payroll Increase",
        prompt: "What if payroll rises 8%?",
        outcome: "Labor leverage weakens unless revenue, pricing, or productivity offsets the added payroll cost.",
      },
    ],
  };
}

function extractPercent(question) {
  const match = question.match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? Number(match[1]) : null;
}

function extractDollarAmount(question) {
  const match = question.match(/\$?\s*(\d[\d,]*(?:\.\d+)?)(?:\s*k|\s*thousand)?/i);
  if (!match) return null;
  const baseAmount = Number(match[1].replace(/,/g, ""));
  const isThousands = /\d\s*(k|thousand)/i.test(match[0]);
  return isThousands ? baseAmount * 1000 : baseAmount;
}

export function isWhatIfQuestion(question = "") {
  const normalizedQuestion = question.toLowerCase();
  return (
    normalizedQuestion.includes("what if") ||
    normalizedQuestion.includes("what happens if") ||
    normalizedQuestion.includes("can i afford") ||
    normalizedQuestion.includes("can we afford") ||
    normalizedQuestion.includes("should i hire") ||
    normalizedQuestion.includes("should we hire") ||
    normalizedQuestion.includes("predict") ||
    normalizedQuestion.includes("forecast") ||
    normalizedQuestion.includes("scenario") ||
    normalizedQuestion.includes("should we open") ||
    normalizedQuestion.includes("probability")
  );
}

export function buildWhatIfScenario(question) {
  const normalizedQuestion = question.toLowerCase();
  const percent = extractPercent(question);
  const dollarAmount = extractDollarAmount(question);

  if (normalizedQuestion.includes("sales") || normalizedQuestion.includes("revenue") || normalizedQuestion.includes("prices")) {
    const assumption = percent ? `${percent}% revenue/pricing improvement` : "revenue growth";
    return {
      scenarioType: "Revenue Growth",
      assumption,
      profitImpact: percent ? `Estimated profit improves if gross margin holds; a ${percent}% lift could materially expand EBITDA.` : "Profit improves if margin holds.",
      cashImpact: "Cash improves after collections, but AR and working capital may temporarily absorb part of the growth.",
      forecastImpact: "Pulse would raise the revenue forecast and watch whether labor, inventory, or delivery costs scale at the same pace.",
    };
  }

  if (normalizedQuestion.includes("hire") || normalizedQuestion.includes("employee") || normalizedQuestion.includes("project manager") || normalizedQuestion.includes("technician")) {
    const assumption = dollarAmount ? `new hire cost of about $${dollarAmount.toLocaleString()}` : "one or more new hires";
    return {
      scenarioType: "Hiring Plan",
      assumption,
      profitImpact: "Profit declines at first unless the hire creates enough additional revenue, capacity, or productivity to offset payroll.",
      cashImpact: "Cash decreases immediately through payroll and benefits before the operational benefit is visible.",
      forecastImpact: "Pulse would compare revenue per employee, payroll as a percent of revenue, and 90-day cash runway before recommending the hire.",
    };
  }

  if (normalizedQuestion.includes("payroll") || normalizedQuestion.includes("labor")) {
    const assumption = percent ? `${percent}% payroll/labor increase` : "higher payroll costs";
    return {
      scenarioType: "Payroll Increase",
      assumption,
      profitImpact: "EBITDA and profit decline unless pricing, utilization, or productivity improves at the same time.",
      cashImpact: "Cash pressure rises because payroll is recurring and usually paid faster than customer collections.",
      forecastImpact: "Pulse would flag labor leverage, employee productivity, and margin risk across the forecast horizon.",
    };
  }

  if (normalizedQuestion.includes("customer") || normalizedQuestion.includes("lose")) {
    return {
      scenarioType: "Customer Concentration Risk",
      assumption: "loss of a major customer",
      profitImpact: "Profit falls quickly if fixed costs cannot be reduced or replacement revenue is delayed.",
      cashImpact: "Cash runway tightens because receipts decline before expenses can fully adjust.",
      forecastImpact: "Pulse would model revenue replacement timing, customer concentration, and expense actions needed to protect EBITDA.",
    };
  }

  if (normalizedQuestion.includes("rent") || normalizedQuestion.includes("expense") || normalizedQuestion.includes("spending")) {
    const assumption = dollarAmount ? `expense increase of about $${dollarAmount.toLocaleString()}` : "expense increase";
    return {
      scenarioType: "Expense Increase",
      assumption,
      profitImpact: "Profit declines dollar-for-dollar unless offset by revenue growth, price changes, or expense reductions elsewhere.",
      cashImpact: "Cash declines based on the timing and recurrence of the added expense.",
      forecastImpact: "Pulse would update the cash and EBITDA forecast and classify the expense as one-time or recurring.",
    };
  }

  if (normalizedQuestion.includes("location") || normalizedQuestion.includes("equipment") || normalizedQuestion.includes("acquisition") || normalizedQuestion.includes("roi")) {
    return {
      scenarioType: "Strategic Investment",
      assumption: "capital investment or expansion decision",
      profitImpact: "Profit may decline before improving because startup costs, depreciation, debt service, or integration costs arrive before full revenue benefit.",
      cashImpact: "Cash and borrowing capacity are the key constraints. Pulse would model upfront investment, payback period, and downside risk.",
      forecastImpact: "Pulse would use risk-adjusted scenarios and probability ranges for CFO-tier planning.",
    };
  }

  return {
    scenarioType: "General What-If Scenario",
    assumption: "business driver change",
    profitImpact: "Profit changes based on whether the driver affects revenue, margin, payroll, or overhead.",
    cashImpact: "Cash changes based on timing: receipts, payroll, vendor payments, and working capital movement.",
    forecastImpact: "Pulse would update the forecast and explain the main driver in plain English.",
  };
}

export function answerWhatIfQuestion(question, context = {}) {
  const scenario = buildWhatIfScenario(question, context);
  const tierName = context.tierName || "your current tier";
  const scenarioHorizon = context.scenarioHorizon || "the available forecast horizon";
  const scenarioLimit = context.scenarioLimit || "your tier limit";

  return `Pulse built a ${scenario.scenarioType} scenario for ${context.companyName || "this business"} using ${scenario.assumption}. Profit impact: ${scenario.profitImpact} Cash impact: ${scenario.cashImpact} Forecast impact: ${scenario.forecastImpact} Under ${tierName}, this scenario is modeled over ${scenarioHorizon} with ${scenarioLimit} saved scenario access.`;
}

export function answerPulsePredictQuestion(question, context = {}) {
  const normalizedQuestion = question.toLowerCase();
  const companyName = context.companyName || "this business";
  const dollarAmount = extractDollarAmount(question);

  if (isWhatIfQuestion(question)) {
    if (normalizedQuestion.includes("hire") || normalizedQuestion.includes("employee") || normalizedQuestion.includes("person") || normalizedQuestion.includes("salary")) {
      const salaryAmount = dollarAmount || 100000;
      const monthlyBaseCost = salaryAmount / 12;
      const monthlyLowCost = monthlyBaseCost * 1.15;
      const monthlyHighCost = monthlyBaseCost * 1.25;
      const annualLowCost = monthlyLowCost * 12;
      const annualHighCost = monthlyHighCost * 12;
      const threeMonthLowCost = monthlyLowCost * 3;
      const threeMonthHighCost = monthlyHighCost * 3;
      const netIncome = context.currentMonthNetIncome || 269900;
      const cashBalance = context.cashBalance || 428000;
      const formatRange = (low, high) => `$${Math.round(low).toLocaleString()}-$${Math.round(high).toLocaleString()}`;
      const canAbsorb = netIncome > monthlyHighCost;

      return [
        `Based on your current financials, adding a $${salaryAmount.toLocaleString()} employee would likely cost about ${formatRange(monthlyLowCost, monthlyHighCost)} per month after estimated payroll taxes and benefits.`,
        "",
        `Current monthly net income is about $${netIncome.toLocaleString()}, so ${companyName} ${canAbsorb ? "appears able to absorb the cost financially" : "may not be able to absorb the cost without offsetting revenue or expense reductions"}.`,
        "",
        "Estimated impact:",
        `- Monthly profit reduction: about ${formatRange(monthlyLowCost, monthlyHighCost)}`,
        `- Annual profit reduction: about ${formatRange(annualLowCost, annualHighCost)}`,
        `- Cash impact over 3 months: about ${formatRange(threeMonthLowCost, threeMonthHighCost)}`,
        `- Cash impact over 12 months: about ${formatRange(annualLowCost, annualHighCost)}`,
        "",
        "Recommendation:",
        `${canAbsorb ? "You can likely afford the hire financially" : "Do not approve the hire yet"}, but approve it only if the role supports revenue growth, capacity, collections, or operational efficiency.`,
        "",
        `Assumptions: $${salaryAmount.toLocaleString()} annual salary, 15%-25% payroll burden, current cash of about $${cashBalance.toLocaleString()}, and current financial statement profitability continuing near the current run rate.`,
      ].join("\n");
    }

    return answerWhatIfQuestion(question, context);
  }

  if (normalizedQuestion.includes("cash") || normalizedQuestion.includes("decline")) {
    return `Pulse Predict sees cash pressure for ${companyName} because payroll, vendor payments, and collections timing are moving faster than receipts. The next step is to review AR aging, upcoming payroll, and the largest vendor payments over the next 45 days.`;
  }

  if (normalizedQuestion.includes("hire") || normalizedQuestion.includes("employee") || normalizedQuestion.includes("headcount")) {
    return `Pulse Predict would model the hire against payroll growth, revenue per employee, cash runway, and margin. If two employees are added without matching revenue or productivity gains, cash and EBITDA forecasts would weaken over the next 60-90 days.`;
  }

  if (normalizedQuestion.includes("expense") || normalizedQuestion.includes("spending")) {
    return `Pulse Predict is most concerned about expense categories growing faster than revenue. Payroll, overhead, vendor spend, and industry-specific operating costs should be reviewed first.`;
  }

  if (normalizedQuestion.includes("year-end") || normalizedQuestion.includes("profit")) {
    return `Pulse Predict would estimate year-end profit by combining current margin, revenue pace, payroll trend, and known expense seasonality. Based on the current dashboard pattern, profit remains positive but sensitive to labor and overhead growth.`;
  }

  if (normalizedQuestion.includes("risk") || normalizedQuestion.includes("90 days")) {
    return `Pulse Predict's biggest 90-day risks are cash timing, working capital pressure, payroll growth, and margin deterioration. The highest-leverage action is to tighten collections and compare spending growth against revenue growth weekly.`;
  }

  return `Pulse Predict explains every forecast in plain English by connecting the prediction to revenue pace, expense trend, payroll movement, working capital, and industry operating drivers.`;
}

export function answerPulseCfoQuestion(question, context = {}) {
  const normalizedQuestion = question.toLowerCase();
  const companyName = context.companyName || "this business";

  if (isWhatIfQuestion(question)) {
    return answerWhatIfQuestion(question, context);
  }

  if (normalizedQuestion.includes("reduce expenses") || normalizedQuestion.includes("expenses seem") || normalizedQuestion.includes("unusually high")) {
    return `Pulse CFO Mode reviewed the 12-month pattern for ${companyName}. Top opportunities: 1. Overtime costs increased 22% over the past six months, with estimated annual savings of $42,000 if scheduling is tightened. 2. Software subscriptions increased 18%, with estimated annual savings of $8,500 from consolidation. 3. Marketing spend increased faster than revenue growth, with estimated annual savings of $15,000 if low-return campaigns are paused. Recommended action: review overtime scheduling before reducing staffing.`;
  }

  if (normalizedQuestion.includes("cash") || normalizedQuestion.includes("cash flow") || normalizedQuestion.includes("cash decreasing")) {
    return `Pulse CFO Mode sees three primary cash drivers for ${companyName}: 1. Accounts Receivable increased by $72,000. 2. Payroll costs increased by 11%. 3. Inventory purchases increased by 18%. Recommendation: focus on collections and inventory management before reducing core operating expenses.`;
  }

  if (normalizedQuestion.includes("margin") || normalizedQuestion.includes("margins shrinking")) {
    return `Pulse CFO Mode sees margin pressure because payroll and overhead are growing faster than revenue. Payroll increased 10% while revenue increased only 3%, creating margin pressure. If this trend continues, annual profit may decline by approximately $84,000. Consider reviewing overtime, staffing levels, pricing, and scheduling efficiency.`;
  }

  if (normalizedQuestion.includes("risk") || normalizedQuestion.includes("concerns")) {
    return `Pulse CFO Mode's top risks are payroll growing faster than revenue, a cash forecast concern within 60 days, and margin compression. Recommended action: review overtime expenses, accelerate collections, and compare pricing against cost movement before the next close.`;
  }

  if (normalizedQuestion.includes("focus")) {
    return `Pulse CFO Mode recommends focusing this month on three items: 1. Accelerate collections on the largest overdue balances. 2. Review overtime and staffing efficiency. 3. Validate whether pricing still protects margin. These actions address cash, profitability, and near-term forecast risk together.`;
  }

  if (normalizedQuestion.includes("customer") && normalizedQuestion.includes("profit")) {
    return `Pulse CFO Mode would rank customers by gross profit contribution, collection speed, and service cost. The most profitable customers are not always the highest-revenue customers; prioritize customers with strong margin, low support burden, and predictable collections.`;
  }

  return answerPulsePredictQuestion(question, context);
}
