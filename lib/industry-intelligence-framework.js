export const coreFinancialIntelligence = [
  "AP",
  "AR",
  "Payroll",
  "FTE",
  "Reserves",
  "Cash",
  "Financial Statements",
  "Executive Summaries",
  "Forecasting",
  "Budgeting",
];

export const supportedIndustryTypes = [
  "Manufacturing",
  "Construction",
  "Healthcare",
  "Wholesale Distribution",
  "Professional Services",
  "Retail",
  "SaaS / Technology",
  "Real Estate",
  "Franchise",
  "Nonprofit",
];

export const benchmarkingFramework = {
  status: "framework_only",
  purpose: "Compare company performance against industry averages once benchmark datasets are available.",
  comparisonShape: {
    metric: "Gross Margin",
    companyValue: "company",
    industryAverage: "industry_average",
    percentile: "future_percentile",
    dataSource: "future_benchmark_provider",
  },
  examples: [
    "Gross Margin: Company vs Industry Average",
    "Inventory Turns: Company vs Industry Average",
    "Revenue Per Employee: Company vs Industry Average",
  ],
};

const dashboardTone = {
  Manufacturing: "Manufacturing executive summary should focus on production efficiency, margin pressure, material costs, labor variance, PPV trends, and operational throughput.",
  Construction: "Construction executive summary should focus on jobs, contracts, WIP, retainage exposure, backlog, project margin, and cash flow timing.",
  Healthcare: "Healthcare executive summary should focus on patient economics, patient volume, reimbursement, staffing efficiency, payer concentration, and labor cost per patient day.",
  "Wholesale Distribution": "Wholesale executive summary should focus on inventory velocity, purchasing trends, margin compression, stock exposure, and working capital pressure.",
  "Professional Services": "Professional services executive summary should focus on utilization, labor leverage, staffing efficiency, project margin, and revenue per employee.",
  Retail: "Retail executive summary should focus on same-store sales, sell-through, inventory aging, gross margin, transaction value, and labor productivity.",
  "SaaS / Technology": "SaaS executive summary should focus on recurring revenue health, retention, churn, growth efficiency, runway, and gross margin.",
  "Real Estate": "Real estate executive summary should focus on occupancy, NOI, rent collections, lease exposure, property cash flow, debt coverage, and CapEx.",
  Franchise: "Franchise executive summary should focus on unit economics, location performance, royalty burden, labor ratio, and same-unit sales.",
  Nonprofit: "Nonprofit executive summary should focus on funding durability, grant utilization, restricted funds, program efficiency, cash runway, and mission capacity.",
};

