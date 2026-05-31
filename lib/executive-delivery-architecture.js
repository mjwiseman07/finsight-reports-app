export const PLATFORM_COMPANY_NAME = "Wiseman Financial Technologies LLC";

export const PLATFORM_PRODUCT_NAME = "Advisacor";

export const personaOutputModes = [
  {
    id: "bookkeeper",
    label: "Bookkeeper",
    positioning: "Monthly preparation and task-oriented accounting review support.",
    focus: ["AP", "AR", "Payroll/FTE", "Reserves", "Reconciliations", "Month-end review", "Upload and workflow help"],
    tone: "Clear, practical, and task-oriented.",
    outputStyle:
      "Helps preparers organize reports, explain monthly numbers, resolve missing inputs, and prepare clean package support.",
    aiAssistantTone:
      "Workflow help, report upload guidance, AP/AR explanations, payroll/FTE explanations, and month-end review support.",
  },
  {
    id: "controller",
    label: "Controller",
    positioning: "Operational finance review and close-management intelligence.",
    focus: [
      "Close quality",
      "Flux",
      "Stale balances",
      "Working capital",
      "Inventory",
      "Fixed assets",
      "Reserves",
      "Accruals",
      "Financial statement integrity",
    ],
    tone: "Analytical, operational, and review-focused.",
    outputStyle:
      "Supports financial review, close management, variance investigation, stale balance review, and commentary approval.",
    aiAssistantTone:
      "Close review, flux investigation, reserve/accrual/fixed asset review, and operational finance questions.",
  },
  {
    id: "fractional-cfo",
    label: "Fractional CFO",
    positioning: "Executive advisory, strategic commentary, and board-ready reporting.",
    focus: [
      "Executive summary",
      "Strategic commentary",
      "Liquidity",
      "Forecasting",
      "Budget vs actual",
      "Risks",
      "Board reporting",
      "Recommendations",
      "Financial oversight review",
    ],
    tone: "CFO-level, advisory, and executive-ready.",
    outputStyle:
      "Feels like a fractional CFO prepared it: board-ready, strategic, recommendation-led, and tied to approved insights.",
    aiAssistantTone:
      "Strategy, board preparation, forecasting, liquidity, financial oversight, and executive recommendations.",
  },
  {
    id: "business-owner",
    label: "Business Owner",
    positioning: "Plain-English executive visibility without accounting overload.",
    focus: [
      "Cash",
      "Profit",
      "Sales/revenue",
      "Payroll",
      "AR collections",
      "Major risks",
      "Major opportunities",
      "What changed",
      "What to focus on next",
    ],
    tone: "Plain-English, simple, helpful, and not accounting-heavy.",
    outputStyle:
      "Explains what changed, why it matters, and what to focus on next while hiding unnecessary accounting mechanics.",
    aiAssistantTone:
      "Plain-English explanations, what-this-means guidance, hiring affordability, profit movement, and owner focus areas.",
    translationExample: {
      backendFinding: "Recurring AP cutoff timing identified for Vendor ABC.",
      ownerFacing:
        "Some recurring expenses may not be lining up cleanly with the month they belong to. This may affect how monthly profit is shown.",
    },
  },
];

export const packageScopeRules = [
  {
    packageName: "Essential",
    scope: "AP, AR, reserves, payroll/FTE, and month-over-month operational review.",
  },
  {
    packageName: "Professional",
    scope:
      "Everything in Essential plus inventory, fixed assets, debt, liquidity, working capital, and quarter-over-quarter review.",
  },
  {
    packageName: "Virtual CFO",
    scope:
      "Everything in Professional plus forecasting, budgeting, treasury, oversight review, manufacturing intelligence, deferred revenue, unbilled AR, executive recommendations, and board-level commentary.",
  },
];

export const executiveDeliveryCadences = [
  "Weekly Pulse Brief",
  "Monthly Full Package",
  "Quarterly Strategic Review",
];

export const deliveryConfigurationFields = [
  "Recipient email",
  "Delivery cadence",
  "Package type",
  "Persona output style",
  "Delivery day",
  "Approval required or auto-send",
];

export const ownerDeliverySettingsFields = [
  "Enable Weekly Pulse Brief",
  "Delivery day",
  "Delivery time",
  "Recipient email",
  "Enable monthly package",
  "Require approval before sending",
  "Auto-send enabled or disabled",
  "Package level",
  "Persona = Business Owner",
];

