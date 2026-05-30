export const SUPER_ADMIN_ROLE = "super_admin";
export const INITIAL_SUPER_ADMIN_EMAIL = "mwiseman@advisacor.com";

export const superAdminScreens = [
  "System Health",
  "Company Testing Center",
  "Onboarding Flow",
  "Generate PDF Package",
  "Generate PowerPoint",
  "Weekly Executive Brief Tester",
  "Ask Advisacor Tester",
  "User Management",
  "Support Center",
  "Job Queue",
  "Audit Logs",
];

export const superAdminPersonaModes = [
  "Bookkeeper",
  "Controller",
  "Fractional CFO",
  "Business Owner",
];

export const superAdminPackageLevels = [
  "Essential",
  "Professional",
  "Virtual CFO",
];

export const superAdminCapabilities = [
  "View all test/demo companies",
  "Switch persona mode",
  "Switch package level",
  "Impersonate test users only",
  "Access all feature workflows",
  "Generate test PDFs",
  "Generate test PowerPoints",
  "Trigger weekly executive brief test emails",
  "Test Ask Advisacor",
  "View job statuses",
  "Manage support tickets and feature requests",
  "View audit logs",
  "View failed background jobs",
  "Reset demo data",
];

export const superAdminActionTypes = [
  "impersonation_started",
  "persona_switched",
  "package_switched",
  "test_pdf_generated",
  "test_powerpoint_generated",
  "test_weekly_brief_email_triggered",
  "ask_advisacor_tested",
  "user_management_opened",
  "demo_data_reset",
  "onboarding_started",
  "test_user_session_started",
  "company_users_viewed",
];

export const superAdminDemoCompanyStatuses = ["demo", "test"];

export const superAdminDemoJobs = [
  {
    id: "demo-job-pdf-package",
    job_type: "PDF generation",
    status: "scheduled",
    company_id: "demo-manufacturing",
    created_at: "2026-05-29T09:00:00.000Z",
    updated_at: "2026-05-29T09:00:00.000Z",
    error_message: null,
  },
  {
    id: "demo-job-powerpoint-package",
    job_type: "PowerPoint generation",
    status: "queued",
    company_id: "demo-construction",
    created_at: "2026-05-29T09:05:00.000Z",
    updated_at: "2026-05-29T09:05:00.000Z",
    error_message: null,
  },
  {
    id: "demo-job-weekly-brief",
    job_type: "Weekly Executive Brief",
    status: "processing",
    company_id: "demo-healthcare",
    created_at: "2026-05-29T09:10:00.000Z",
    updated_at: "2026-05-29T09:12:00.000Z",
    error_message: null,
  },
  {
    id: "demo-job-monthly-package",
    job_type: "Monthly Executive Package",
    status: "awaiting approval",
    company_id: "demo-professional-services",
    created_at: "2026-05-29T09:15:00.000Z",
    updated_at: "2026-05-29T09:18:00.000Z",
    error_message: null,
  },
  {
    id: "demo-job-ai-commentary",
    job_type: "AI commentary generation",
    status: "sent",
    company_id: "demo-manufacturing",
    created_at: "2026-05-29T09:20:00.000Z",
    updated_at: "2026-05-29T09:23:00.000Z",
    error_message: null,
  },
  {
    id: "demo-job-forecast",
    job_type: "Forecast generation",
    status: "scheduled",
    company_id: "demo-construction",
    created_at: "2026-05-29T09:25:00.000Z",
    updated_at: "2026-05-29T09:25:00.000Z",
    error_message: null,
  },
  {
    id: "demo-job-oversight-review",
    job_type: "Oversight review",
    status: "failed",
    company_id: "demo-professional-services",
    created_at: "2026-05-29T09:30:00.000Z",
    updated_at: "2026-05-29T09:33:00.000Z",
    error_message: "Demo failure for failed-job visibility testing.",
  },
];