export const industryIntelligenceModules = {
  Manufacturing: {
    dashboardName: "Manufacturing Operations Dashboard",
    focus: "Production Efficiency",
    metricGroups: [
      {
        title: "Production Efficiency",
        metrics: ["BOM Variance %", "Bill of Labor Variance %", "PPV", "Labor Efficiency Variance", "Material Usage Variance", "Yield %", "Scrap %", "Rework %"],
      },
      {
        title: "Inventory Intelligence",
        metrics: ["Raw Material Turns", "WIP Trends", "Finished Goods Turns", "Slow Moving Inventory", "Obsolete Inventory"],
      },
      {
        title: "Profitability",
        metrics: ["Job Profitability", "Product Line Profitability", "Production Margin Trends"],
      },
    ],
    operationalIntelligence: ["production efficiency", "inventory movement", "cost variance", "job/product profitability"],
    executiveCommentary: ["margin pressure", "material cost increases", "labor efficiency", "PPV trends", "production efficiency"],
    recommendations: ["Review adverse PPV movement", "Prioritize slow-moving inventory", "Investigate labor efficiency variances"],
    sampleMetrics: [
      { label: "Yield %", value: "94.8%", trend: "+1.1%" },
      { label: "Scrap %", value: "3.6%", trend: "-0.4%" },
      { label: "PPV", value: "4.2%", trend: "+0.8%" },
      { label: "Raw Material Turns", value: "7.1x", trend: "+0.3x" },
    ],
  },
  Construction: {
    dashboardName: "Construction Intelligence Dashboard",
    focus: "Contract Profitability",
    metricGroups: [
      {
        title: "Contract Profitability",
        metrics: ["WIP Schedule", "Percent Complete", "Retainage Receivable", "Retainage Payable", "Over Billings", "Under Billings", "Contract Margin %", "Job Profitability", "Cost to Complete", "Backlog"],
      },
      {
        title: "Contract Intelligence",
        metrics: ["Retainage by Contract", "Retainage Aging", "Contract Performance", "Budget vs Actual by Job", "Labor Utilization", "Equipment Utilization"],
      },
    ],
    operationalIntelligence: ["WIP review", "retainage exposure", "job margin", "backlog quality"],
    executiveCommentary: ["project profitability", "contract risk", "retainage exposure", "backlog trends", "cash flow timing"],
    recommendations: ["Review under-billed jobs", "Prioritize retainage collection", "Investigate cost-to-complete increases"],
    sampleMetrics: [
      { label: "Contract Margin", value: "18.7%", trend: "-1.2%" },
      { label: "Backlog", value: "$8.4M", trend: "+$620K" },
      { label: "Retainage AR", value: "$740K", trend: "+$85K" },
      { label: "Under Billings", value: "$310K", trend: "-$42K" },
    ],
  },
  Healthcare: {
    dashboardName: "Healthcare Operations Dashboard",
    focus: "Patient Economics",
    metricGroups: [
      {
        title: "Per Patient Day",
        metrics: ["Patient Days", "Revenue Per Patient Day", "Expense Per Patient Day", "Labor Cost Per Patient Day", "Contract Labor Per Patient Day"],
      },
      {
        title: "Operating Indicators",
        metrics: ["Average Daily Census", "Occupancy %", "Payer Mix", "AR Collection Trends", "Denial Trends"],
      },
    ],
    operationalIntelligence: ["patient volume", "reimbursement", "staffing efficiency", "payer concentration"],
    executiveCommentary: ["patient volume", "reimbursement trends", "staffing efficiency", "payer concentration", "labor costs"],
    recommendations: ["Watch labor cost per patient day", "Review payer mix shifts", "Monitor denial trend movement"],
    sampleMetrics: [
      { label: "Revenue / Patient Day", value: "$528", trend: "+5.8%" },
      { label: "Expense / Patient Day", value: "$405", trend: "+3.8%" },
      { label: "Labor / Patient Day", value: "$226", trend: "+5.2%" },
      { label: "Patient Days", value: "2,810", trend: "+3.3%" },
    ],
  },
  "Wholesale Distribution": {
    dashboardName: "Wholesale Intelligence Dashboard",
    focus: "Inventory Velocity",
    metricGroups: [
      {
        title: "Inventory Velocity",
        metrics: ["Inventory Turns", "Days Inventory Outstanding", "Inventory Aging", "Slow Moving Inventory", "Dead Inventory", "Stockout Risk", "Vendor Concentration", "Margin by Product Group", "Margin Compression", "Purchase Trends"],
      },
      {
        title: "Working Capital",
        metrics: ["AR", "AP", "Inventory", "Cash Conversion Cycle"],
      },
    ],
    operationalIntelligence: ["inventory velocity", "vendor concentration", "margin by product group", "cash conversion"],
    executiveCommentary: ["inventory velocity", "purchasing trends", "working capital pressure", "stock exposure"],
    recommendations: ["Reduce dead inventory exposure", "Review vendor concentration", "Monitor margin compression by product group"],
    sampleMetrics: [
      { label: "Inventory Turns", value: "5.8x", trend: "-0.2x" },
      { label: "DIO", value: "63 days", trend: "+4 days" },
      { label: "Slow Moving Inventory", value: "$480K", trend: "+$55K" },
      { label: "CCC", value: "51 days", trend: "+3 days" },
    ],
  },
  "Professional Services": {
    dashboardName: "Professional Services Dashboard",
    focus: "Utilization and Labor Leverage",
    metricGroups: [
      {
        title: "Team Economics",
        metrics: ["Revenue Per Employee", "Revenue Per FTE", "Utilization %", "Realization %", "Labor Leverage", "Staffing Efficiency", "Project Margin %", "Billable Utilization", "Consultant Productivity"],
      },
    ],
    operationalIntelligence: ["utilization", "realization", "labor leverage", "consultant productivity"],
    executiveCommentary: ["staffing leverage", "utilization", "productivity", "margin performance"],
    recommendations: ["Increase billable utilization", "Review realization leakage", "Rebalance staffing leverage"],
    sampleMetrics: [
      { label: "Revenue / FTE", value: "$55K", trend: "+4.4%" },
      { label: "Utilization", value: "78%", trend: "+2.0%" },
      { label: "Realization", value: "91%", trend: "-1.1%" },
      { label: "Project Margin", value: "38%", trend: "+1.8%" },
    ],
  },
  Retail: {
    dashboardName: "Retail Dashboard",
    focus: "Store and Inventory Performance",
    metricGroups: [
      {
        title: "Retail Operations",
        metrics: ["Same Store Sales", "Inventory Turns", "Gross Margin", "Sell Through Rate", "Average Transaction Value", "Stock Aging", "Sales Per Employee"],
      },
    ],
    operationalIntelligence: ["same-store sales", "sell-through", "store margin", "stock aging"],
    executiveCommentary: ["sales trend", "inventory productivity", "margin performance", "labor productivity"],
    recommendations: ["Review aged stock", "Improve sell-through on slow categories", "Monitor sales per employee"],
    sampleMetrics: [
      { label: "Same Store Sales", value: "+3.9%", trend: "+1.4%" },
      { label: "Inventory Turns", value: "6.2x", trend: "+0.4x" },
      { label: "Sell Through", value: "72%", trend: "+3.0%" },
      { label: "ATV", value: "$84", trend: "+$3" },
    ],
  },
  "SaaS / Technology": {
    dashboardName: "SaaS Intelligence Dashboard",
    focus: "Recurring Revenue Health",
    metricGroups: [
      {
        title: "SaaS Metrics",
        metrics: ["MRR", "ARR", "Churn", "Net Revenue Retention", "CAC", "LTV", "Gross Margin", "Burn Rate", "Runway"],
      },
    ],
    operationalIntelligence: ["recurring revenue", "retention", "growth efficiency", "runway"],
    executiveCommentary: ["recurring revenue health", "growth trends", "retention", "runway"],
    recommendations: ["Review churn movement", "Monitor CAC payback", "Protect runway under downside scenarios"],
    sampleMetrics: [
      { label: "MRR", value: "$420K", trend: "+6.1%" },
      { label: "NRR", value: "112%", trend: "+2.0%" },
      { label: "Churn", value: "2.4%", trend: "-0.3%" },
      { label: "Runway", value: "18 mo", trend: "+2 mo" },
    ],
  },
  "Real Estate": {
    dashboardName: "Real Estate Intelligence Dashboard",
    focus: "Property Cash Flow",
    metricGroups: [
      {
        title: "Property Performance",
        metrics: ["Occupancy %", "NOI", "CapEx", "Property Cash Flow", "Lease Expirations", "Rent Collections"],
      },
    ],
    operationalIntelligence: ["occupancy", "NOI", "rent collections", "lease rollover"],
    executiveCommentary: ["occupancy", "NOI quality", "property cash flow", "lease expiration risk"],
    recommendations: ["Review lease expirations", "Monitor capex reserve needs", "Prioritize rent collection exposure"],
    sampleMetrics: [
      { label: "Occupancy", value: "93%", trend: "+1.0%" },
      { label: "NOI", value: "$860K", trend: "+4.5%" },
      { label: "Collections", value: "97%", trend: "+0.8%" },
      { label: "CapEx", value: "$220K", trend: "+$35K" },
    ],
  },
  Franchise: {
    dashboardName: "Franchise Intelligence Dashboard",
    focus: "Unit Economics",
    metricGroups: [
      {
        title: "Franchise Performance",
        metrics: ["Unit Economics", "Royalty Burden", "Labor Ratio", "Same-Unit Sales", "Location Profitability", "Cash by Location"],
      },
    ],
    operationalIntelligence: ["unit performance", "royalty burden", "location margin", "labor ratio"],
    executiveCommentary: ["unit economics", "location performance", "royalty burden", "labor pressure"],
    recommendations: ["Review underperforming locations", "Monitor royalty burden", "Improve labor scheduling"],
    sampleMetrics: [
      { label: "Same-Unit Sales", value: "+4.2%", trend: "+1.5%" },
      { label: "Labor Ratio", value: "29%", trend: "+0.9%" },
      { label: "Royalty Burden", value: "6.5%", trend: "flat" },
      { label: "Unit Margin", value: "16.8%", trend: "+0.6%" },
    ],
  },
  Nonprofit: {
    dashboardName: "Nonprofit Intelligence Dashboard",
    focus: "Funding and Program Efficiency",
    metricGroups: [
      {
        title: "Nonprofit Operations",
        metrics: ["Program Expense Ratio", "Grant Utilization", "Cash Runway", "Restricted Funds", "Funding Concentration", "Program Margin"],
      },
    ],
    operationalIntelligence: ["grant utilization", "restricted funds", "program efficiency", "cash runway"],
    executiveCommentary: ["funding durability", "grant timing", "program spend", "cash constraints"],
    recommendations: ["Review restricted fund coverage", "Monitor grant utilization", "Protect program cash runway"],
    sampleMetrics: [
      { label: "Program Ratio", value: "81%", trend: "+2.0%" },
      { label: "Grant Utilization", value: "68%", trend: "+6.0%" },
      { label: "Runway", value: "9 mo", trend: "-1 mo" },
      { label: "Restricted Funds", value: "$1.2M", trend: "+$140K" },
    ],
  },
};