export const deliveryProcessingStatuses = [
  "scheduled",
  "queued",
  "processing",
  "awaiting approval",
  "sent",
  "failed",
];

export const ownerBackgroundJobTypes = [
  "Weekly Pulse Brief generation",
  "monthly package email",
  "Pulse Summary generation",
  "email sending",
  "signed report link creation",
];

export const executiveDeliveryOutputs = [
  "PDF packages",
  "PowerPoint presentations",
  "Executive summaries",
  "KPI dashboards",
  "Forecast updates",
  "Operational intelligence updates",
];

export const automatedDeliveryOutputTypes = [
  {
    id: "weekly-snapshot",
    label: "Weekly Pulse Brief",
    cadence: "Weekly",
    availability: "All packages, package-scoped",
    description:
      "Brief, owner-friendly, email-ready Pulse Brief for business health score, revenue trend, cash position, profitability, top risk, top opportunity, and Pulse commentary.",
    includes: [
      "Revenue trend",
      "Cash position",
      "AR collections",
      "Payroll trend",
      "Top risk",
      "Top opportunity",
      "Pulse commentary",
    ],
    sampleSummary:
      "Revenue remains on pace with forecast. Cash collections improved this week. Inventory continues to increase faster than sales and may warrant review.",
  },
  {
    id: "monthly-full-package",
    label: "Monthly Full Package",
    cadence: "Monthly",
    availability: "All packages, package-scoped",
    description:
      "Month-end PDF package, PowerPoint package, executive summary, KPI review, flux review, package-scoped advisory commentary, and approved insights.",
    includes: [
      "Full PDF package",
      "PowerPoint package",
      "Executive summary",
      "KPI review",
      "Flux review",
      "Approved insights",
    ],
    personaBehavior:
      "Owner outputs are simpler and explanation-based; fractional CFO outputs are board-ready and strategic; controller and bookkeeper outputs are more detailed and preparer-focused.",
  },
  {
    id: "quarterly-strategic-review",
    label: "Quarterly Strategic Review",
    cadence: "Quarterly",
    availability: "Professional and Virtual CFO",
    description:
      "Quarterly management review covering trends, risks, opportunities, cash/liquidity, staffing, operational performance, and management focus areas.",
    includes: [
      "Trend review",
      "Risks",
      "Opportunities",
      "Cash/liquidity",
      "Staffing",
      "Operational performance",
      "Management focus areas",
    ],
    virtualCfoExpansion: [
      "Forecasting",
      "Budget vs actual",
      "Board discussion topics",
      "Executive recommendations",
    ],
  },
];

export const ownerExecutiveBriefWorkflow = {
  personaId: "business-owner",
  title: "Business Owner Email-First Executive Brief",
  defaultCadence: "Friday morning",
  productGoal:
    "The owner should know how the business is doing without reading accounting reports.",
  ownerExperience: [
    "Simple",
    "Plain-English",
    "Executive-focused",
    "Mobile-friendly",
    "Email-first",
    "Low friction",
  ],
  hiddenFromOwner: [
    "JE testing",
    "Reserve calculations",
    "AP cutoff mechanics",
    "Technical accounting schedules",
    "Detailed oversight review",
    "Preparer-only diagnostics",
  ],
  weeklyBriefSections: [
    "Business Health Score",
    "Cash Position",
    "Revenue Trend",
    "Profit Trend",
    "Payroll/FTE Status",
    "AR Collections Status",
    "Top Risk",
    "Top Opportunity",
    "Recommended Focus",
    "Pulse executive summary",
  ],
  monthlyPackageSections: [
    "Short executive summary",
    "PDF package link",
    "PowerPoint package link",
    "Key KPI summary",
    "Top management focus areas",
    "Ask Pulse button",
  ],
  secureAskRoutePattern: "/owner/ask/[briefId]",
  requiredSecurityControls: [
    "Authenticated session or secure magic link",
    "Company authorization",
    "Owner role validation",
    "Signed report access",
    "Secure token expiration",
    "Audit logs for access and questions",
    "No public report URLs",
    "Answers limited to authorized company/report context",
  ],
};

export const ownerSuggestedQuestions = [
  "Why did profit change?",
  "Is cash healthy?",
  "What should I focus on this week?",
  "Can I afford to hire?",
  "What risks stand out?",
  "How are collections trending?",
  "Are we improving or declining?",
  "What changed since last week?",
];