export const superAdminDemoCompanies = [
  {
    id: "demo-manufacturing",
    name: "Manufacturing Demo Company",
    status: "demo",
    setupStatus: "Configured",
    packageLevel: "Virtual CFO",
    personaMode: "Business Owner",
    primaryPersona: "business-owner",
    companyAdmin: "owner.admin+manufacturing@advisacor.com",
    users: [
      { email: "owner.admin+manufacturing@advisacor.com", role: "company_admin", status: "active" },
      { email: "owner.exec+manufacturing@advisacor.com", role: "owner_executive", status: "active" },
    ],
    deliverySettings: {
      weeklyBriefEnabled: true,
      monthlyPackageEnabled: true,
      quarterlyReviewEnabled: true,
      recipientEmails: ["owner.exec+manufacturing@advisacor.com"],
      approvalRequired: true,
      autoSendEnabled: false,
    },
    industry: "Precision manufacturing",
    industryType: "Manufacturing",
    lastPackageGenerated: "May 2026 board package",
    lastLogin: "Demo user",
    jobStatus: "Scheduled",
    failedJobs: 0,
    demoData: {
      balanceSheet: { cash: 1630000, ar: 740000, inventory: 1210000, fixedAssets: 2840000, ap: 520000, debt: 1460000, equity: 3220000 },
      incomeStatement: { revenue: 1820000, grossProfit: 642000, payroll: 418000, operatingIncome: 214000, netIncome: 168000 },
      arAging: { current: 512000, days30: 126000, days60: 54000, days90Plus: 48000 },
      apAging: { current: 318000, days30: 132000, days60: 52000, days90Plus: 18000 },
      payrollFte: { payroll: 418000, fte: 42, overtime: 36000, revenuePerFte: 43333 },
      cash: { beginning: 1280000, collections: 490000, payments: 410000, ending: 1630000, runwayWeeks: 21 },
      inventory: { rawMaterials: 410000, wip: 330000, finishedGoods: 470000, slowMoving: 86000 },
      fixedAssets: { gross: 4120000, accumulatedDepreciation: 1280000, netBookValue: 2840000, capexYtd: 390000 },
      budget: { revenueBudget: 1760000, expenseBudget: 1460000, ebitdaBudget: 300000 },
      forecast: { nextMonthRevenue: 1880000, nextMonthCash: 1710000, downsideCash: 1480000, confidence: "Moderate" },
    },
  },
  {
    id: "demo-construction",
    name: "Construction Demo Company",
    status: "demo",
    setupStatus: "Configured",
    packageLevel: "Professional",
    personaMode: "Controller",
    primaryPersona: "controller",
    companyAdmin: "controller.admin+construction@advisacor.com",
    users: [
      { email: "controller.admin+construction@advisacor.com", role: "company_admin", status: "active" },
      { email: "controller+construction@advisacor.com", role: "controller", status: "active" },
    ],
    deliverySettings: {
      weeklyBriefEnabled: true,
      monthlyPackageEnabled: true,
      quarterlyReviewEnabled: false,
      recipientEmails: ["controller.admin+construction@advisacor.com"],
      approvalRequired: true,
      autoSendEnabled: false,
    },
    industry: "Commercial construction",
    industryType: "Construction",
    lastPackageGenerated: "May 2026 controller package",
    lastLogin: "Demo user",
    jobStatus: "Scheduled",
    failedJobs: 0,
    demoData: {
      balanceSheet: { cash: 840000, ar: 1180000, inventory: 0, fixedAssets: 920000, ap: 760000, debt: 610000, equity: 1940000 },
      incomeStatement: { revenue: 2460000, grossProfit: 516000, payroll: 690000, operatingIncome: 142000, netIncome: 96000 },
      arAging: { current: 780000, days30: 220000, days60: 118000, days90Plus: 62000 },
      apAging: { current: 430000, days30: 210000, days60: 91000, days90Plus: 29000 },
      payrollFte: { payroll: 690000, fte: 58, overtime: 74000, revenuePerFte: 42414 },
      cash: { beginning: 910000, collections: 720000, payments: 790000, ending: 840000, runwayWeeks: 11 },
      inventory: { note: "Not applicable; construction demo uses WIP/job cost exposure instead.", wip: 1320000 },
      fixedAssets: { gross: 1440000, accumulatedDepreciation: 520000, netBookValue: 920000, capexYtd: 118000 },
      budget: { revenueBudget: 2520000, expenseBudget: 2320000, ebitdaBudget: 200000 },
      forecast: { nextMonthRevenue: 2380000, nextMonthCash: 790000, downsideCash: 650000, confidence: "Moderate" },
    },
  },
  {
    id: "demo-healthcare",
    name: "Healthcare Demo Company",
    status: "demo",
    setupStatus: "Configured",
    packageLevel: "Essential",
    personaMode: "Bookkeeper",
    primaryPersona: "bookkeeper",
    companyAdmin: "bookkeeper.admin+healthcare@advisacor.com",
    users: [
      { email: "bookkeeper.admin+healthcare@advisacor.com", role: "company_admin", status: "active" },
      { email: "bookkeeper+healthcare@advisacor.com", role: "bookkeeper", status: "active" },
    ],
    deliverySettings: {
      weeklyBriefEnabled: false,
      monthlyPackageEnabled: true,
      quarterlyReviewEnabled: false,
      recipientEmails: ["bookkeeper.admin+healthcare@advisacor.com"],
      approvalRequired: true,
      autoSendEnabled: false,
    },
    industry: "Healthcare services",
    industryType: "Healthcare",
    lastPackageGenerated: "May 2026 essential package",
    lastLogin: "Demo user",
    jobStatus: "Scheduled",
    failedJobs: 0,
    demoData: {
      balanceSheet: { cash: 520000, ar: 430000, inventory: 68000, fixedAssets: 410000, ap: 185000, debt: 240000, equity: 1003000 },
      incomeStatement: { revenue: 940000, grossProfit: 564000, payroll: 402000, operatingIncome: 88000, netIncome: 62000 },
      arAging: { current: 298000, days30: 74000, days60: 38000, days90Plus: 20000 },
      apAging: { current: 112000, days30: 48000, days60: 19000, days90Plus: 6000 },
      payrollFte: { payroll: 402000, fte: 31, overtime: 22000, revenuePerFte: 30323 },
      cash: { beginning: 475000, collections: 260000, payments: 215000, ending: 520000, runwayWeeks: 13 },
      inventory: { medicalSupplies: 68000, slowMoving: 7000 },
      fixedAssets: { gross: 690000, accumulatedDepreciation: 280000, netBookValue: 410000, capexYtd: 42000 },
      budget: { revenueBudget: 910000, expenseBudget: 835000, ebitdaBudget: 75000 },
      forecast: { nextMonthRevenue: 965000, nextMonthCash: 548000, downsideCash: 472000, confidence: "High" },
    },
  },
  {
    id: "demo-professional-services",
    name: "Professional Services Demo Company",
    status: "demo",
    setupStatus: "Configured",
    packageLevel: "Virtual CFO",
    personaMode: "Fractional CFO",
    primaryPersona: "fractional-cfo",
    companyAdmin: "advisor.admin+professionalservices@advisacor.com",
    users: [
      { email: "advisor.admin+professionalservices@advisacor.com", role: "company_admin", status: "active" },
      { email: "advisor+professionalservices@advisacor.com", role: "advisor_fractional_cfo", status: "active" },
    ],
    deliverySettings: {
      weeklyBriefEnabled: true,
      monthlyPackageEnabled: true,
      quarterlyReviewEnabled: true,
      recipientEmails: ["advisor.admin+professionalservices@advisacor.com"],
      approvalRequired: true,
      autoSendEnabled: false,
    },
    industry: "Professional services",
    industryType: "Professional Services",
    lastPackageGenerated: "May 2026 executive package",
    lastLogin: "Demo user",
    jobStatus: "Scheduled",
    failedJobs: 0,
    demoData: {
      balanceSheet: { cash: 980000, ar: 690000, inventory: 0, fixedAssets: 180000, ap: 210000, debt: 120000, equity: 1520000 },
      incomeStatement: { revenue: 1320000, grossProfit: 910000, payroll: 590000, operatingIncome: 238000, netIncome: 186000 },
      arAging: { current: 492000, days30: 126000, days60: 52000, days90Plus: 20000 },
      apAging: { current: 145000, days30: 47000, days60: 14000, days90Plus: 4000 },
      payrollFte: { payroll: 590000, fte: 24, overtime: 0, revenuePerFte: 55000 },
      cash: { beginning: 910000, collections: 380000, payments: 310000, ending: 980000, runwayWeeks: 18 },
      inventory: { note: "Not applicable; services demo has no inventory exposure." },
      fixedAssets: { gross: 310000, accumulatedDepreciation: 130000, netBookValue: 180000, capexYtd: 28000 },
      budget: { revenueBudget: 1260000, expenseBudget: 1040000, ebitdaBudget: 220000 },
      forecast: { nextMonthRevenue: 1375000, nextMonthCash: 1040000, downsideCash: 890000, confidence: "High" },
    },
  },
];