export function getIndustryIntelligenceModule(industryType = "Professional Services") {
  return industryIntelligenceModules[industryType] || industryIntelligenceModules["Professional Services"];
}

export function buildBenchmarkingPlaceholders(industryType = "Professional Services") {
  const module = getIndustryIntelligenceModule(industryType);
  return module.sampleMetrics.slice(0, 3).map((metric) => ({
    metric: metric.label,
    company: metric.value,
    industryAverage: "future benchmark",
    variance: "pending benchmark dataset",
  }));
}

export function buildIndustryExecutiveSummary(industryType = "Professional Services") {
  const module = getIndustryIntelligenceModule(industryType);
  return {
    industryType,
    dashboardName: module.dashboardName,
    focus: module.focus,
    summaryFocus: dashboardTone[industryType] || dashboardTone["Professional Services"],
    managementFocusAreas: module.executiveCommentary,
    recommendations: module.recommendations,
  };
}

export function buildIndustryAiContext(company = {}) {
  const industryType = company.industry_type || company.industryType || "Professional Services";
  const module = getIndustryIntelligenceModule(industryType);
  return {
    industryType,
    coreFinancialIntelligence,
    kpiRelevance: module.metricGroups.flatMap((group) => group.metrics),
    commentaryGuidance: module.executiveCommentary,
    recommendationThemes: module.recommendations,
    operationalIntelligence: module.operationalIntelligence,
    benchmarking: benchmarkingFramework,
  };
}

export function resolveIndustryIntelligenceForCompany(company = {}) {
  const industryType = company.industry_type || company.industryType || "Professional Services";
  const module = getIndustryIntelligenceModule(industryType);
  return {
    industryType,
    coreFinancialIntelligence,
    module,
    executiveSummary: buildIndustryExecutiveSummary(industryType),
    aiContext: buildIndustryAiContext(company),
    benchmarkingPlaceholders: buildBenchmarkingPlaceholders(industryType),
  };
}
