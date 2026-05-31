import { getIndustryIntelligenceModule } from "./industry-intelligence-framework";

export const companyOnboardingStatuses = [
  "account_type_selected",
  "not_started",
  "practice_created",
  "company_profile_complete",
  "industry_type_selected",
  "persona_selected",
  "package_selected",
  "data_source_connected",
  "delivery_configured",
  "users_invited",
  "complete",
];

export const accountTypeOptions = [
  {
    id: "my-own-company",
    label: "My Company",
    description: "I own or work inside the company and want financial intelligence for this business.",
  },
  {
    id: "bookkeeper-advisor",
    label: "Bookkeeper / Advisor Managing Clients",
    description: "I prepare books or reports for one or more client companies.",
  },
  {
    id: "fractional-cfo-firm",
    label: "Fractional CFO / Advisory Firm",
    description: "I provide CFO/advisory services and manage executive reporting for multiple clients.",
  },
];

export const practiceStructureOptions = ["Solo", "Firm"];
export const clientCountOptions = ["1", "2-5", "6-25", "26-100", "100+"];
export const advisoryServiceOptions = ["Executive reporting", "Forecasting", "Board packages", "Weekly briefs", "Monthly packages", "Virtual CFO"];

export const industryTypeOptions = [
  "Manufacturing",
  "Construction",
  "Healthcare",
  "Professional Services",
  "Wholesale Distribution",
  "Retail",
  "SaaS / Technology",
  "Nonprofit",
  "Real Estate",
  "Franchise",
  "Other",
];

export const industryIntelligenceProfiles = {
  Manufacturing: {
    kpiRecommendations: ["inventory turns", "gross margin", "labor efficiency", "purchase price variance"],
    dashboardEmphasis: ["inventory", "PPV", "BOM", "labor variance"],
    commentaryFocus: ["production cost movement", "inventory risk", "labor utilization", "margin quality"],
    futureModules: ["manufacturing intelligence", "BOM variance", "labor variance", "inventory aging"],
  },
  Construction: {
    kpiRecommendations: ["WIP", "backlog", "job profitability", "retainage"],
    dashboardEmphasis: ["WIP", "retainage", "job profitability", "cash timing"],
    commentaryFocus: ["project margin", "billing timing", "cash exposure", "job cost trends"],
    futureModules: ["WIP intelligence", "retainage review", "job profitability benchmarking"],
  },
  Healthcare: {
    kpiRecommendations: ["revenue per patient day", "expense per patient day", "labor cost per patient day", "AR days"],
    dashboardEmphasis: ["per patient day trends", "reimbursement", "collections", "AR", "staffing"],
    commentaryFocus: ["patient-day economics", "collection velocity", "payer pressure", "staffing cost", "cash conversion"],
    futureModules: ["per patient day intelligence", "payer mix intelligence", "reimbursement benchmarking", "healthcare AR review"],
  },
  "Professional Services": {
    kpiRecommendations: ["utilization", "revenue per employee", "staffing leverage", "AR days"],
    dashboardEmphasis: ["utilization", "staffing", "revenue per employee", "collections"],
    commentaryFocus: ["team leverage", "billing efficiency", "client concentration", "margin per employee"],
    futureModules: ["utilization intelligence", "staffing leverage", "revenue per employee benchmarking"],
  },
  "Wholesale Distribution": {
    kpiRecommendations: ["inventory turns", "gross margin", "fill rate", "working capital"],
    dashboardEmphasis: ["inventory", "margin", "AR/AP timing", "warehouse working capital"],
    commentaryFocus: ["stock movement", "margin pressure", "customer/vendor timing", "cash tied in inventory"],
    futureModules: ["distribution inventory intelligence", "margin by channel", "working capital benchmarking"],
  },
  Retail: {
    kpiRecommendations: ["same-store sales", "gross margin", "inventory turns", "labor ratio"],
    dashboardEmphasis: ["sales trend", "inventory", "labor", "store profitability"],
    commentaryFocus: ["sales mix", "inventory movement", "labor pressure", "cash seasonality"],
    futureModules: ["retail inventory intelligence", "store benchmarking", "seasonality review"],
  },
  "SaaS / Technology": {
    kpiRecommendations: ["MRR", "ARR", "churn", "CAC payback", "gross margin"],
    dashboardEmphasis: ["recurring revenue", "cash runway", "gross margin", "customer retention"],
    commentaryFocus: ["revenue quality", "burn rate", "retention", "growth efficiency"],
    futureModules: ["SaaS metrics", "cohort intelligence", "runway forecasting"],
  },
  Nonprofit: {
    kpiRecommendations: ["program expense ratio", "grant utilization", "cash runway", "restricted funds"],
    dashboardEmphasis: ["restricted cash", "grant spend", "program efficiency", "runway"],
    commentaryFocus: ["funding durability", "grant timing", "program spend", "cash constraints"],
    futureModules: ["grant intelligence", "restricted fund review", "nonprofit benchmarking"],
  },
  "Real Estate": {
    kpiRecommendations: ["NOI", "occupancy", "debt service coverage", "capex reserve"],
    dashboardEmphasis: ["NOI", "occupancy", "debt", "capex"],
    commentaryFocus: ["property cash flow", "occupancy pressure", "debt coverage", "capital needs"],
    futureModules: ["property intelligence", "NOI benchmarking", "capex reserve review"],
  },
  Franchise: {
    kpiRecommendations: ["unit economics", "royalty burden", "labor ratio", "same-unit sales"],
    dashboardEmphasis: ["unit performance", "labor", "royalties", "cash by location"],
    commentaryFocus: ["location performance", "royalty impact", "labor pressure", "sales consistency"],
    futureModules: ["franchise unit benchmarking", "location intelligence", "royalty analysis"],
  },
  Other: {
    kpiRecommendations: ["cash", "profit", "AR/AP", "payroll", "working capital"],
    dashboardEmphasis: ["cash", "profitability", "collections", "staffing"],
    commentaryFocus: ["financial trend", "cash health", "profit movement", "operating risk"],
    futureModules: ["general industry intelligence", "benchmarking"],
  },
};