export function parseSuperAdminEmailAllowlist() {
  const configuredEmails = (process.env.SUPER_ADMIN_EMAILS || process.env.INTERNAL_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (process.env.NODE_ENV !== "production") {
    return Array.from(new Set([...configuredEmails, INITIAL_SUPER_ADMIN_EMAIL]));
  }

  return configuredEmails;
}

export function isAllowedSuperAdminEmail(email = "") {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  return normalizedEmail.length > 0 && parseSuperAdminEmailAllowlist().includes(normalizedEmail);
}

export function normalizeDemoCompany(row = {}) {
  const personaLabels = {
    "business-owner": "Business Owner",
    bookkeeper: "Bookkeeper",
    controller: "Controller",
    "fractional-cfo": "Fractional CFO",
  };
  const packageLabels = {
    essential: "Essential",
    professional: "Professional",
    "virtual-cfo": "Virtual CFO",
  };

  return {
    id: row.id,
    name: row.name || row.company_name || "Unnamed Demo Company",
    status: row.status || row.company_status || (row.is_demo ? "demo" : "test"),
    setupStatus: row.setup_status || row.setupStatus || (row.onboarding_status === "complete" ? "Configured" : "Needs setup"),
    packageLevel: row.packageLevel || packageLabels[row.package_level] || row.package_level || "Essential",
    personaMode: row.persona_mode || personaLabels[row.primary_persona] || "Business Owner",
    primaryPersona: row.primary_persona || row.primaryPersona || "business-owner",
    industry: row.industry || "Demo industry",
    industryType: row.industry_type || row.industryType || "Other",
    companyAdmin: row.company_admin || row.companyAdmin || "demo.admin@advisacor.com",
    users: row.users || [],
    deliverySettings: row.delivery_settings || row.deliverySettings || {},
    lastPackageGenerated: row.last_package_generated || "Not generated",
    lastLogin: row.last_login || "No recent login",
    jobStatus: row.job_status || "Scheduled",
    failedJobs: Number(row.failed_jobs || 0),
    demoData: row.demo_data || row.demoData || null,
  };
}