export const ownerPackageScopeRules = [
  {
    packageName: "Essential Owner",
    packageKey: "essential",
    scope: [
      "cash",
      "profit",
      "payroll/FTE",
      "AR/AP",
      "reserve exposure",
      "month-over-month summary",
    ],
  },
  {
    packageName: "Professional Owner",
    packageKey: "professional",
    scope: [
      "everything in Essential Owner",
      "inventory",
      "liquidity",
      "fixed assets",
      "debt",
      "working capital",
      "quarter-over-quarter trends",
    ],
  },
  {
    packageName: "Virtual CFO Owner",
    packageKey: "virtualCfo",
    scope: [
      "everything in Professional Owner",
      "forecasting",
      "budgeting",
      "treasury",
      "oversight intelligence",
      "executive recommendations",
      "board-style guidance",
    ],
  },
];

export const ownerEmailTemplateSpec = {
  weeklySubject: "Your Weekly Pulse Brief Is Ready",
  monthlySubject: "Your Advisacor Monthly Executive Package is Ready",
  header: "Weekly Pulse Brief",
  intro: "Here is your weekly business snapshot.",
  primaryCta: "Ask Pulse About This Report",
  secondaryCta: "View Full Report",
  tone: "Clean, premium, mobile-friendly, executive-style, and short.",
};

export const automatedExecutiveDeliveryEngine = {
  name: "Automated Executive Delivery engine",
  positioning:
    "One intelligence engine with persona-specific output layers and async recurring delivery for executive financial intelligence.",
  coreRule:
    "The same backend intelligence runs for every user. Package level controls the scope of intelligence; persona controls wording, depth, visuals, recommendations, report structure, AI tone, and email summaries.",
  pipeline: [
    "Automatic ERP sync",
    "Automatic report refresh",
    "Persona output rendering",
    "Automatic Pulse review",
    "Weekly Pulse Brief generation",
    "Async PDF generation",
    "Async PowerPoint generation",
    "Async forecast refresh",
    "Approval workflow",
    "Email delivery",
    "Executive delivery notification",
  ],
  ownerEmailFirstFlow: [
    "Advisacor syncs or receives reports",
    "Backend intelligence runs",
    "Owner-facing summary is generated",
    "Weekly or monthly email is sent",
    "Owner clicks Ask Pulse",
    "Secure chat opens",
    "Owner asks questions",
    "AI answers from authorized report/company context",
  ],
  statusTracking: deliveryProcessingStatuses,
  readyMessage: "Your Advisacor Executive Financial Package is ready.",
};

export const workspaceArchitecture = [
  {
    name: "Preparer Workspace",
    audience: "Accountants, controllers, bookkeepers, and advisory teams",
    focus: [
      "Flux review",
      "Oversight review",
      "Accrual review",
      "Reserve review",
      "Validation issues",
      "Reconciliations",
      "Detailed schedules",
      "Commentary approval",
      "Package preparation",
    ],
  },
  {
    name: "Executive Workspace",
    audience: "Owners, executives, boards, and Virtual CFO clients",
    focus: [
      "Weekly Pulse Briefs",
      "Monthly packages",
      "Executive summaries",
      "KPIs",
      "Cash",
      "Trends",
      "Forecasts",
      "AI assistant",
      "Action items",
      "Liquidity",
      "Strategic commentary",
      "AI executive guidance",
      "Operational visibility",
    ],
  },
];

export const packageScopedAiAccess = [
  {
    packageName: "Essential",
    scope: "AP, AR, reserves, payroll/FTE, MoM operational review, and bookkeeping operations.",
  },
  {
    packageName: "Professional",
    scope:
      "Everything in Essential plus inventory, fixed assets, debt, liquidity, working capital, and QoQ trends.",
  },
  {
    packageName: "Virtual CFO",
    scope:
      "Everything in Professional plus forecasting, budgeting, treasury, oversight review, manufacturing intelligence, deferred revenue, unbilled AR, executive recommendations, and board-level commentary.",
  },
];

export const executiveAlertCategories = [
  "Liquidity deterioration",
  "Reserve exposure increase",
  "Staffing scalability concerns",
  "Operational margin pressure",
  "Inventory reserve concerns",
  "Unusual treasury activity",
  "Forecasting deterioration",
];