export const companyPersonaOptions = [
  { id: "business-owner", label: "Business Owner", output: "Plain-English owner-facing outputs." },
  { id: "bookkeeper", label: "Bookkeeper", output: "Task-oriented operational outputs." },
  { id: "controller", label: "Controller", output: "Close-quality and review-focused outputs." },
  { id: "fractional-cfo", label: "Fractional CFO", output: "Executive, strategic, board-ready outputs." },
];

export const companyPackageOptions = [
  {
    id: "essential",
    label: "Essential",
    scope: ["AP", "AR", "reserves", "payroll", "FTE", "MoM review"],
  },
  {
    id: "professional",
    label: "Professional",
    scope: ["Essential", "inventory", "fixed assets", "debt", "liquidity", "working capital", "QoQ review"],
  },
  {
    id: "virtual-cfo",
    label: "Virtual CFO",
    scope: [
      "Professional",
      "forecasting",
      "budgeting",
      "treasury",
      "oversight",
      "manufacturing",
      "deferred revenue",
      "unbilled AR",
      "executive recommendations",
    ],
  },
];

export const companyRoleDefinitions = [
  {
    role: "company_admin",
    label: "Company Admin",
    permissions: [
      "manage_company_settings",
      "manage_users",
      "manage_package",
      "manage_integrations",
      "manage_delivery_schedules",
      "view_all_company_data",
    ],
  },
  {
    role: "owner_executive",
    label: "Owner/Executive",
    permissions: ["view_executive_summaries", "receive_weekly_briefs", "ask_owner_questions", "view_reports"],
    denied: ["je_testing", "ap_cutoff_mechanics", "internal_audit_logs", "raw_validation_errors", "preparer_notes"],
  },
  {
    role: "controller",
    label: "Controller",
    permissions: ["review_close_quality", "review_oversight_items", "review_schedules", "approve_commentary", "generate_packages"],
  },
  {
    role: "bookkeeper",
    label: "Bookkeeper",
    permissions: ["upload_files", "review_ap_ar", "review_payroll_fte", "review_reserves", "prepare_package_inputs"],
  },
  {
    role: "advisor_fractional_cfo",
    label: "Advisor/Fractional CFO",
    permissions: ["executive_commentary", "forecasting", "budgeting", "board_packages", "client_advisory_workflows"],
  },
  {
    role: "viewer",
    label: "Viewer",
    permissions: ["read_approved_reports"],
  },
];

export const connectedAccountingSystemOptions = [
  "QuickBooks Online",
  "QuickBooks Desktop",
  "QuickBooks Enterprise",
  "Xero",
  "NetSuite",
  "Sage",
  "Microsoft Dynamics",
];
export const accountingSystemOptions = [...connectedAccountingSystemOptions, "Manual Financial Upload"];
export const manualFinancialUploadReports = [
  { id: "balance_sheet", label: "Balance Sheet", required: true },
  { id: "income_statement", label: "Income Statement", required: true },
  { id: "ar_aging", label: "AR Aging", required: false },
  { id: "ap_aging", label: "AP Aging", required: false },
  { id: "inventory_report", label: "Inventory Report", required: false },
];
export const accountingReportCatalog = [
  { id: "balance_sheet", label: "Balance Sheet", essential: true },
  { id: "income_statement", label: "Income Statement", essential: true },
  { id: "ar_aging", label: "AR Aging", essential: true },
  { id: "ap_aging", label: "AP Aging", essential: true },
  { id: "inventory", label: "Inventory" },
  { id: "payroll", label: "Payroll" },
  { id: "budget", label: "Budget" },
  { id: "forecast", label: "Forecast" },
  { id: "fixed_assets", label: "Fixed Assets" },
  { id: "customer_data", label: "Customer data" },
  { id: "vendor_data", label: "Vendor data" },
  { id: "job_costing", label: "Job costing" },
  { id: "manufacturing_reports", label: "Manufacturing reports" },
  { id: "industry_specific_reports", label: "Industry-specific reports" },
];

export const accountingSystemDiscoveryProfiles = {
  "QuickBooks Online": ["balance_sheet", "income_statement", "ar_aging", "ap_aging", "inventory", "payroll", "customer_data", "vendor_data"],
  "QuickBooks Desktop": ["balance_sheet", "income_statement", "ar_aging", "ap_aging", "inventory", "payroll", "fixed_assets", "customer_data", "vendor_data"],
  "QuickBooks Enterprise": ["balance_sheet", "income_statement", "ar_aging", "ap_aging", "inventory", "payroll", "budget", "forecast", "fixed_assets", "customer_data", "vendor_data", "job_costing", "manufacturing_reports"],
  Xero: ["balance_sheet", "income_statement", "ar_aging", "ap_aging", "payroll", "customer_data", "vendor_data"],
  NetSuite: ["balance_sheet", "income_statement", "ar_aging", "ap_aging", "inventory", "payroll", "budget", "forecast", "fixed_assets", "customer_data", "vendor_data", "job_costing", "industry_specific_reports"],
  Sage: ["balance_sheet", "income_statement", "ar_aging", "ap_aging", "inventory", "fixed_assets", "customer_data", "vendor_data", "job_costing"],
  "Microsoft Dynamics": ["balance_sheet", "income_statement", "ar_aging", "ap_aging", "inventory", "payroll", "budget", "forecast", "fixed_assets", "customer_data", "vendor_data", "job_costing", "industry_specific_reports"],
};

export function buildReportDiscovery(systemName = "QuickBooks Online") {
  const foundIds = new Set(accountingSystemDiscoveryProfiles[systemName] || accountingSystemDiscoveryProfiles["QuickBooks Online"]);
  return {
    found: accountingReportCatalog.filter((report) => foundIds.has(report.id)),
    missing: accountingReportCatalog.filter((report) => !foundIds.has(report.id)),
  };
}

export function recommendPackageFromReports(reportIds = []) {
  const reports = new Set(reportIds);
  if (reports.has("budget") || reports.has("forecast") || reports.has("manufacturing_reports") || reports.has("industry_specific_reports")) return "virtual-cfo";
  if (reports.has("inventory") || reports.has("fixed_assets") || reports.has("job_costing")) return "professional";
  return "essential";
}
export const reportingCadenceOptions = ["Weekly", "Monthly", "Quarterly", "Board cadence"];
export const revenueRangeOptions = ["Under $1M", "$1M-$5M", "$5M-$25M", "$25M-$100M", "$100M+"];

export function getCompanyRole(role) {
  return companyRoleDefinitions.find((definition) => definition.role === role) || companyRoleDefinitions[5];
}

export function normalizeCompanyAccount(row = {}) {
  return {
    id: row.id,
    name: row.name || row.company_name || "Unnamed Company",
    industry: row.industry || "",
    industryType: row.industry_type || row.industryType || "Other",
    revenueRange: row.revenue_range || row.revenueRange || "",
    employeeCount: Number(row.employee_count ?? row.employeeCount ?? 0),
    accountingSystem: row.accounting_system || row.accountingSystem || "",
    reportingCadence: row.reporting_cadence || row.reportingCadence || "",
    primaryPersona: row.primary_persona || row.primaryPersona || "business-owner",
    packageLevel: row.package_level || row.packageLevel || "essential",
    billingStatus: row.billing_status || row.billingStatus || "trial",
    onboardingStatus: row.onboarding_status || row.onboardingStatus || "not_started",
    accountType: row.account_type || row.accountType || "my-own-company",
    practiceId: row.practice_id || row.practiceId || null,
    setupStatus: row.setup_status || row.setupStatus || "Configured",
    isDemo: Boolean(row.is_demo ?? row.isDemo ?? false),
  };
}

export function getIndustryIntelligenceProfile(industryType = "Other") {
  const module = getIndustryIntelligenceModule(industryType);
  const legacyProfile = industryIntelligenceProfiles[industryType] || industryIntelligenceProfiles.Other;
  return {
    ...legacyProfile,
    kpiRecommendations: module.metricGroups.flatMap((group) => group.metrics),
    dashboardEmphasis: module.operationalIntelligence,
    commentaryFocus: module.executiveCommentary,
    futureModules: [module.dashboardName, ...module.operationalIntelligence],
    phase12Module: {
      dashboardName: module.dashboardName,
      focus: module.focus,
      metricGroups: module.metricGroups,
      recommendations: module.recommendations,
    },
  };
}

export function getNextOnboardingStatus(stepIndex) {
  return companyOnboardingStatuses[Math.min(stepIndex + 1, companyOnboardingStatuses.length - 1)];
}
