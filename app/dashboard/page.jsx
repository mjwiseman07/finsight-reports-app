"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { AdvisacorLogo } from "../../components/AdvisacorLogo";
import { HelpTip } from "../../components/HelpTip";
import { SupportHelpButton } from "../../components/SupportHelpButton";
import { focusRing, headingFont, primaryCtaClass } from "../../components/site-ui";
import { contextualHelp } from "../../lib/contextual-help";
import {
  PLATFORM_PRODUCT_NAME,
  automatedExecutiveDeliveryEngine,
  automatedDeliveryOutputTypes,
  deliveryConfigurationFields,
  deliveryProcessingStatuses,
  executiveDeliveryCadences,
  executiveDeliveryOutputs,
  ownerBackgroundJobTypes,
  ownerDeliverySettingsFields,
  ownerEmailTemplateSpec,
  ownerExecutiveBriefWorkflow,
  ownerPackageScopeRules,
  ownerSuggestedQuestions,
  packageScopeRules,
  personaOutputModes,
  workspaceArchitecture,
} from "../../lib/executive-delivery-architecture";
import { getCheckoutTiers, getProductTier } from "../../lib/product-tiers";
import {
  answerPulseCfoQuestion,
  answerPulsePredictQuestion,
  buildPulsePredictSnapshot,
  executiveInsightSnapshot,
  pulseAiCoreQuestions,
  pulsePredictQuestions,
  whatIfScenarioExamples,
} from "../../lib/pulse-predict";
import {
  buildPulseMemoryScore,
  buildPulseMemoryTimeline,
  demoPulseInsightMemory,
} from "../../lib/pulse-insight-memory";
import { downloadFinancialPackagePdf, downloadFluxAnalysisPdf } from "../../lib/financial-package-pdf";
import { assertReportDataContext } from "../../lib/integrations/accounting/report-data-context";
import { assertReportPreflight, validateReportPreflight } from "../../lib/reporting/report-preflight-validation";

const plans = getCheckoutTiers().map((tier) => ({
  key: tier.key,
  name: tier.name,
  price: tier.priceRange,
  description: tier.targetCustomer,
  featured: tier.featured,
  priceId: tier.priceId,
  features: tier.summaryFeatures || tier.features,
}));

const planRank = {
  essential: 1,
  pulse_starter: 1,
  pulse_pro: 2,
  professional: 3,
  advisacor_professional: 3,
  virtual_cfo: 4,
  virtualCfo: 4,
  advisacor_cfo: 4,
};

const planLabels = {
  essential: "Pulse Starter",
  pulse_starter: "Pulse Starter",
  pulse_pro: "Pulse Pro",
  professional: "Advisacor Professional",
  advisacor_professional: "Advisacor Professional",
  virtual_cfo: "Advisacor CFO",
  virtualCfo: "Advisacor CFO",
  advisacor_cfo: "Advisacor CFO",
};

const featureChecks = [
  ["has_payroll", "Payroll"],
  ["has_inventory", "Inventory"],
  ["has_classes", "Class tracking"],
  ["has_budgets", "Budgets"],
  ["has_fixed_assets", "Fixed assets"],
];

const firstPackageMetrics = [
  ["Business Health Score", "82 / 100", "Healthy, with cash and margin items to watch."],
  ["Cash Position", "$428K", "Stable near-term liquidity."],
  ["Revenue", "$1.8M", "Revenue is trending above the prior period."],
  ["Profitability", "14.6%", "Margins are positive but labor and overhead need monitoring."],
  ["Top Risk", "AR concentration", "Collections timing could pressure short-term cash."],
  ["Top Opportunity", "Margin expansion", "Pricing and expense discipline can improve operating leverage."],
];

function safeReadJsonStorage(key) {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function formatDashboardCurrency(amount) {
  const numericAmount = Number(amount || 0);
  const absoluteAmount = Math.abs(numericAmount);
  const formatted =
    absoluteAmount >= 1000000
      ? `$${(absoluteAmount / 1000000).toFixed(1)}M`
      : absoluteAmount >= 1000
        ? `$${Math.round(absoluteAmount / 1000)}K`
        : `$${Math.round(absoluteAmount).toLocaleString()}`;
  return numericAmount < 0 ? `(${formatted})` : formatted;
}

function sumRows(rows = [], matcher = () => true) {
  return rows.filter(matcher).reduce((total, row) => total + Number(row.amount || row.netAmount || 0), 0);
}

function buildActiveReportSummary(reportPayload) {
  const context = reportPayload?.reportDataContext || reportPayload;
  const normalizedData = context?.normalizedData;
  if (!normalizedData?.sourceSystem) return null;
  const revenue = sumRows(normalizedData.normalizedIncomeStatement, (row) => /revenue|income|sales/i.test(`${row.label} ${row.section}`));
  const expenses = sumRows(normalizedData.normalizedIncomeStatement, (row) => /expense|cost|cogs|payroll|rent|utilities|materials/i.test(`${row.label} ${row.section}`));
  const netIncomeRow = normalizedData.normalizedIncomeStatement.find((row) => /net income|net profit/i.test(row.label));
  const netIncome = netIncomeRow ? Number(netIncomeRow.amount || 0) : revenue - expenses;
  const assets = sumRows(normalizedData.normalizedBalanceSheet, (row) => /asset/i.test(`${row.label} ${row.section}`));
  const liabilities = sumRows(normalizedData.normalizedBalanceSheet, (row) => /liabilit/i.test(`${row.label} ${row.section}`));
  return {
    sourceSystem: normalizedData.sourceSystem,
    tenantName: context.tenantName || context.diagnostics?.tenantName || "",
    lastSyncedAt: normalizedData.lastSyncedAt || context.lastSyncedAt || context.generatedAt,
    diagnostics: context.diagnostics || {
      sourceSystem: normalizedData.sourceSystem,
      tenantName: reportPayload.tenantName || "",
      accountsCount: normalizedData.normalizedAccounts?.length || 0,
      trialBalanceCount: normalizedData.normalizedTrialBalance?.length || 0,
      balanceSheetCount: normalizedData.normalizedBalanceSheet?.length || 0,
      incomeStatementCount: normalizedData.normalizedIncomeStatement?.length || 0,
    },
    revenue,
    expenses,
    netIncome,
    assets,
    liabilities,
    cash: sumRows(normalizedData.normalizedBalanceSheet, (row) => /cash|bank|checking|savings/i.test(`${row.label} ${row.section}`)),
  };
}

function assertSingleSourcePayload(activeSourceSystem, reportPayload) {
  if (!activeSourceSystem) return null;
  const context = reportPayload?.reportDataContext || reportPayload;
  if (context?.connectionId && context?.sourceSystem && context?.normalizedData) {
    assertReportDataContext(context);
  }
  if (!context?.normalizedData?.sourceSystem) {
    if (activeSourceSystem === "xero") {
      throw new Error("Provider mismatch: active xero but normalized data is missing");
    }
    return null;
  }
  if (activeSourceSystem !== context.normalizedData.sourceSystem) {
    throw new Error(`Provider mismatch: active ${activeSourceSystem} but normalized data is ${context.normalizedData.sourceSystem}`);
  }
  return context;
}

function assertReportPayloadSources(activeSourceSystem, reportPayload) {
  if (!activeSourceSystem || !reportPayload) return;
  const context = reportPayload.reportDataContext || reportPayload;
  const mismatchedSources = [];
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value.sourceSystem === "string" && value.sourceSystem !== activeSourceSystem) {
      mismatchedSources.push(value.sourceSystem);
    }
    Object.values(value).forEach(visit);
  };
  visit(context);
  if (mismatchedSources.length) {
    throw new Error(`Provider mismatch: active ${activeSourceSystem} but normalized data is ${mismatchedSources[0]}`);
  }
}

function preflightIssueText(error) {
  const blockers = error?.preflight?.blockers || [];
  if (!blockers.length) return error?.message || "We could not generate this report because the accounting data failed validation. Please review the issues below and sync again.";
  return [
    error.message || "We could not generate this report because the accounting data failed validation. Please review the issues below and sync again.",
    ...blockers.map((issue) => {
      const details = [
        issue.affected ? `affected: ${issue.affected}` : "",
        issue.expected !== undefined ? `expected: ${issue.expected}` : "",
        issue.actual !== undefined ? `actual: ${issue.actual}` : "",
        issue.variance !== undefined ? `variance: ${issue.variance}` : "",
        issue.recommendedFix ? `fix: ${issue.recommendedFix}` : "",
      ].filter(Boolean);
      return `${issue.code}: ${issue.message}${details.length ? ` (${details.join("; ")})` : ""}`;
    }),
  ].join("\n");
}

const pulseInsights = [
  "Pulse identified slowing customer collections.",
  "Pulse detected margin compression in two product categories.",
  "Pulse detected inventory growth exceeding sales growth.",
];

const pulseAlerts = [
  "Cash collections slowed this month.",
  "Retainage exposure increased.",
  "Labor cost per operating unit is trending higher.",
];

const pulseRecommendations = [
  "Monitor customer collection activity.",
  "Review inventory purchasing levels.",
  "Evaluate labor scheduling before adding staff.",
];

const capabilityRecommendationMap = [
  {
    key: "has_inventory",
    report: "Inventory",
    minimumPlan: "professional",
    benefits: ["Inventory Intelligence", "Working Capital Analysis"],
  },
  {
    key: "has_fixed_assets",
    report: "Fixed Asset",
    minimumPlan: "professional",
    benefits: ["Fixed Asset Monitoring", "Working Capital Analysis"],
  },
  {
    key: "has_payroll",
    report: "Payroll",
    minimumPlan: "professional",
    benefits: ["Payroll and FTE Trends", "Labor Cost Monitoring"],
  },
  {
    key: "has_budgets",
    report: "Budget",
    minimumPlan: "virtualCfo",
    benefits: ["Budget vs Actual", "Forecast Review"],
  },
  {
    key: "has_classes",
    report: "Class Tracking",
    minimumPlan: "virtualCfo",
    benefits: ["Segment Profitability", "Management Reporting"],
  },
];

const fluxTypeOptions = [
  { key: "month-over-month", label: "Month-over-Month", minimumLevel: "starter" },
  { key: "quarter-over-quarter", label: "Quarter-over-Quarter", minimumLevel: "pro" },
  { key: "year-over-year", label: "Year-over-Year", minimumLevel: "professional" },
  { key: "custom-period", label: "Custom Period Comparison", minimumLevel: "cfo" },
];

const fluxStatements = [
  "Balance Sheet",
  "Income Statement",
  "Cash Flow Statement",
  "Payroll Analysis",
  "Fixed Asset Rollforward",
  "AR Aging",
  "AP Aging",
  "Inventory",
];

const fluxCommentaryOptions = [
  "Executive Commentary",
  "Business Impact Analysis",
  "Recommended Actions",
  "Driver Identification",
  "Payroll/FTE Commentary",
  "Working Capital Commentary",
  "Margin Commentary",
];

const fluxLevelRank = {
  starter: 1,
  pro: 2,
  professional: 3,
  cfo: 4,
};

const defaultFluxConfig = {
  fluxType: "month-over-month",
  statements: ["Balance Sheet", "Income Statement"],
  dollarThreshold: "5000",
  percentageThreshold: "10",
  filteringLogic: "both",
  aiCommentaryEnabled: true,
  commentaryOptions: fluxCommentaryOptions,
  outputFormat: "pdf",
};

const executivePackagePeriodOptions = [
  { key: "current-month-end", label: "Current Month-End" },
  { key: "prior-month-end", label: "Prior Month-End" },
  { key: "quarter-end", label: "Quarter-End" },
  { key: "year-end", label: "Year-End" },
  { key: "year-to-date", label: "Year-To-Date Through Today" },
  { key: "custom-date", label: "Custom Date" },
];

const executivePowerPointSections = [
  "Executive Summary",
  "Financial Statements",
  "KPI Dashboard",
  "Pulse Commentary",
  "Payroll/FTE Analysis",
  "Ratio Analysis",
  "Industry Insights",
  "Recommendations",
];

const liveDataRefreshSources = [
  "QuickBooks Data",
  "Payroll Data",
  "AR Data",
  "AP Data",
  "Inventory Data",
  "Fixed Asset Data",
  "Customer Data",
  "Vendor Data",
  "Forecast Data",
];

const defaultExecutivePackageConfig = {
  packageType: "",
  reportingPeriod: "current-month-end",
  customDate: "",
  powerPointSections: executivePowerPointSections,
};

function getFluxLevelFromPlan(planKey) {
  if (!planKey) return "starter";
  if (planKey === "pulse_starter" || planKey === "essential") return "starter";
  if (planKey === "pulse_pro") return "pro";
  if (planKey === "advisacor_professional" || planKey === "professional") return "professional";
  return "cfo";
}

function buildIntelligenceRecommendation(capabilities, currentPlanKey) {
  if (!capabilities) return null;
  const currentRank = planRank[currentPlanKey] || 1;
  const availableCapabilities = capabilityRecommendationMap.filter(
    (capability) => capabilities[capability.key] && planRank[capability.minimumPlan] > currentRank,
  );

  if (!availableCapabilities.length) return null;

  return {
    reports: availableCapabilities.map((capability) => capability.report),
    benefits: Array.from(new Set(availableCapabilities.flatMap((capability) => capability.benefits))),
  };
}

function trackRecommendationEvent(eventType, metadata = {}) {
  if (typeof window === "undefined") return;
  const storageKey = "advisacor_recommendation_events";
  const currentEvents = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
  currentEvents.push({ eventType, metadata, createdAt: new Date().toISOString() });
  window.localStorage.setItem(storageKey, JSON.stringify(currentEvents.slice(-50)));
}

const defaultAiQuestions = [
  ...pulseAiCoreQuestions,
  ...pulsePredictQuestions,
  "Why did profit decrease?",
  "Why is cash lower this month?",
  "What concerns you most?",
  "Which customers are impacting collections?",
  "Can I afford another employee?",
  "Why did margin decline?",
];

function wantsDetailedPulseAnalysis(question) {
  const normalizedQuestion = String(question || "").toLowerCase();
  return [
    "why",
    "explain",
    "analysis",
    "detail",
    "supporting",
    "impact",
    "risk",
    "recommend",
    "compare",
    "percentage",
    "percent",
    "last month",
    "month over month",
    "trend",
    "driver",
    "caused",
  ].some((term) => normalizedQuestion.includes(term));
}

function getDashboardRequiredDetailLabel(question) {
  const normalizedQuestion = String(question || "").toLowerCase();
  if (normalizedQuestion.includes("customer") || normalizedQuestion.includes("sales") || normalizedQuestion.includes("revenue") || normalizedQuestion.includes("buy") || normalizedQuestion.includes("bought")) {
    return normalizedQuestion.includes("ytd") || normalizedQuestion.includes("year-to-date")
      ? "customer-level YTD sales analysis"
      : "customer-level sales detail";
  }
  if (normalizedQuestion.includes("asset") || normalizedQuestion.includes("disposed") || normalizedQuestion.includes("disposal") || normalizedQuestion.includes("gain on sale")) return "fixed asset transaction detail";
  if (normalizedQuestion.includes("payroll") || normalizedQuestion.includes("employee") || normalizedQuestion.includes("overtime") || normalizedQuestion.includes("hire")) return "employee-level payroll detail";
  if (normalizedQuestion.includes("vendor") || normalizedQuestion.includes("expense") || normalizedQuestion.includes("bill") || normalizedQuestion.includes("payable")) return "vendor-level expense detail";
  return "the required detail";
}

function buildDashboardUnavailableDataResponse(question, context) {
  const normalizedQuestion = String(question || "").toLowerCase();
  const detailLabel = getDashboardRequiredDetailLabel(question);
  const planName = String(context.packageName || "").toLowerCase();
  const starterPlan = !planName || planName.includes("free") || planName.includes("trial") || planName.includes("starter");
  const packageLimited =
    starterPlan &&
    (normalizedQuestion.includes("ytd") ||
      normalizedQuestion.includes("year-to-date") ||
      normalizedQuestion.includes("customer-level") ||
      normalizedQuestion.includes("vendor-level") ||
      normalizedQuestion.includes("employee-level") ||
      normalizedQuestion.includes("invoice") ||
      normalizedQuestion.includes("transaction") ||
      normalizedQuestion.includes("gain on sale") ||
      normalizedQuestion.includes("which employees"));

  if (packageLimited) {
    return `I can answer this question, however ${detailLabel} is not included in your current Advisacor package.`;
  }

  return `I can answer this question once ${detailLabel} has been imported from QuickBooks.`;
}

function buildDashboardAiAnswer(question, context, conversationMemory = {}) {
  const normalizedQuestion = question.toLowerCase();
  const wantsDetail = wantsDetailedPulseAnalysis(question);
  const industry = context.industryType || "General";
  const prefix = `Using ${context.companyName || "this company"}'s ${industry} dashboard context`;
  const lastCustomer = conversationMemory.lastCustomer;
  const lastAsset = conversationMemory.lastAsset;

  if (
    lastCustomer &&
    /\b(their|they|them|same|that|this)\b/.test(normalizedQuestion) &&
    (normalizedQuestion.includes("sales") || normalizedQuestion.includes("revenue") || normalizedQuestion.includes("buy") || normalizedQuestion.includes("bought"))
  ) {
    const customerName = lastCustomer.entityName || lastCustomer.name;
    const revenue = lastCustomer.revenue || lastCustomer.currentMonthRevenue;
    const priorRevenue = lastCustomer.priorMonthRevenue;
    if (!wantsDetail) {
      return `${customerName} had ${revenue ? `$${Number(revenue).toLocaleString()}` : "the last discussed customer sales amount"} of sales this month.`;
    }
    return [
      `${customerName} had ${revenue ? `$${Number(revenue).toLocaleString()}` : "the last discussed customer sales amount"} of sales this month.`,
      "",
      priorRevenue
        ? `Prior month sales for this customer were $${Number(priorRevenue).toLocaleString()}.`
        : "Pulse resolved this follow-up to the customer discussed in the previous question.",
    ].join("\n");
  }

  if (lastAsset && /\b(it|its|that|this|same)\b/.test(normalizedQuestion) && (normalizedQuestion.includes("gain") || normalizedQuestion.includes("bought") || normalizedQuestion.includes("buy"))) {
    return buildDashboardUnavailableDataResponse(question, context);
  }

  if (normalizedQuestion.includes("asset") || normalizedQuestion.includes("disposed") || normalizedQuestion.includes("disposal")) {
    if (normalizedQuestion.includes("what asset") || normalizedQuestion.includes("which asset")) {
      return buildDashboardUnavailableDataResponse(question, context);
    }
    return wantsDetail
      ? `I identified a $25,000 fixed asset disposal this period. ${buildDashboardUnavailableDataResponse(question, context)}`
      : "I identified a $25,000 fixed asset disposal this period.";
  }

  if (
    normalizedQuestion.includes("projected") ||
    normalizedQuestion.includes("predict") ||
    normalizedQuestion.includes("forecast") ||
    normalizedQuestion.includes("year-end") ||
    normalizedQuestion.includes("90 days") ||
    normalizedQuestion.includes("can i afford") ||
    normalizedQuestion.includes("can we afford") ||
    normalizedQuestion.includes("what if") ||
    normalizedQuestion.includes("what happens if") ||
    normalizedQuestion.includes("should i hire") ||
    normalizedQuestion.includes("should we hire")
  ) {
    return answerPulsePredictQuestion(question, context);
  }

  if (
    normalizedQuestion.includes("reduce expenses") ||
    normalizedQuestion.includes("expenses seem") ||
    normalizedQuestion.includes("biggest financial risk") ||
    normalizedQuestion.includes("focus on this month") ||
    normalizedQuestion.includes("cash flow") ||
    normalizedQuestion.includes("margins shrinking")
  ) {
    return answerPulseCfoQuestion(question, context);
  }

  if (normalizedQuestion.includes("cash")) {
    return wantsDetail
      ? `${prefix}, cash is lower primarily because payroll, vendor payments, and collections timing are moving faster than incoming receipts.`
      : "Cash is lower primarily because outgoing payments are moving faster than incoming receipts.";
  }

  if (normalizedQuestion.includes("profit") || normalizedQuestion.includes("margin")) {
    return wantsDetail
      ? `${prefix}, profitability pressure appears tied to labor, overhead, and margin discipline.`
      : "Profitability pressure appears tied to labor, overhead, and margin discipline.";
  }

  if (normalizedQuestion.includes("employee") || normalizedQuestion.includes("staff") || normalizedQuestion.includes("nurse") || normalizedQuestion.includes("cna")) {
    return buildDashboardUnavailableDataResponse(question, context);
  }

  if (normalizedQuestion.includes("customer") || normalizedQuestion.includes("collections") || normalizedQuestion.includes("receivable")) {
    if (normalizedQuestion.includes("top") || normalizedQuestion.includes("largest") || normalizedQuestion.includes("most")) {
      return [
        "Blue Ridge Industrial Services was the top customer this month with $186,000 of revenue.",
        wantsDetail ? "This represented 22.6% of monthly revenue and was up $24,000 from last month." : "",
      ]
        .filter(Boolean)
        .join("\n");
    }
    return wantsDetail
      ? `${prefix}, collections risk is concentrated in older receivables.`
      : "Collections risk is concentrated in older receivables.";
  }

  if (normalizedQuestion.includes("concern") || normalizedQuestion.includes("risk")) {
    return "The top concerns are cash timing, collections quality, and operating costs growing faster than revenue.";
  }

  return buildDashboardUnavailableDataResponse(question, context);
}

function mergeDashboardConversationMemory(question, answer, previousMemory) {
  const normalizedQuestion = question.toLowerCase();
  const nextMemory = {
    lastCustomer: previousMemory.lastCustomer || null,
    lastVendor: previousMemory.lastVendor || null,
    lastAsset: previousMemory.lastAsset || null,
    lastEmployee: previousMemory.lastEmployee || null,
    lastAccount: previousMemory.lastAccount || null,
    lastReport: previousMemory.lastReport || null,
  };

  if (normalizedQuestion.includes("customer") || answer.includes("Blue Ridge Industrial Services")) {
    nextMemory.lastCustomer = {
      entityType: "Customer",
      entityName: "Blue Ridge Industrial Services",
      revenue: 186000,
      currentMonthRevenue: 186000,
      priorMonthRevenue: 162000,
      percentOfRevenue: 22.6,
      concentrationRisk: "Moderate",
      source: "dashboard_customer_sales_context",
      updatedAt: new Date().toISOString(),
    };
  }

  if (normalizedQuestion.includes("asset") || normalizedQuestion.includes("disposed") || answer.includes("$25,000 fixed asset disposal")) {
    nextMemory.lastAsset = {
      entityType: "Asset",
      entityName: "Unidentified $25,000 fixed asset disposal",
      disposalAmount: 25000,
      source: "dashboard_fixed_asset_roll_forward",
      updatedAt: new Date().toISOString(),
    };
    nextMemory.lastReport = {
      entityType: "Report",
      entityName: "Fixed Asset Roll-Forward",
      source: "dashboard_fixed_asset_roll_forward",
      updatedAt: new Date().toISOString(),
    };
  }

  if (normalizedQuestion.includes("payroll") || normalizedQuestion.includes("employee")) {
    nextMemory.lastReport = {
      entityType: "Report",
      entityName: "Payroll Analysis",
      source: "dashboard_question",
      updatedAt: new Date().toISOString(),
    };
  }

  return nextMemory;
}

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [access, setAccess] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [checkoutPlan, setCheckoutPlan] = useState("");
  const [quickBooksCapabilities, setQuickBooksCapabilities] = useState(null);
  const [quickBooksDetecting, setQuickBooksDetecting] = useState(false);
  const [recommendationDismissed, setRecommendationDismissed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const [businessNameDraft, setBusinessNameDraft] = useState("");
  const [deliveryPersona, setDeliveryPersona] = useState("business-owner");
  const [deliveryCadence, setDeliveryCadence] = useState("Monthly Full Package");
  const [deliveryEmail, setDeliveryEmail] = useState("");
  const [deliveryDay, setDeliveryDay] = useState("5th business day");
  const [deliveryApprovalMode, setDeliveryApprovalMode] = useState("approval-required");
  const [deliveryPackageType, setDeliveryPackageType] = useState("Executive Financial Package");
  const [ownerWeeklyEnabled, setOwnerWeeklyEnabled] = useState(true);
  const [ownerMonthlyEnabled, setOwnerMonthlyEnabled] = useState(true);
  const [ownerDeliveryDay, setOwnerDeliveryDay] = useState("Friday");
  const [ownerDeliveryTime, setOwnerDeliveryTime] = useState("8:00 AM");
  const [ownerRecipientEmail, setOwnerRecipientEmail] = useState("");
  const [ownerRequireApproval, setOwnerRequireApproval] = useState(true);
  const [ownerAutoSendEnabled, setOwnerAutoSendEnabled] = useState(false);
  const [ownerPackageLevel, setOwnerPackageLevel] = useState("essential");
  const [ownerSettingsSaving, setOwnerSettingsSaving] = useState(false);
  const [ownerSettingsMessage, setOwnerSettingsMessage] = useState("");
  const [dashboardPackageGenerating, setDashboardPackageGenerating] = useState(false);
  const [dashboardPackageReady, setDashboardPackageReady] = useState(false);
  const [dashboardPackageHistory, setDashboardPackageHistory] = useState([]);
  const [fluxWorkspaceOpen, setFluxWorkspaceOpen] = useState(false);
  const [fluxConfig, setFluxConfig] = useState(defaultFluxConfig);
  const [fluxWorkspaceMessage, setFluxWorkspaceMessage] = useState("");
  const [executivePackageWizardOpen, setExecutivePackageWizardOpen] = useState(false);
  const [executivePackageConfig, setExecutivePackageConfig] = useState(defaultExecutivePackageConfig);
  const [executivePackageGenerating, setExecutivePackageGenerating] = useState(false);
  const [executivePackageMessage, setExecutivePackageMessage] = useState("");
  const [executivePackageRefreshStatus, setExecutivePackageRefreshStatus] = useState([]);
  const [activeExploreSection, setActiveExploreSection] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [executiveQuestion, setExecutiveQuestion] = useState("");
  const [conversationEntityMemory, setConversationEntityMemory] = useState({
    lastCustomer: null,
    lastVendor: null,
    lastAsset: null,
    lastEmployee: null,
    lastAccount: null,
    lastReport: null,
  });
  const [aiMessages, setAiMessages] = useState([
    {
      role: "advisacor",
      content: "Hi, I'm Pulse. I help you understand the financial and operational health of your business.",
    },
  ]);
  const [pulseMemory, setPulseMemory] = useState({
    insights: demoPulseInsightMemory,
    timeline: buildPulseMemoryTimeline(demoPulseInsightMemory),
    score: buildPulseMemoryScore(demoPulseInsightMemory),
    source: "fallback",
  });
  const [advisoryIntelligence, setAdvisoryIntelligence] = useState({
    signals: [],
    recommendations: [],
    packageQueue: [],
    loading: false,
    message: "",
    error: "",
  });
  const [activeReportPayload, setActiveReportPayload] = useState(() => safeReadJsonStorage("advisacor_active_report_payload"));

  const currentPlanKey = access?.subscription_plan || null;
  const currentProductTier = getProductTier(currentPlanKey);
  const currentFluxLevel = getFluxLevelFromPlan(currentPlanKey);
  const currentPlanName = currentPlanKey ? currentProductTier.name || planLabels[currentPlanKey] || currentPlanKey : access?.reason === "trial" ? "Free Trial" : "No Active Plan";
  const accountEmail = access?.email || "Not available";
  const accountBusinessName = access?.business_name || "Not provided";
  const dashboardParams = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const firstPackageReady = dashboardParams.get("firstPackage") === "ready";
  const customerViewMode = dashboardParams.get("customerView") === "true";
  const readOnlyCustomerView = dashboardParams.get("readOnly") === "true";
  const onboardingCompanyName = dashboardParams.get("companyName") || accountBusinessName;
  const onboardingIndustryType = dashboardParams.get("industryType") || "Industry Intelligence";
  const dashboardCompanyId =
    dashboardParams.get("companyId") ||
    activeReportPayload?.companyId ||
    activeReportPayload?.normalizedData?.companyId ||
    activeReportPayload?.reportDataContext?.companyId ||
    access?.company_id ||
    "";
  const leadDashboardSession = safeReadJsonStorage("advisacor_lead_dashboard_session");
  const activeReportContext = activeReportPayload?.reportDataContext || activeReportPayload;
  const activeSourceSystem =
    activeReportContext?.sourceSystem ||
    leadDashboardSession?.accountingProvider ||
    dashboardParams.get("sourceSystem") ||
    "";
  const activeReportSummary = buildActiveReportSummary(activeReportPayload);
  const activeReportPreflight = activeReportContext?.normalizedData
    ? validateReportPreflight(activeReportContext, { requiresLiveData: true })
    : null;
  const enforceReportPreflight = (scheduleName) => {
    if (!activeReportContext?.normalizedData) return null;
    return assertReportPreflight(activeReportContext, {
      requiresLiveData: true,
      schedules: [
        {
          name: scheduleName,
          sourceSystem: activeReportContext.sourceSystem,
          connectionId: activeReportContext.connectionId,
          syncId: activeReportContext.syncId,
          reportPeriod: activeReportContext.reportPeriod,
        },
      ],
    });
  };
  const dashboardMetrics = activeReportSummary
    ? [
        ["Business Health Score", activeReportSummary.revenue || activeReportSummary.assets ? "82 / 100" : "0 / 100", "Healthy, with cash and margin items to watch."],
        ["Cash Position", formatDashboardCurrency(activeReportSummary.cash), "Stable near-term liquidity."],
        ["Revenue", formatDashboardCurrency(activeReportSummary.revenue), "Revenue is trending above the prior period."],
        ["Profitability", activeReportSummary.revenue ? `${((activeReportSummary.netIncome / activeReportSummary.revenue) * 100).toFixed(1)}%` : "0.0%", "Margins are positive but labor and overhead need monitoring."],
        ["Top Risk", activeReportSummary.revenue ? "AR concentration" : "No financial activity", "Collections timing could pressure short-term cash."],
        ["Top Opportunity", activeReportSummary.revenue ? "Margin expansion" : "Import activity", "Pricing and expense discipline can improve operating leverage."],
      ]
    : firstPackageMetrics;
  const selectedPersonaMode = personaOutputModes.find((persona) => persona.id === deliveryPersona) || personaOutputModes[3];
  const selectedOwnerPackageScope = ownerPackageScopeRules.find((rule) => rule.packageKey === ownerPackageLevel) || ownerPackageScopeRules[0];
  const intelligenceRecommendation = buildIntelligenceRecommendation(quickBooksCapabilities, currentPlanKey);
  const dashboardAiContext = {
    companyName: onboardingCompanyName,
    packageName: currentPlanName,
    industryType: onboardingIndustryType,
    sourceSystem: activeSourceSystem,
    normalizedData: activeReportContext?.normalizedData || null,
    healthScore: activeReportSummary ? dashboardMetrics[0][1] : "82 / 100",
    cash: activeReportSummary ? formatDashboardCurrency(activeReportSummary.cash) : "$428K",
    revenue: activeReportSummary ? formatDashboardCurrency(activeReportSummary.revenue) : "$1.8M",
    profitability: activeReportSummary ? dashboardMetrics[3][1] : "14.6%",
    currentMonthNetIncome: activeReportSummary ? activeReportSummary.netIncome : 269900,
    currentMonthRevenue: activeReportSummary ? activeReportSummary.revenue : 824000,
    cashBalance: activeReportSummary ? activeReportSummary.cash : 428000,
    currentFte: 57,
    priorFte: 52,
    payrollCostPerFte: 4250,
    revenuePerFte: 14456,
    latestPackage: firstPackageReady ? "First executive package" : "Current dashboard snapshot",
    tierName: currentProductTier.name,
    scenarioHorizon: currentProductTier.entitlements.scenarioForecastHorizon,
    scenarioLimit:
      currentProductTier.entitlements.savedScenarioLimit === "unlimited"
        ? "unlimited scenarios"
        : `${currentProductTier.entitlements.savedScenarioLimit} saved scenarios`,
  };
  const pulsePredictSnapshot = buildPulsePredictSnapshot({
    companyName: onboardingCompanyName,
    industryType: onboardingIndustryType,
  });
  const whatIfStrategy = currentProductTier.whatIfScenario;
  const showLegacySubscriberConfiguration = false;

  const readValidStoredAuthToken = useCallback((fallbackToken = "") => {
    const isInvalidJwt = (authToken) => {
      try {
        if (authToken.split(".").length !== 3) return true;
        const payload = JSON.parse(window.atob(authToken.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/") || ""));
        return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now();
      } catch {
        return true;
      }
    };

    const storedToken = window.localStorage.getItem("supabase_access_token") || fallbackToken || "";
    if (storedToken && !isInvalidJwt(storedToken)) return storedToken;
    if (storedToken) window.localStorage.removeItem("supabase_access_token");

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index) || "";
      if (!key.includes("auth-token")) continue;
      try {
        const parsedValue = JSON.parse(window.localStorage.getItem(key) || "{}");
        const accessToken =
          parsedValue?.access_token ||
          parsedValue?.currentSession?.access_token ||
          parsedValue?.session?.access_token;
        if (accessToken && !isInvalidJwt(accessToken)) return accessToken;
      } catch {
        // Ignore unrelated localStorage values.
      }
    }

    return "";
  }, []);

  const getAuthToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const sessionToken = data.session?.access_token || "";
    if (sessionToken && readValidStoredAuthToken(sessionToken)) {
      window.localStorage.setItem("supabase_access_token", sessionToken);
      return sessionToken;
    }
    if (sessionToken) await supabase.auth.signOut();

    return readValidStoredAuthToken(token);
  }, [readValidStoredAuthToken, token]);

  useEffect(() => {
    const loadAccess = async () => {
      const devBypass =
        process.env.NODE_ENV === "development" &&
        new URLSearchParams(window.location.search).get("x-dev-bypass") === "true";
      const superAdminJourney =
        process.env.NODE_ENV === "development" &&
        new URLSearchParams(window.location.search).get("superAdmin") === "true";
      const storedToken = await getAuthToken();
      const leadDashboardSession = (() => {
        try {
          return JSON.parse(window.localStorage.getItem("advisacor_lead_dashboard_session") || "null");
        } catch {
          return null;
        }
      })();
      const leadSessionMode =
        Boolean(leadDashboardSession?.leadId) ||
        (dashboardParams.get("leadSession") === "true" && Boolean(dashboardParams.get("leadId")));

      if (!storedToken && leadSessionMode) {
        const leadAccess = {
          allowed: true,
          reason: "lead_free_review",
          email: window.localStorage.getItem("advisacor_free_review_lead_email") || "Lead captured",
          business_name: leadDashboardSession?.companyName || dashboardParams.get("companyName") || "Free Review Company",
          subscription_plan: leadDashboardSession?.packageLevel || dashboardParams.get("packageLevel") || "pulse_starter",
          subscription_status: "free_review",
        };
        setAccess(leadAccess);
        setBusinessNameDraft(leadAccess.business_name || "");
        setIsLoading(false);
        return;
      }

      if (!storedToken && !devBypass && !superAdminJourney) {
        router.replace("/signin");
        return;
      }

      setToken(storedToken || "");

      try {
        const response = await fetch(devBypass || superAdminJourney ? "/api/check-trial?x-dev-bypass=true" : "/api/check-trial", {
          method: "POST",
          headers: {
            ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
            ...(devBypass || superAdminJourney ? { "x-dev-bypass": "true" } : {}),
          },
        });

        if (response.status === 401) {
          window.localStorage.removeItem("supabase_access_token");
          router.replace("/signin");
          return;
        }

        const result = await response.json();

        if (!response.ok) {
          setError(result.error || "Unable to load dashboard access.");
          return;
        }

        setAccess(result);
        setBusinessNameDraft(result.business_name || "");
      } catch {
        setError("Unable to load dashboard access.");
      } finally {
        setIsLoading(false);
      }
    };

    loadAccess();
  }, [getAuthToken, router]);

  useEffect(() => {
    const loadPulseMemory = async () => {
      if (access?.allowed !== true) return;
      const authToken = token || (await getAuthToken());
      if (!authToken) return;

      try {
        const params = new URLSearchParams();
        const companyId = dashboardParams.get("companyId");
        if (companyId) params.set("companyId", companyId);

        const response = await fetch(`/api/pulse/memory?${params.toString()}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const result = await response.json().catch(() => ({}));
        if (response.ok && Array.isArray(result.insights)) {
          setPulseMemory({
            insights: result.insights,
            timeline: result.timeline || buildPulseMemoryTimeline(result.insights),
            score: result.score || buildPulseMemoryScore(result.insights),
            source: result.source || "supabase",
          });
        }
      } catch {
        setPulseMemory({
          insights: demoPulseInsightMemory,
          timeline: buildPulseMemoryTimeline(demoPulseInsightMemory),
          score: buildPulseMemoryScore(demoPulseInsightMemory),
          source: "fallback",
        });
      }
    };

    void loadPulseMemory();
  }, [access?.allowed, getAuthToken, token]);

  const refreshAdvisoryIntelligence = useCallback(async () => {
    if (!dashboardCompanyId) {
      setAdvisoryIntelligence((current) => ({ ...current, error: "Company context is required before advisory intelligence can run." }));
      return;
    }
    const authToken = token || (await getAuthToken());
    if (!authToken) {
      setAdvisoryIntelligence((current) => ({ ...current, error: "Sign in to load advisory intelligence." }));
      return;
    }
    setAdvisoryIntelligence((current) => ({ ...current, loading: true, error: "", message: "" }));
    try {
      const params = new URLSearchParams({ companyId: dashboardCompanyId });
      const [signalsResponse, recommendationsResponse, queueResponse] = await Promise.all([
        fetch(`/api/advisory-intelligence/signals?${params.toString()}`, { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch(`/api/advisory-intelligence/recommendations?${params.toString()}`, { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch(`/api/advisory-intelligence/package-queue?${params.toString()}`, { headers: { Authorization: `Bearer ${authToken}` } }),
      ]);
      const [signalsResult, recommendationsResult, queueResult] = await Promise.all([
        signalsResponse.json().catch(() => ({})),
        recommendationsResponse.json().catch(() => ({})),
        queueResponse.json().catch(() => ({})),
      ]);
      setAdvisoryIntelligence({
        signals: signalsResponse.ok ? signalsResult.signals || [] : [],
        recommendations: recommendationsResponse.ok ? recommendationsResult.recommendations || [] : [],
        packageQueue: queueResponse.ok ? queueResult.packageQueue || [] : [],
        loading: false,
        message: "Advisory intelligence refreshed. Recommendations remain review-and-approve.",
        error: signalsResponse.ok && recommendationsResponse.ok && queueResponse.ok ? "" : "Some advisory intelligence data could not be loaded.",
      });
    } catch {
      setAdvisoryIntelligence((current) => ({ ...current, loading: false, error: "Unable to load advisory intelligence." }));
    }
  }, [dashboardCompanyId, getAuthToken, token]);

  const runAdvisoryIntelligence = useCallback(async () => {
    if (!dashboardCompanyId) {
      setAdvisoryIntelligence((current) => ({ ...current, error: "Company context is required before advisory intelligence can run." }));
      return;
    }
    const authToken = token || (await getAuthToken());
    if (!authToken) {
      setAdvisoryIntelligence((current) => ({ ...current, error: "Sign in to run advisory intelligence." }));
      return;
    }
    setAdvisoryIntelligence((current) => ({ ...current, loading: true, error: "", message: "" }));
    try {
      const currentMetrics = {
        revenue: 1120000,
        gross_margin: 36,
        ebitda: 142000,
        cash_balance: 360000,
        ar_over_60: 82000,
        ap_past_due: 54000,
      };
      const priorMetrics = {
        revenue: 960000,
        gross_margin: 42,
        ebitda: 188000,
        cash_balance: 445000,
        ar_over_60: 65000,
        ap_past_due: 41000,
      };
      const response = await fetch("/api/advisory-intelligence/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          companyId: dashboardCompanyId,
          industry: onboardingIndustryType,
          currentMetrics,
          priorMetrics,
          period: "current-month",
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to run advisory intelligence.");
      setAdvisoryIntelligence({
        signals: result.detection?.signals || [],
        recommendations: result.recommendations || [],
        packageQueue: result.packageQueue || [],
        loading: false,
        message: result.pulseSummary?.headline || "Advisory intelligence run completed.",
        error: "",
      });
    } catch (error) {
      setAdvisoryIntelligence((current) => ({ ...current, loading: false, error: error.message || "Unable to run advisory intelligence." }));
    }
  }, [dashboardCompanyId, getAuthToken, onboardingIndustryType, token]);

  const updateAdvisoryPackageQueue = useCallback(async (queueItem, action) => {
    const authToken = token || (await getAuthToken());
    if (!authToken || !dashboardCompanyId || !queueItem?.id) return null;
    const response = await fetch("/api/advisory-intelligence/package-queue", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        companyId: dashboardCompanyId,
        queueId: queueItem.id,
        action,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Unable to update advisory package queue.");
    await refreshAdvisoryIntelligence();
    return result.packageQueueItem;
  }, [dashboardCompanyId, getAuthToken, refreshAdvisoryIntelligence, token]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.localStorage.removeItem("supabase_access_token");
    router.push("/signin");
  };

  const handleSubscribe = async (planKey) => {
    setError("");
    setCheckoutPlan(planKey);
    const selectedPlan = plans.find((plan) => plan.key === planKey);

    if (!selectedPlan?.priceId) {
      setError(`${selectedPlan?.name || "This plan"} is not connected to a Stripe price yet.`);
      setCheckoutPlan("");
      return;
    }

    try {
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          priceId: selectedPlan.priceId,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.url) {
        setError(result.error || "Unable to start checkout. Please try again.");
        return;
      }

      window.location.assign(result.url);
    } catch {
      setError("Unable to start checkout. Please try again.");
    } finally {
      setCheckoutPlan("");
    }
  };

  const handleManageBilling = async () => {
    setError("");
    setBillingLoading(true);

    try {
      const authToken = await getAuthToken();
      if (!authToken) {
        setError("Sign in first, then manage billing.");
        return;
      }

      const response = await fetch("/api/create-billing-portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const result = await response.json();

      if (!response.ok || !result.url) {
        setError(result.error || "Unable to open billing portal.");
        return;
      }

      window.location.assign(result.url);
    } catch {
      setError("Unable to open billing portal.");
    } finally {
      setBillingLoading(false);
    }
  };

  const handleSaveAccount = async () => {
    setError("");
    setAccountSaving(true);

    try {
      const authToken = await getAuthToken();
      if (!authToken) {
        setError("Sign in first, then update your account.");
        return;
      }

      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ business_name: businessNameDraft }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Unable to update account.");
        return;
      }

      setAccess((current) => ({
        ...current,
        business_name: result.business_name || "",
        email: result.email || current?.email || "",
      }));
    } catch {
      setError("Unable to update account.");
    } finally {
      setAccountSaving(false);
    }
  };

  const handleSaveOwnerDeliverySettings = async () => {
    setError("");
    setOwnerSettingsMessage("");
    setOwnerSettingsSaving(true);

    try {
      const authToken = await getAuthToken();
      if (!authToken) {
        setError("Sign in first, then save owner delivery settings.");
        return;
      }

      const response = await fetch("/api/owner/delivery-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          weekly_brief_enabled: ownerWeeklyEnabled,
          monthly_package_enabled: ownerMonthlyEnabled,
          delivery_day: ownerDeliveryDay,
          delivery_time: ownerDeliveryTime,
          recipient_email: ownerRecipientEmail || accountEmail,
          require_approval_before_sending: ownerRequireApproval,
          auto_send_enabled: ownerAutoSendEnabled,
          package_level: ownerPackageLevel,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Unable to save owner delivery settings.");
        return;
      }

      setOwnerSettingsMessage("Owner delivery settings saved for the Business Owner persona.");
    } catch {
      setError("Unable to save owner delivery settings.");
    } finally {
      setOwnerSettingsSaving(false);
    }
  };

  const handleConnectQuickBooks = async () => {
    setError("");
    try {
      const authToken = await getAuthToken();
      if (!authToken) {
        setError("Sign in first, then connect QuickBooks.");
        return;
      }

      const response = await fetch("/api/integrations/quickbooks/connect", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.url) {
        setError(result.error || "Unable to start QuickBooks connection.");
        return;
      }
      window.location.assign(result.url);
    } catch {
      setError("Unable to start QuickBooks connection.");
    }
  };

  const handleDetectQuickBooksCapabilities = async () => {
    setError("");
    setQuickBooksDetecting(true);
    try {
      const authToken = await getAuthToken();
      const response = await fetch("/api/quickbooks/detect-capabilities", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Unable to evaluate newly available intelligence.");
        return;
      }
      setQuickBooksCapabilities(result);
      setRecommendationDismissed(false);
      trackRecommendationEvent("recommendation_shown", {
        source: "quickbooks_capability_detection",
        available_reports: featureChecks.filter(([key]) => result[key]).map(([, label]) => label),
      });
    } catch {
      setError("Unable to evaluate newly available intelligence.");
    } finally {
      setQuickBooksDetecting(false);
    }
  };

  const submitAiQuestion = async (value = aiQuestion) => {
    const trimmedQuestion = value.trim();
    if (!trimmedQuestion) return;

    setAiMessages((current) => [
      ...current,
      { role: "user", content: trimmedQuestion },
      { role: "advisacor", content: "Pulse is reviewing your company context, historical memory, forecasts, and prior conversations..." },
    ]);
    setAiQuestion("");
    setAiOpen(true);

    let answer = buildDashboardAiAnswer(trimmedQuestion, dashboardAiContext, conversationEntityMemory);
    let nextConversationEntityMemory = mergeDashboardConversationMemory(trimmedQuestion, answer, conversationEntityMemory);

    try {
      const authToken = token || window.localStorage.getItem("supabase_access_token") || "";
      const leadId = (() => {
        try {
          const leadSession = JSON.parse(window.localStorage.getItem("advisacor_lead_dashboard_session") || "null");
          return leadSession?.leadId || window.localStorage.getItem("advisacor_free_review_lead_id") || "";
        } catch {
          return window.localStorage.getItem("advisacor_free_review_lead_id") || "";
        }
      })();
      if (authToken || leadId) {
        assertSingleSourcePayload(activeSourceSystem, activeReportPayload);
        assertReportPayloadSources(activeSourceSystem, activeReportPayload);
        enforceReportPreflight("Pulse AI generation");
        const response = await fetch("/api/pulse/ask", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            ...(!authToken && leadId ? { "x-free-review-lead-id": leadId } : {}),
          },
          body: JSON.stringify({
            question: trimmedQuestion,
            companyId: dashboardParams.get("companyId") || null,
            conversationMemory: conversationEntityMemory,
            leadId: !authToken ? leadId : null,
            leadContext: !authToken
              ? {
                  companyName: onboardingCompanyName,
                  industryType: onboardingIndustryType,
                  packageName: currentPlanName,
                  sourceSystem: activeSourceSystem,
                  normalizedData: activeReportContext?.normalizedData || null,
                  reportDataContext: activeReportContext || null,
                }
              : null,
            sourceSystem: activeSourceSystem,
            normalizedData: activeReportContext?.normalizedData || null,
            reportDataContext: activeReportContext || null,
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (response.ok && result.answer) {
          answer = result.answer;
          nextConversationEntityMemory = result.conversationMemory || mergeDashboardConversationMemory(trimmedQuestion, answer, conversationEntityMemory);
        } else if (result.error) {
          answer = `${answer}\n\nPulse API note: ${result.error}`;
        }
      }
    } catch (error) {
      answer = `${answer}\n\nPulse API note: ${preflightIssueText(error)}`;
    }

    setAiMessages((current) => [
      ...current.slice(0, -1),
      { role: "advisacor", content: answer },
    ]);
    setConversationEntityMemory(nextConversationEntityMemory);
  };

  const submitExecutiveQuestion = (value = executiveQuestion) => {
    const trimmedQuestion = value.trim();
    if (!trimmedQuestion) return;
    setAiOpen(true);
    void submitAiQuestion(trimmedQuestion);
    setExecutiveQuestion("");
  };

  const askAboutMetric = (metric) => {
    void submitAiQuestion(`Explain ${metric} for this ${onboardingIndustryType} dashboard.`);
  };

  const loadFreshXeroReportPayloadForPdf = async () => {
    if (activeSourceSystem !== "xero") return activeReportPayload;
    const authToken = token || window.localStorage.getItem("supabase_access_token") || "";
    const leadId = (() => {
      try {
        const leadSession = JSON.parse(window.localStorage.getItem("advisacor_lead_dashboard_session") || "null");
        return leadSession?.leadId || window.localStorage.getItem("advisacor_free_review_lead_id") || "";
      } catch {
        return window.localStorage.getItem("advisacor_free_review_lead_id") || "";
      }
    })();
    if (!authToken && !leadId) return activeReportPayload;
    const response = await fetch("/api/accounting/active-context", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({
        companyId: dashboardCompanyId || activeReportContext?.companyId || null,
        connectionId: activeReportContext?.connectionId || activeReportPayload?.connectionId || "",
        sourceSystem: "xero",
        leadId,
        forceRefresh: true,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || (!result.normalizedData && !result.reportDataContext)) {
      throw new Error(result.error || "Unable to refresh Xero report context before PDF generation.");
    }
    const nextPayload = {
      sourceSystem: result.sourceSystem || result.activeContext?.sourceSystem || "xero",
      adapterName: result.normalizedData?.adapterName || result.reportDataContext?.adapterName || null,
      tenantId: result.tenantId || result.activeContext?.tenantId || result.normalizedData?.tenantId || result.reportDataContext?.tenantId || null,
      tenantName: result.tenantName || result.activeContext?.tenantName || result.normalizedData?.tenantName || result.reportDataContext?.tenantName || "",
      lastSyncedAt: result.lastSyncedAt || result.normalizedData?.lastSyncedAt || "",
      connectionId: result.connectionId || result.activeContext?.connectionId || activeReportContext?.connectionId || "",
      syncId: result.syncId || result.activeContext?.latestSuccessfulSyncId || result.reportDataContext?.syncId || "",
      diagnostics: result.diagnostics || null,
      normalizedData: result.normalizedData || null,
      reportDataContext: result.reportDataContext || null,
      preflight: null,
    };
    window.localStorage.setItem("advisacor_active_report_payload", JSON.stringify(nextPayload));
    window.localStorage.setItem("advisacor_report_payload_xero", JSON.stringify(nextPayload));
    setActiveReportPayload(nextPayload);
    return nextPayload;
  };

  const downloadTrialReport = async () => {
    const isTrialReport = access?.reason === "lead_free_review" || access?.subscription_status === "free_review" || access?.reason === "trial";
    try {
      const pdfPayload = await loadFreshXeroReportPayloadForPdf();
      const pdfContext = pdfPayload?.reportDataContext || pdfPayload;
      assertSingleSourcePayload(activeSourceSystem, pdfPayload);
      assertReportPayloadSources(activeSourceSystem, pdfPayload);
      if (pdfContext?.normalizedData) {
        assertReportPreflight(pdfContext, {
          requiresLiveData: true,
          schedules: [
            {
              name: "PDF package generation",
              sourceSystem: pdfContext.sourceSystem,
              connectionId: pdfContext.connectionId,
              syncId: pdfContext.syncId,
              reportPeriod: pdfContext.reportPeriod,
            },
          ],
        });
      }
      downloadFinancialPackagePdf({
        companyName: onboardingCompanyName || "QuickBooks Company",
        industryType: onboardingIndustryType || "Industry Intelligence",
        preparedBy: "Advisacor",
        trial: isTrialReport,
        normalizedData: pdfContext?.normalizedData,
        reportDataContext: pdfContext,
      });
    } catch (error) {
      setError(preflightIssueText(error));
    }
  };

  const getExecutivePackagePeriodLabel = (config = executivePackageConfig) => {
    const selectedPeriod = executivePackagePeriodOptions.find((option) => option.key === config.reportingPeriod);
    if (config.reportingPeriod === "year-to-date") {
      const today = new Date();
      return `January 1, ${today.getFullYear()} through ${today.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })}`;
    }
    if (config.reportingPeriod === "custom-date") {
      return config.customDate ? `Custom Date: ${config.customDate}` : "Custom Date";
    }
    return selectedPeriod?.label || "Current Month-End";
  };

  const openExecutivePackageWizard = () => {
    setExecutivePackageWizardOpen(true);
    setExecutivePackageMessage("");
    setExecutivePackageRefreshStatus([]);
  };

  const scrollToExploreSection = () => {
    window.setTimeout(() => {
      document.getElementById("explore-deeper-active-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const handleExploreCardClick = (sectionTitle) => {
    setActiveExploreSection(sectionTitle);
    if (sectionTitle === "Flux Analysis") {
      setFluxWorkspaceOpen(true);
      setFluxWorkspaceMessage("");
    }
    if (sectionTitle === "Executive Package") {
      openExecutivePackageWizard();
    }
    scrollToExploreSection();
  };

  const downloadExecutivePowerPointPackage = (options) => {
    const safeCompanyName = (options.companyName || "advisacor")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
    const slides = [
      `<section><h1>Executive Summary</h1><h2>${options.companyName}</h2><p>${options.reportPeriod}</p></section>`,
      ...options.sections.map((section) => `<section><h1>${section}</h1><p>Board-ready ${section.toLowerCase()} refreshed from current company data.</p></section>`),
    ].join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Advisacor Executive Package</title><style>body{font-family:Arial,sans-serif;background:#0A1020;color:#111}section{page-break-after:always;background:white;margin:24px;padding:48px;width:960px;height:540px}h1{color:#0A1020}h2{color:#C98746}</style></head><body>${slides}</body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-powerpoint" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeCompanyName || "advisacor"}-executive-package.ppt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
  };

  const runExecutivePackageGeneration = async (packageType = executivePackageConfig.packageType, configOverride = null) => {
    const selectedPackageType = packageType || "pdf";
    const effectiveConfig = { ...executivePackageConfig, ...(configOverride || {}), packageType: selectedPackageType };
    setExecutivePackageConfig((current) => ({ ...current, ...(configOverride || {}), packageType: selectedPackageType }));
    setExecutivePackageGenerating(true);
    setExecutivePackageMessage("Refreshing live company data before generation...");
    setExecutivePackageRefreshStatus([]);

    try {
      for (const source of liveDataRefreshSources) {
        setExecutivePackageRefreshStatus((current) => [...current, source]);
        await new Promise((resolve) => setTimeout(resolve, 70));
      }

      const reportPeriod = getExecutivePackagePeriodLabel(effectiveConfig);
      const isTrialReport = access?.reason === "lead_free_review" || access?.subscription_status === "free_review" || access?.reason === "trial";
      const packagePayload = selectedPackageType === "powerpoint" ? activeReportPayload : await loadFreshXeroReportPayloadForPdf();
      const packageContext = packagePayload?.reportDataContext || packagePayload;
      assertSingleSourcePayload(activeSourceSystem, packagePayload);
      assertReportPayloadSources(activeSourceSystem, packagePayload);
      if (packageContext?.normalizedData) {
        assertReportPreflight(packageContext, {
          requiresLiveData: true,
          schedules: [
            {
              name: selectedPackageType === "powerpoint" ? "PowerPoint generation" : "PDF package generation",
              sourceSystem: packageContext.sourceSystem,
              connectionId: packageContext.connectionId,
              syncId: packageContext.syncId,
              reportPeriod: packageContext.reportPeriod,
            },
          ],
        });
      }
      const generatedAt = new Date().toISOString();
      const packageRecord = {
        id: `executive-package-${generatedAt.replace(/[^0-9]/g, "")}`,
        title: selectedPackageType === "powerpoint" ? "Executive PowerPoint Package" : "Executive PDF Package",
        status: "generated",
        generatedAt,
        generatedLabel: new Date().toLocaleString(),
        reportPeriod,
      };

      if (selectedPackageType === "powerpoint") {
        downloadExecutivePowerPointPackage({
          companyName: onboardingCompanyName || "QuickBooks Company",
          reportPeriod,
          sections: effectiveConfig.powerPointSections,
          sourceSystem: activeSourceSystem,
          normalizedData: packageContext?.normalizedData,
        });
      } else {
        downloadFinancialPackagePdf({
          companyName: onboardingCompanyName || "QuickBooks Company",
          industryType: onboardingIndustryType || "Industry Intelligence",
          preparedBy: "Advisacor",
          reportPeriod,
          trial: isTrialReport,
          normalizedData: packageContext?.normalizedData,
          reportDataContext: packageContext,
        });
      }

      setDashboardPackageHistory((current) => [packageRecord, ...current].slice(0, 5));
      setExecutivePackageMessage(`${packageRecord.title} generated for ${reportPeriod}.`);
    } catch (error) {
      setExecutivePackageMessage(preflightIssueText(error));
    } finally {
      setExecutivePackageGenerating(false);
    }
  };

  const generateRecommendedPackage = async (queueItem) => {
    try {
      const useYtd = window.confirm("Generate YTD through today? Select Cancel for Month-End.");
      const nextConfig = {
        packageType: "pdf",
        reportingPeriod: useYtd ? "year-to-date" : "current-month-end",
      };
      setExecutivePackageConfig((current) => ({ ...current, ...nextConfig }));
      await updateAdvisoryPackageQueue(queueItem, "approve");
      setActiveExploreSection("Executive Package");
      window.setTimeout(() => {
        void runExecutivePackageGeneration("pdf", nextConfig).then(async () => {
          try {
            await updateAdvisoryPackageQueue(queueItem, "generated");
          } catch {
            // Queue status should not block package generation once the user approves.
          }
        });
      }, 0);
    } catch (error) {
      setAdvisoryIntelligence((current) => ({
        ...current,
        error: error.message || "Unable to generate recommended package.",
      }));
    }
  };

  const downloadFluxPowerPointPackage = (options) => {
    const safeCompanyName = (options.companyName || "advisacor")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
    const slides = [
      `<section><h1>Flux Analysis Workspace</h1><h2>${options.companyName}</h2><p>${options.fluxTypeLabel}</p></section>`,
      `<section><h1>Executive Flux Summary</h1><p>Detailed variance analysis using the same Balance Sheet and Income Statement source data as the generated package.</p></section>`,
      `<section><h1>Payroll/FTE Commentary</h1><p>Current FTE: 57 | Prior FTE: 52 | FTE Change: 5 | Payroll Cost Per FTE: $4,250 | Revenue Per FTE: $14,456</p></section>`,
      `<section><h1>Executive Focus</h1><p>Review staffing productivity, working capital movement, margin pressure, and material account changes before approving operational changes.</p></section>`,
    ].join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Advisacor Flux Analysis</title><style>body{font-family:Arial,sans-serif;background:#0A1020;color:#111}section{page-break-after:always;background:white;margin:24px;padding:48px;width:960px;height:540px}h1{color:#0A1020}h2{color:#C98746}</style></head><body>${slides}</body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-powerpoint" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeCompanyName || "advisacor"}-flux-analysis.ppt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
  };

  const runFluxAnalysis = (outputFormat = fluxConfig.outputFormat) => {
    const isTrialReport = access?.reason === "lead_free_review" || access?.subscription_status === "free_review" || access?.reason === "trial";
    const selectedType = fluxTypeOptions.find((option) => option.key === fluxConfig.fluxType) || fluxTypeOptions[0];
    try {
      assertSingleSourcePayload(activeSourceSystem, activeReportPayload);
      assertReportPayloadSources(activeSourceSystem, activeReportPayload);
      enforceReportPreflight(outputFormat === "powerpoint" ? "Flux PowerPoint generation" : outputFormat === "dashboard" ? "Flux dashboard view" : "Flux PDF generation");
    } catch (error) {
      setFluxWorkspaceMessage(preflightIssueText(error));
      return;
    }
    const fluxOptions = {
      companyName: onboardingCompanyName || "QuickBooks Company",
      industryType: onboardingIndustryType || "Industry Intelligence",
      preparedBy: "Advisacor",
      trial: isTrialReport,
      fluxLevel: currentFluxLevel,
      fluxType: fluxConfig.fluxType,
      fluxStatements: fluxConfig.statements,
      dollarThreshold: `$${Number(fluxConfig.dollarThreshold || 0).toLocaleString()}`,
      percentageThreshold: `${fluxConfig.percentageThreshold || 0}%`,
      filteringLogic: fluxConfig.filteringLogic,
      aiCommentaryEnabled: fluxConfig.aiCommentaryEnabled,
      commentaryOptions: fluxConfig.aiCommentaryEnabled ? fluxConfig.commentaryOptions : [],
      fluxTypeLabel: selectedType.label,
      normalizedData: activeReportContext?.normalizedData,
      reportDataContext: activeReportContext,
      sourceSystem: activeSourceSystem,
    };

    if (outputFormat === "powerpoint") {
      downloadFluxPowerPointPackage(fluxOptions);
      setFluxWorkspaceMessage("PowerPoint Flux Package generated.");
      return;
    }

    if (outputFormat === "dashboard") {
      setFluxWorkspaceMessage("Dashboard Flux View is ready below.");
      return;
    }

    downloadFluxAnalysisPdf(fluxOptions);
    setFluxWorkspaceMessage("PDF Flux Package generated.");
  };

  const generateDashboardPackage = async () => {
    setError("");
    setDashboardPackageGenerating(true);
    setDashboardPackageReady(false);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      enforceReportPreflight("Dashboard package generation");
      const generatedAt = new Date().toISOString();
      const packageRecord = {
        id: `package-${generatedAt.replace(/[^0-9]/g, "")}`,
        title: "Financial Package for Client to Review with AI",
        status: "generated",
        generatedAt,
        generatedLabel: new Date().toLocaleString(),
        trial: access?.reason === "lead_free_review" || access?.subscription_status === "free_review",
      };
      setDashboardPackageHistory((current) => [packageRecord, ...current].slice(0, 5));
      window.localStorage.setItem("advisacor_latest_dashboard_package", JSON.stringify(packageRecord));
      setDashboardPackageReady(true);
      void downloadTrialReport();
    } catch (error) {
      setError(preflightIssueText(error));
    } finally {
      setDashboardPackageGenerating(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#111112] px-6 py-8 text-[#ECEBE7]">
      <div className="mx-auto max-w-7xl">
        <header className="sticky top-4 z-40 flex items-center justify-between rounded-3xl border border-[#C9A961]/20 bg-[#1A1A1C]/85 px-5 py-4 shadow-2xl shadow-black/40 backdrop-blur-2xl">
          <Link
            href="/"
            className={`${focusRing("rounded-2xl")} block w-[min(320px,42vw)] px-0 py-0`}
            aria-label="Advisacor home"
          >
            <AdvisacorLogo priority className="w-full" />
          </Link>
          <div className="flex items-center gap-3">
            <SupportHelpButton compact />
            <button
              type="button"
              onClick={() => setAccountOpen(true)}
              className={`${focusRing("rounded-full")} rounded-full border border-[#C9A961]/40 bg-[#C9A961]/10 px-5 py-2 text-sm font-bold text-[#C9A961] transition hover:border-[#C9A961]/70 hover:bg-[#C9A961]/20`}
            >
              Account
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className={`${focusRing("rounded-full")} rounded-full border border-[#C9A961]/20 bg-[#111112] px-5 py-2 text-sm font-bold text-[#ECEBE7] transition hover:border-[#C9A961]/40 hover:text-[#C9A961]`}
            >
              Sign Out
            </button>
          </div>
        </header>

        <section className="py-12">
          {isLoading && (
            <div className="rounded-[2rem] border border-[#C9A961]/20 bg-[#1A1A1C]/85 p-8">
              <p className="text-lg font-bold text-[#ECEBE7]">Loading your dashboard...</p>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-6 rounded-2xl border border-[#B85C5C]/40 bg-[#B85C5C]/10 px-5 py-4 text-sm font-semibold text-[#F0BFBF]"
            >
              <span className={`${headingFont} mr-2 text-xs uppercase tracking-[0.18em] text-[#F0BFBF]`}>
                Notice
              </span>
              <span>{error}</span>
            </div>
          )}

          {!isLoading && access?.allowed === true && (
            <div className="grid gap-8">
              {activeReportSummary && (
                <div className="rounded-3xl border border-[#5591C7]/30 bg-[#5591C7]/10 p-5">
                  <p className={`${headingFont} text-xs font-black uppercase tracking-[0.18em] text-[#DFC084]`}>Report Source: {activeReportSummary.sourceSystem}</p>
                  <div className="mt-3 grid gap-3 text-sm md:grid-cols-3 xl:grid-cols-6">
                    {[
                      ["Connection ID", activeReportContext?.connectionId || "Not available"],
                      ["Adapter", activeReportContext?.adapterName || activeReportContext?.normalizedData?.adapterName || "Not available"],
                      ["Sync ID", activeReportContext?.syncId || "Not available"],
                      ["Tenant", activeReportSummary.tenantName || "Not selected"],
                      ["Period", activeReportContext?.reportPeriod ? `${activeReportContext.reportPeriod.startDate} to ${activeReportContext.reportPeriod.endDate}` : "Not available"],
                      ["Accounts Pulled", activeReportSummary.diagnostics?.accountsCount || 0],
                      ["Balance Sheet Rows", activeReportSummary.diagnostics?.balanceSheetCount || 0],
                      ["Income Statement Rows", activeReportSummary.diagnostics?.incomeStatementCount || 0],
                      ["Trial Balance Rows", activeReportSummary.diagnostics?.trialBalanceCount || 0],
                      ["Last Sync", activeReportSummary.lastSyncedAt ? new Date(activeReportSummary.lastSyncedAt).toLocaleString() : "Not synced"],
                      ["Validation Status", activeReportPreflight?.passed ? "Passed" : activeReportPreflight ? "Blocked" : "Not available"],
                      ["Blockers", activeReportPreflight?.blockers?.length || 0],
                      ["Warnings", activeReportPreflight?.warnings?.length || 0],
                      ["Cash per Balance Sheet", activeReportPreflight ? formatDashboardCurrency(activeReportPreflight.diagnostics.cashPerBalanceSheet) : "Not available"],
                      ["Cash per Supporting Accounts", activeReportPreflight ? formatDashboardCurrency(activeReportPreflight.diagnostics.cashPerSupportingAccounts) : "Not available"],
                      ["Cash Variance", activeReportPreflight ? formatDashboardCurrency(activeReportPreflight.diagnostics.cashVariance) : "Not available"],
                      ["Generated At", activeReportContext?.generatedAt ? new Date(activeReportContext.generatedAt).toLocaleString() : "Not generated"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-[#C9A961]/20 bg-[#111112]/70 px-4 py-3">
                        <p className={`${headingFont} text-[10px] font-black uppercase tracking-[0.14em] text-[#DFC084]/80`}>{label}</p>
                        <p className="mt-1 font-black text-[#ECEBE7]">{value}</p>
                      </div>
                    ))}
                  </div>
                  {activeReportPreflight && (activeReportPreflight.blockers.length > 0 || activeReportPreflight.warnings.length > 0) && (
                    <div className="mt-4 rounded-2xl border border-[#C9A961]/20 bg-[#111112]/70 px-4 py-3 text-sm text-[#ECEBE7]">
                      {[...activeReportPreflight.blockers, ...activeReportPreflight.warnings].map((issue) => (
                        <p key={`${issue.severity}-${issue.code}-${issue.affected || "report"}`} className="mt-1">
                          <span className="font-black">{issue.code}</span>: {issue.message}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {new URLSearchParams(window.location.search).get("superAdmin") === "true" && (
                <div className="rounded-[2rem] border border-[#C9A961]/40 bg-[#C9A961]/10 p-6">
                  <p className={`${headingFont} text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]`}>Super Admin Test Journey</p>
                  <h1 className={`${headingFont} mt-3 text-3xl font-black tracking-[-0.03em] text-[#ECEBE7]`}>Business Owner Executive Workspace setup</h1>
                  <p className="mt-3 max-w-3xl leading-7 text-[#ECEBE7]">
                    Starting from owner onboarding for {new URLSearchParams(window.location.search).get("testCompany") || "selected demo company"} with {new URLSearchParams(window.location.search).get("package") || "selected"} package context.
                  </p>
                </div>
              )}

              {firstPackageReady && (
                <div className="rounded-[2rem] border border-[#6DAA45]/35 bg-[#6DAA45]/10 p-8 shadow-2xl shadow-black/40">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className={`${headingFont} text-sm font-black uppercase tracking-[0.22em] text-[#6DAA45]`}>Welcome to Advisacor</p>
                      <h1 className={`${headingFont} mt-4 text-4xl font-black tracking-[-0.04em] text-[#ECEBE7]`}>Your company dashboard is ready.</h1>
                      <p className="mt-4 max-w-3xl leading-8 text-[#ECEBE7]">
                        {onboardingCompanyName} has its first executive package, dashboard, and summary prepared with {onboardingIndustryType} context.
                      </p>
                    </div>
                    {readOnlyCustomerView ? (
                      <span className="rounded-2xl bg-[#7A7974]/20 px-5 py-3 text-sm font-black text-[#A29E93]">PDF disabled in read-only QA</span>
                    ) : (
                      <button
                        type="button"
                        onClick={downloadTrialReport}
                        className={`${primaryCtaClass} shrink-0`}
                      >
                        Generate PDF
                      </button>
                    )}
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {dashboardMetrics.map(([label, value, detail]) => (
                      <div key={label} className="rounded-3xl border border-[#C9A961]/20 bg-[#1A1A1C] p-5">
                        <p className={`${headingFont} text-xs font-black uppercase tracking-[0.16em] text-[#A29E93]`}>{label}</p>
                        <p className={`${headingFont} mt-3 text-3xl font-black text-[#DFC084]`}>{value}</p>
                        <p className="mt-2 text-sm leading-6 text-[#A29E93]">{detail}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 rounded-3xl border border-[#C9A961]/20 bg-[#1A1A1C] p-5">
                    <p className={`${headingFont} text-sm font-black uppercase tracking-[0.18em] text-[#C9A961]`}>Executive Summary</p>
                    <p className="mt-3 leading-7 text-[#ECEBE7]">
                      The first package shows a healthy operating profile with stable liquidity, positive revenue momentum, and a clear need to watch collections concentration. The best near-term opportunity is improving profitability through margin discipline and tighter expense review.
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button type="button" onClick={() => setAiOpen(true)} className={`${focusRing("rounded-2xl")} rounded-2xl border border-[#C9A961]/20 px-5 py-3 text-sm font-black text-[#ECEBE7] transition hover:border-[#C9A961]/40 hover:text-[#C9A961]`}>
                      Ask Pulse
                    </button>
                    <a href="#owner-delivery-settings" className={`${focusRing("rounded-2xl")} rounded-2xl border border-[#C9A961]/20 px-5 py-3 text-sm font-black text-[#ECEBE7] transition hover:border-[#C9A961]/40 hover:text-[#C9A961]`}>
                      Configure Weekly Brief
                    </a>
                  </div>
                </div>
              )}

              {customerViewMode && (
                <div className="rounded-[2rem] border border-[#BB653B]/40 bg-[#BB653B]/10 p-5 text-[#F5D2B0]">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className={`${headingFont} text-sm font-black uppercase tracking-[0.2em] text-[#BB653B]`}>Customer View Mode</p>
                      <p className={`${headingFont} mt-2 text-lg font-black text-[#ECEBE7]`}>You are viewing this account as the customer.</p>
                      <p className="mt-1 text-sm leading-6 text-[#F5D2B0]/80">
                        Read-only QA mode is active. Internal Super Admin panels, billing administration, platform settings, and monitoring tools are not shown here.
                      </p>
                    </div>
                    <Link
                      href="/admin"
                      className={`${focusRing("rounded-full")} rounded-full border border-[#BB653B]/50 px-5 py-3 text-sm font-black text-[#F5D2B0] transition hover:border-[#BB653B]/80 hover:text-[#ECEBE7]`}
                    >
                      Return to Super Admin
                    </Link>
                  </div>
                </div>
              )}

              <ExecutiveQuestionBar
                question={executiveQuestion}
                onQuestionChange={setExecutiveQuestion}
                onSubmit={submitExecutiveQuestion}
                messages={aiMessages}
                expanded={aiOpen}
                onCollapse={() => setAiOpen(false)}
                onUpgradePackage={() => handleSubscribe(currentPlanKey === "pulse_pro" ? "professional" : "pulse_pro")}
              />

              <SimplifiedFeatureCards onExploreSection={handleExploreCardClick} />

              {activeExploreSection && (
                <ExploreDeeperActiveSection
                  sectionTitle={activeExploreSection}
                  companyName={onboardingCompanyName}
                  industryType={onboardingIndustryType}
                  pulsePredictSnapshot={pulsePredictSnapshot}
                  whatIfStrategy={whatIfStrategy}
                  onAskMetric={askAboutMetric}
                  fluxWorkspaceOpen={fluxWorkspaceOpen}
                  fluxConfig={fluxConfig}
                  currentFluxLevel={currentFluxLevel}
                  fluxWorkspaceMessage={fluxWorkspaceMessage}
                  onFluxChange={setFluxConfig}
                  onFluxClose={() => setFluxWorkspaceOpen(false)}
                  onFluxRun={runFluxAnalysis}
                  executivePackageWizardOpen={executivePackageWizardOpen}
                  executivePackageConfig={executivePackageConfig}
                  executivePackageGenerating={executivePackageGenerating}
                  executivePackageMessage={executivePackageMessage}
                  executivePackageRefreshStatus={executivePackageRefreshStatus}
                  onExecutivePackageChange={setExecutivePackageConfig}
                  onExecutivePackageClose={() => setExecutivePackageWizardOpen(false)}
                  onExecutivePackageGenerate={runExecutivePackageGeneration}
                  executivePackagePeriodLabel={getExecutivePackagePeriodLabel()}
                  advisoryIntelligence={advisoryIntelligence}
                  onRefreshAdvisoryIntelligence={refreshAdvisoryIntelligence}
                  onRunAdvisoryIntelligence={runAdvisoryIntelligence}
                  onDismissAdvisoryPackage={(queueItem) => updateAdvisoryPackageQueue(queueItem, "dismiss")}
                  onGenerateRecommendedPackage={generateRecommendedPackage}
                  onCloseSection={() => setActiveExploreSection("")}
                />
              )}

              {dashboardPackageHistory.length > 0 && (
                <div className="rounded-[2rem] border border-[#C9A961]/20 bg-[#1A1A1C]/85 p-6">
                  <p className={`${headingFont} text-sm font-black uppercase tracking-[0.2em] text-[#C9A961]`}>Package History</p>
                  <div className="mt-4 grid gap-3">
                    {dashboardPackageHistory.map((item) => (
                      <div key={item.id} className="flex flex-col gap-2 rounded-2xl border border-[#C9A961]/20 bg-[#111112]/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-sm font-black text-[#ECEBE7]">{item.title}</span>
                        <span className="text-xs font-bold text-[#B5E28A]">{item.status} | {item.generatedLabel || item.generatedAt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {intelligenceRecommendation && !recommendationDismissed && (
                <div className="rounded-[2rem] border border-[#C9A961]/40 bg-[#C9A961]/10 p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className={`${headingFont} text-sm font-black uppercase tracking-[0.22em] text-[#DFC084]`}>Pulse Recommendation</p>
                      <h2 className={`${headingFont} mt-3 text-2xl font-black tracking-[-0.02em] text-[#ECEBE7]`}>
                        We detected {intelligenceRecommendation.reports.join(" and ")} reports that can support additional intelligence.
                      </h2>
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-[#ECEBE7]">
                        This is a contextual recommendation based on newly available data, not an onboarding step.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {intelligenceRecommendation.benefits.map((benefit) => (
                          <span key={benefit} className="rounded-full border border-[#C9A961]/20 bg-[#111112]/70 px-3 py-1 text-xs font-black text-[#ECEBE7]">
                            {benefit}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          trackRecommendationEvent("recommendation_accepted", {
                            available_reports: intelligenceRecommendation.reports,
                            benefits: intelligenceRecommendation.benefits,
                          });
                          setAccountOpen(true);
                        }}
                        className={`${primaryCtaClass} rounded-2xl px-5 py-3 text-sm`}
                      >
                        Review Recommendation
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          trackRecommendationEvent("recommendation_dismissed", {
                            available_reports: intelligenceRecommendation.reports,
                          });
                          setRecommendationDismissed(true);
                        }}
                        className={`${focusRing("rounded-2xl")} rounded-2xl border border-[#C9A961]/20 px-5 py-3 text-sm font-black text-[#ECEBE7] transition hover:border-[#C9A961]/40 hover:text-[#C9A961]`}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isLoading && access?.allowed === false && access.reason === "trial_expired" && (
            <div>
              <div className="mb-8 rounded-[2rem] border border-[#C9A961]/20 bg-[#1A1A1C]/85 p-8">
                <p className={`${headingFont} text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]`}>Choose a Plan</p>
                <h1 className={`${headingFont} mt-4 text-4xl font-black tracking-[-0.03em] text-[#ECEBE7]`}>Your free trial has been used. Choose a plan to continue.</h1>
              </div>

              <div className="grid gap-6 xl:grid-cols-4">
                {plans.map((plan) => (
                  <div
                    key={plan.key}
                    className={`rounded-[2rem] border p-8 ${
                      plan.featured
                        ? "border-[#C9A961]/60 bg-[#C9A961]/15 shadow-2xl shadow-[#C9A961]/25"
                        : "border-[#C9A961]/20 bg-[#1A1A1C]/85"
                    }`}
                  >
                    <p className={`${headingFont} text-sm font-black uppercase tracking-[0.18em] ${plan.featured ? "text-[#111112]" : "text-[#DFC084]"}`}>
                      {plan.name}
                    </p>
                    <h2 className={`${headingFont} mt-4 text-5xl font-black tracking-[-0.03em] ${plan.featured ? "text-[#111112]" : "text-[#DFC084]"}`}>{plan.price}</h2>
                    <p className={`mt-4 min-h-20 leading-7 ${plan.featured ? "text-[#111112]" : "text-[#ECEBE7]"}`}>
                      {plan.description}
                    </p>
                    <ul className={`mt-5 grid gap-2 text-sm leading-6 ${plan.featured ? "text-[#111112]" : "text-[#ECEBE7]"}`}>
                      {plan.features.slice(0, 5).map((feature) => (
                        <li key={feature}>- {feature}</li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => handleSubscribe(plan.key)}
                      disabled={checkoutPlan === plan.key || !plan.priceId}
                      className={`${focusRing("rounded-2xl")} mt-8 w-full rounded-2xl px-5 py-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        plan.featured
                          ? "border border-[#C9A961]/60 bg-[#111112] text-[#ECEBE7] hover:border-[#C9A961] hover:bg-[#1A1A1C]"
                          : "premium-button"
                      }`}
                    >
                      {checkoutPlan === plan.key ? "Starting checkout..." : plan.priceId ? "Subscribe" : "Stripe price pending"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isLoading && access?.allowed === true && access.reason === "subscriber" && showLegacySubscriberConfiguration && (
            <div>
              <div className="rounded-[2rem] border border-[#6DAA45]/35 bg-[#6DAA45]/10 p-8">
                <p className={`${headingFont} text-sm font-black uppercase tracking-[0.22em] text-[#6DAA45]`}>Active Subscriber</p>
                <h1 className={`${headingFont} mt-4 text-4xl font-black tracking-[-0.03em] text-[#ECEBE7]`}>Your {PLATFORM_PRODUCT_NAME} workspace is ready.</h1>
                <p className="mt-4 max-w-2xl leading-8 text-[#ECEBE7]">
                  Generate new reports, manage client packages, configure delivery automation, and continue creating board-ready deliverables.
                </p>
                <button
                  type="button"
                  onClick={generateDashboardPackage}
                  disabled={dashboardPackageGenerating}
                  className={`${focusRing("rounded-2xl")} premium-button mt-8 inline-flex rounded-2xl px-6 py-4 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {dashboardPackageGenerating ? "Generating..." : "Generate New Report"}
                </button>
              </div>

              <div className="mt-8 grid gap-5 md:grid-cols-3">
                {["Reports Generated", "Package Status", "Subscription"].map((label, index) => (
                  <div key={label} className="rounded-3xl border border-[#C9A961]/20 bg-[#1A1A1C]/85 p-6">
                    <p className={`${headingFont} text-xs font-black uppercase tracking-[0.14em] text-[#A29E93]`}>{label}</p>
                    <p className={`${headingFont} mt-4 text-3xl font-black text-[#DFC084]`}>{index === 0 ? "Ready" : index === 1 ? "Active" : "Current"}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-[2rem] border border-[#C9A961]/20 bg-[#1A1A1C]/85 p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className={`${headingFont} text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]`}>Automated Executive Delivery</p>
                    <h2 className={`${headingFont} mt-3 text-3xl font-black tracking-[-0.02em] text-[#ECEBE7]`}>Executive delivery automation architecture</h2>
                    <p className="mt-3 max-w-3xl leading-7 text-[#ECEBE7]">
                      {automatedExecutiveDeliveryEngine.positioning} Package level controls intelligence scope while persona controls output wording, depth, visuals, recommendations, report structure, AI tone, and email summaries.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#C9A961]/20 bg-[#111112]/70 px-5 py-4">
                    <p className="text-sm font-black text-[#B5E28A]">{automatedExecutiveDeliveryEngine.readyMessage}</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-5 lg:grid-cols-3">
                  <div className="rounded-3xl border border-[#C9A961]/20 bg-[#1A1A1C]/85 p-5">
                    <p className={`${headingFont} text-sm font-black uppercase tracking-[0.16em] text-[#DFC084]`}>Recurring Outputs</p>
                    <div className="mt-4 grid gap-2">
                      {executiveDeliveryOutputs.slice(0, 5).map((item) => (
                        <p key={item} className="rounded-2xl border border-[#C9A961]/15 bg-[#111112]/70 px-4 py-3 text-sm font-bold text-[#ECEBE7]">{item}</p>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-[#C9A961]/20 bg-[#1A1A1C]/85 p-5">
                    <p className={`${headingFont} text-sm font-black uppercase tracking-[0.16em] text-[#DFC084]`}>Scheduler Examples</p>
                    <div className="mt-4 grid gap-2">
                      {executiveDeliveryCadences.map((item) => (
                        <p key={item} className="rounded-2xl border border-[#C9A961]/15 bg-[#111112]/70 px-4 py-3 text-sm font-bold text-[#ECEBE7]">{item}</p>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-[#C9A961]/20 bg-[#1A1A1C]/85 p-5">
                    <p className={`${headingFont} text-sm font-black uppercase tracking-[0.16em] text-[#DFC084]`}>Workspace Split</p>
                    <div className="mt-4 grid gap-2">
                      {workspaceArchitecture.map((workspace) => (
                        <div key={workspace.name} className="rounded-2xl border border-[#C9A961]/15 bg-[#111112]/70 px-4 py-3">
                          <p className="text-sm font-black text-[#ECEBE7]">{workspace.name}</p>
                          <p className="mt-1 text-xs leading-5 text-[#A29E93]">{workspace.audience}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 rounded-[2rem] border border-[#C9A961]/20 bg-[#1A1A1C]/85 p-8">
                <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
                  <div>
                    <p className={`${headingFont} text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]`}>Persona-Based Outputs</p>
                    <h2 className={`${headingFont} mt-3 text-3xl font-black tracking-[-0.02em] text-[#ECEBE7]`}>One intelligence engine. Four presentation layers.</h2>
                    <p className="mt-3 leading-7 text-[#ECEBE7]">
                      {automatedExecutiveDeliveryEngine.coreRule}
                    </p>
                    <p className="mt-5 rounded-2xl border border-[#C9A961]/20 bg-[#111112]/70 px-4 py-3 text-sm font-bold text-[#ECEBE7]">
                      Output style is configured during company onboarding and inherited by users through their company role.
                    </p>
                    <div className="mt-5 grid gap-3">
                      {personaOutputModes.map((persona) => (
                        <div
                          key={persona.id}
                          className={`rounded-2xl border px-4 py-3 text-left transition ${
                            deliveryPersona === persona.id
                              ? "border-[#C9A961]/60 bg-[#C9A961]/15"
                              : "border-[#C9A961]/20 bg-[#1A1A1C]/85 hover:border-[#C9A961]/45"
                          }`}
                        >
                          <p className={`${headingFont} text-sm font-black text-[#ECEBE7]`}>{persona.label}</p>
                          <p className="mt-1 text-xs leading-5 text-[#A29E93]">{persona.positioning}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-[#C9A961]/20 bg-[#111112]/70 p-6">
                    <p className={`${headingFont} text-xs font-black uppercase tracking-[0.18em] text-[#A29E93]`}>Selected Output Style</p>
                    <h3 className={`${headingFont} mt-3 text-2xl font-black text-[#DFC084]`}>{selectedPersonaMode.label}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#ECEBE7]">{selectedPersonaMode.outputStyle}</p>
                    <p className="mt-4 rounded-2xl border border-[#C9A961]/20 bg-[#1A1A1C]/85 px-4 py-3 text-sm leading-6 text-[#ECEBE7]">
                      AI tone: {selectedPersonaMode.aiAssistantTone}
                    </p>
                    {selectedPersonaMode.translationExample && (
                      <div className="mt-4 rounded-2xl border border-[#C9A961]/25 bg-[#1A1A1C]/85 p-4">
                        <p className={`${headingFont} text-xs font-black uppercase tracking-[0.16em] text-[#DFC084]`}>Owner Translation Example</p>
                        <p className="mt-2 text-sm text-[#ECEBE7]">{selectedPersonaMode.translationExample.ownerFacing}</p>
                      </div>
                    )}
                    <div className="mt-5 flex flex-wrap gap-2">
                      {selectedPersonaMode.focus.slice(0, 8).map((item) => (
                        <span key={item} className="rounded-full border border-[#C9A961]/25 bg-[#1A1A1C] px-3 py-1 text-xs font-bold text-[#ECEBE7]">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 rounded-[2rem] border border-[#C9A961]/20 bg-[#1A1A1C]/85 p-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className={`${headingFont} text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]`}>Delivery Configuration</p>
                    <h2 className={`${headingFont} mt-3 text-3xl font-black tracking-[-0.02em] text-[#ECEBE7]`}>Configure recurring executive delivery</h2>
                    <p className="mt-3 max-w-3xl leading-7 text-[#ECEBE7]">
                      Configure the delivery layer while async processing handles ERP sync, AI commentary, PDF/PPT generation, approval status, and email delivery without freezing the frontend.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#C9A961]/20 bg-[#111112]/70 px-5 py-4">
                    <p className={`${headingFont} text-xs font-black uppercase tracking-[0.16em] text-[#A29E93]`}>Status Flow</p>
                    <p className={`${headingFont} mt-2 text-sm font-bold text-[#DFC084]`}>{deliveryProcessingStatuses.join(" -> ")}</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                  <label className="grid gap-2">
                    <span className={`${headingFont} flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#A29E93]`}>
                      Recipient Email <HelpTip content={contextualHelp.recipientEmails} />
                    </span>
                    <input
                      value={deliveryEmail}
                      onChange={(event) => setDeliveryEmail(event.target.value)}
                      placeholder={accountEmail}
                      className="rounded-2xl border border-[#C9A961]/25 bg-[#111112] px-4 py-3 text-sm font-bold text-[#ECEBE7] outline-none placeholder:text-[#7A7974] focus:border-[#C9A961]/60"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className={`${headingFont} flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#A29E93]`}>
                      Delivery Cadence <HelpTip content={contextualHelp.reportingCadence} />
                    </span>
                    <select
                      value={deliveryCadence}
                      onChange={(event) => setDeliveryCadence(event.target.value)}
                      className="rounded-2xl border border-[#C9A961]/25 bg-[#111112] px-4 py-3 text-sm font-bold text-[#ECEBE7] outline-none focus:border-[#C9A961]/60"
                    >
                      {executiveDeliveryCadences.map((cadence) => (
                        <option key={cadence}>{cadence}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className={`${headingFont} flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#A29E93]`}>
                      Package Type <HelpTip content={contextualHelp.packageType} />
                    </span>
                    <select
                      value={deliveryPackageType}
                      onChange={(event) => setDeliveryPackageType(event.target.value)}
                      className="rounded-2xl border border-[#C9A961]/25 bg-[#111112] px-4 py-3 text-sm font-bold text-[#ECEBE7] outline-none focus:border-[#C9A961]/60"
                    >
                      <option>Executive Financial Package</option>
                      <option>Weekly KPI Snapshot</option>
                      <option>Board Review Package</option>
                      <option>Controller Review Package</option>
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className={`${headingFont} flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#A29E93]`}>
                      Persona Output Style <HelpTip content={contextualHelp.primaryUseCase} />
                    </span>
                    <div className="rounded-2xl border border-[#C9A961]/25 bg-[#111112] px-4 py-3 text-sm font-bold text-[#ECEBE7]">
                      Stored on the company account during onboarding.
                    </div>
                  </label>
                  <label className="grid gap-2">
                    <span className={`${headingFont} flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#A29E93]`}>
                      Delivery Day <HelpTip content={contextualHelp.deliveryDay} />
                    </span>
                    <input
                      value={deliveryDay}
                      onChange={(event) => setDeliveryDay(event.target.value)}
                      className="rounded-2xl border border-[#C9A961]/25 bg-[#111112] px-4 py-3 text-sm font-bold text-[#ECEBE7] outline-none focus:border-[#C9A961]/60"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className={`${headingFont} flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#A29E93]`}>
                      Approval <HelpTip content={contextualHelp.approvalRequired} />
                    </span>
                    <select
                      value={deliveryApprovalMode}
                      onChange={(event) => setDeliveryApprovalMode(event.target.value)}
                      className="rounded-2xl border border-[#C9A961]/25 bg-[#111112] px-4 py-3 text-sm font-bold text-[#ECEBE7] outline-none focus:border-[#C9A961]/60"
                    >
                      <option value="approval-required">Approval required before send</option>
                      <option value="auto-send">Auto-send after generation</option>
                    </select>
                  </label>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                  {automatedDeliveryOutputTypes.map((output) => (
                    <div key={output.id} className="rounded-3xl border border-[#C9A961]/20 bg-[#111112]/70 p-5">
                      <p className={`${headingFont} text-sm font-black text-[#ECEBE7]`}>{output.label}</p>
                      <p className={`${headingFont} mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#DFC084]`}>{output.availability}</p>
                      <p className="mt-3 text-sm leading-6 text-[#A29E93]">{output.description}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-3xl border border-[#C9A961]/20 bg-[#111112]/70 p-5">
                    <p className={`${headingFont} text-sm font-black text-[#ECEBE7]`}>Configuration Fields</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {deliveryConfigurationFields.map((field) => (
                        <span key={field} className="rounded-full border border-[#C9A961]/25 bg-[#1A1A1C] px-3 py-1 text-xs font-bold text-[#ECEBE7]">
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-[#C9A961]/20 bg-[#111112]/70 p-5">
                    <p className={`${headingFont} text-sm font-black text-[#ECEBE7]`}>Package Scope Still Applies</p>
                    <div className="mt-3 grid gap-2">
                      {packageScopeRules.map((rule) => (
                        <p key={rule.packageName} className="text-sm leading-6 text-[#A29E93]">
                          <span className={`${headingFont} font-black text-[#DFC084]`}>{rule.packageName}:</span> {rule.scope}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div id="owner-delivery-settings" className="mt-8 rounded-[2rem] border border-emerald-300/20 bg-emerald-400/10 p-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-200">Business Owner Only</p>
                    <h2 className="mt-3 text-3xl font-black">Email-first Weekly Pulse Brief and Secure Ask Pulse</h2>
                    <p className="mt-3 max-w-3xl leading-7 text-slate-300">
                      {ownerExecutiveBriefWorkflow.productGoal} This workflow is limited to the Business Owner persona and does not apply to bookkeeper, controller, or fractional CFO outputs.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-300/20 bg-slate-950/60 px-5 py-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200">Default cadence</p>
                    <p className="mt-2 text-sm font-bold text-white">{ownerExecutiveBriefWorkflow.defaultCadence}</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 rounded-3xl border border-white/10 bg-slate-950/60 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-white">Owner delivery settings</p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      Persist weekly brief, monthly package, approval, auto-send, recipient, and package settings for Business Owner delivery only.
                    </p>
                    {ownerSettingsMessage && (
                      <p className="mt-2 text-sm font-bold text-emerald-200">{ownerSettingsMessage}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveOwnerDeliverySettings}
                    disabled={ownerSettingsSaving}
                    className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-[#062016] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {ownerSettingsSaving ? "Saving..." : "Save Owner Settings"}
                  </button>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                  <label className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                    <span className="flex items-center gap-2 text-sm font-black text-white">
                      Weekly Pulse Brief <HelpTip content={contextualHelp.reportingCadence} />
                    </span>
                    <p className="mt-2 text-sm leading-6 text-slate-400">Automated Friday owner snapshot with health, cash, revenue, profit, payroll, collections, risk, opportunity, and focus.</p>
                    <select
                      value={ownerWeeklyEnabled ? "enabled" : "disabled"}
                      onChange={(event) => setOwnerWeeklyEnabled(event.target.value === "enabled")}
                      className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                    >
                      <option value="enabled">Enabled</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </label>

                  <label className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                    <span className="flex items-center gap-2 text-sm font-black text-white">
                      Monthly Executive Package <HelpTip content={contextualHelp.packageType} />
                    </span>
                    <p className="mt-2 text-sm leading-6 text-slate-400">Month-end email with Pulse Executive Summary, KPI highlights, PDF/PPT links, and the secure Ask Pulse button.</p>
                    <select
                      value={ownerMonthlyEnabled ? "enabled" : "disabled"}
                      onChange={(event) => setOwnerMonthlyEnabled(event.target.value === "enabled")}
                      className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                    >
                      <option value="enabled">Enabled</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </label>

                  <label className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                    <span className="flex items-center gap-2 text-sm font-black text-white">
                      Persona <HelpTip content={contextualHelp.primaryUseCase} />
                    </span>
                    <p className="mt-2 text-sm leading-6 text-slate-400">Locked to Business Owner for this email-first workflow.</p>
                    <input
                      value="Business Owner"
                      readOnly
                      className="mt-4 w-full rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-black text-emerald-100 outline-none"
                    />
                  </label>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-4">
                  <label className="grid gap-2">
                    <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Delivery Day <HelpTip content={contextualHelp.deliveryDay} />
                    </span>
                    <input
                      value={ownerDeliveryDay}
                      onChange={(event) => setOwnerDeliveryDay(event.target.value)}
                      className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Delivery Time <HelpTip content={contextualHelp.deliveryDay} />
                    </span>
                    <input
                      value={ownerDeliveryTime}
                      onChange={(event) => setOwnerDeliveryTime(event.target.value)}
                      className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Recipient Email <HelpTip content={contextualHelp.recipientEmails} />
                    </span>
                    <input
                      value={ownerRecipientEmail}
                      onChange={(event) => setOwnerRecipientEmail(event.target.value)}
                      placeholder={accountEmail}
                      className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-emerald-300/60"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Package Level <HelpTip content={contextualHelp.packageSelection} />
                    </span>
                    <select
                      value={ownerPackageLevel}
                      onChange={(event) => setOwnerPackageLevel(event.target.value)}
                      className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                    >
                      <option value="essential">Essential Owner</option>
                      <option value="professional">Professional Owner</option>
                      <option value="virtualCfo">Virtual CFO Owner</option>
                    </select>
                  </label>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                    <p className="text-sm font-black text-white">Approval and Sending</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="rounded-2xl bg-white/[0.04] px-4 py-3">
                        <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                          Approval <HelpTip content={contextualHelp.approvalRequired} />
                        </span>
                        <select
                          value={ownerRequireApproval ? "approval-required" : "no-approval"}
                          onChange={(event) => setOwnerRequireApproval(event.target.value === "approval-required")}
                          className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm font-bold text-white outline-none"
                        >
                          <option value="approval-required">Require approval</option>
                          <option value="no-approval">No approval required</option>
                        </select>
                      </label>
                      <label className="rounded-2xl bg-white/[0.04] px-4 py-3">
                        <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                          Auto-send <HelpTip content={contextualHelp.autoSend} />
                        </span>
                        <select
                          value={ownerAutoSendEnabled ? "auto-send" : "manual-send"}
                          onChange={(event) => setOwnerAutoSendEnabled(event.target.value === "auto-send")}
                          className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm font-bold text-white outline-none"
                        >
                          <option value="manual-send">Disabled</option>
                          <option value="auto-send">Enabled</option>
                        </select>
                      </label>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-400">
                      Background jobs move through {deliveryProcessingStatuses.join(" -> ")} before owner delivery.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                    <p className="text-sm font-black text-white">Owner Package Scope</p>
                    <p className="mt-2 text-sm font-bold text-emerald-100">{selectedOwnerPackageScope.packageName}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedOwnerPackageScope.scope.map((item) => (
                        <span key={item} className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-bold text-slate-300">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                  <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                    <p className="text-sm font-black text-white">Email Template</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">Subject: {ownerEmailTemplateSpec.weeklySubject}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">CTA: {ownerEmailTemplateSpec.primaryCta}</p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                    <p className="text-sm font-black text-white">Secure Ask Pulse</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Opens /owner/ask/[briefId] with an authenticated session or expiring owner magic link. No public chatbot links.
                    </p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                    <p className="text-sm font-black text-white">Async Jobs</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {ownerBackgroundJobTypes.map((item) => (
                        <span key={item} className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-bold text-slate-300">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                    <p className="text-sm font-black text-white">Pulse Suggested Questions</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {ownerSuggestedQuestions.map((item) => (
                        <span key={item} className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-bold text-slate-300">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                    <p className="text-sm font-black text-white">Owner Settings Fields</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {ownerDeliverySettingsFields.map((field) => (
                        <span key={field} className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-bold text-slate-300">
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {accountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1220] shadow-2xl shadow-black/40">
            <div className="shrink-0 border-b border-white/10 px-6 py-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-300">Account</p>
                  <h2 className="mt-2 text-3xl font-black">Account and package settings</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Review your account, current package, and available plan changes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAccountOpen(false)}
                  className="rounded-2xl border border-white/15 bg-slate-950 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-white/30 hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Email</p>
                  <p className="mt-3 break-words text-lg font-black text-white">{accountEmail}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Firm / Business</p>
                  <input
                    type="text"
                    value={businessNameDraft}
                    onChange={(event) => setBusinessNameDraft(event.target.value)}
                    placeholder={accountBusinessName}
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-blue-300/60"
                  />
                  <button
                    type="button"
                    onClick={handleSaveAccount}
                    disabled={accountSaving}
                    className="mt-3 rounded-2xl bg-[#1a6cf6] px-4 py-2 text-xs font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {accountSaving ? "Saving..." : "Save Account Info"}
                  </button>
                </div>
                <div className="rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Current Package</p>
                  <p className="mt-3 text-lg font-black text-white">{currentPlanName}</p>
                  <p className="mt-2 text-sm font-semibold capitalize text-emerald-100/80">
                    {access?.subscription_status || access?.reason || "Loading"}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-300">Package Options</p>
                    <h3 className="mt-2 text-2xl font-black">Upgrade or downgrade your package</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                      Active subscriptions are managed in Stripe billing. Trial or expired accounts can choose a package here.
                    </p>
                  </div>
                  {access?.reason === "subscriber" && (
                    <button
                      type="button"
                      onClick={handleManageBilling}
                      disabled={billingLoading}
                      className="rounded-2xl bg-[#1a6cf6] px-5 py-3 text-sm font-black text-white shadow-xl shadow-blue-500/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {billingLoading ? "Opening billing..." : "Manage Billing"}
                    </button>
                  )}
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  {plans.map((plan) => {
                    const isCurrentPlan = currentPlanKey === plan.key;
                    const planMove =
                      currentPlanKey && !isCurrentPlan
                        ? planRank[plan.key] > planRank[currentPlanKey]
                          ? "Upgrade"
                          : "Downgrade"
                        : "Current";
                    return (
                      <div
                        key={plan.key}
                        className={`rounded-3xl border p-5 ${
                          isCurrentPlan ? "border-emerald-300/40 bg-emerald-400/10" : "border-white/10 bg-slate-950/60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-white">{plan.name}</p>
                            <p className="mt-1 text-2xl font-black">{plan.price}</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-black ${
                            isCurrentPlan ? "bg-emerald-400/15 text-emerald-200" : "bg-blue-500/15 text-blue-200"
                          }`}>
                            {isCurrentPlan ? "Current" : planMove}
                          </span>
                        </div>
                        <p className="mt-3 min-h-16 text-sm leading-6 text-slate-400">{plan.description}</p>
                        {access?.reason === "subscriber" ? (
                          <button
                            type="button"
                            onClick={handleManageBilling}
                            disabled={billingLoading || isCurrentPlan}
                            className="mt-5 w-full rounded-2xl border border-white/15 bg-slate-900 px-4 py-3 text-sm font-black text-slate-100 transition hover:border-blue-300/50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isCurrentPlan ? "Current Package" : `${planMove} in Billing`}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSubscribe(plan.key)}
                            disabled={checkoutPlan === plan.key}
                            className="mt-5 w-full rounded-2xl bg-[#1a6cf6] px-4 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {checkoutPlan === plan.key ? "Starting checkout..." : `Choose ${plan.name}`}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function FinancialHealthOverview({ onAskMetric }) {
  const scores = [
    ["Overall Health Score", "82 / 100", "Healthy"],
    ["Revenue Trend", "+12.4%", "Improving"],
    ["Profitability Score", "14.6%", "Positive"],
    ["Cash Score", "Stable", "$428K cash"],
  ];

  return (
    <div className="rounded-[2rem] border border-emerald-300/20 bg-emerald-400/10 p-8">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-200">Financial Health Score</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {scores.map(([label, value, detail]) => (
          <button key={label} type="button" onClick={() => onAskMetric(label)} className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 text-left transition hover:border-emerald-300/40">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-black text-white">{value}</p>
            <p className="mt-2 text-sm leading-6 text-emerald-100/80">{detail}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function OperationalDashboardSnapshot({ companyName, industryType, readOnly = false, onGenerate, generating = false, packageReady = false, onDownload }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-200">Pulse Insights</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.04em]">{companyName || "Executive financial intelligence"}</h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-300">
            Operational view focused on executive summary, health score, cash, revenue, profitability, risks, opportunities, and tasks.
            {industryType ? ` Industry context: ${industryType}.` : ""}
          </p>
        </div>
        {readOnly ? (
          <span className="rounded-2xl border border-white/10 bg-slate-800 px-5 py-3 text-sm font-black text-slate-300">
            Report generation disabled in read-only QA
          </span>
        ) : (
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={onGenerate} disabled={generating} className="rounded-2xl bg-[#FF7A1A] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60">
              {generating ? "Generating..." : "Generate Report"}
            </button>
            {packageReady && (
              <button type="button" onClick={onDownload} className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-slate-200">
                Download Report
              </button>
            )}
          </div>
        )}
      </div>

      {generating && (
        <div className="mt-5 rounded-2xl border border-[#FF7A1A]/25 bg-[#FF7A1A]/10 px-4 py-3 text-sm font-black text-[#FFD0AB]">
          Generating executive summary, KPI dashboard, sample Pulse commentary, and initial insights...
        </div>
      )}
      {packageReady && (
        <div className="mt-5 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 text-sm font-black text-emerald-100">
          Report ready. Pulse has identified 3 opportunities and 2 risks in your business.
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Health Score", "82 / 100", "Healthy with cash and margin items to monitor."],
          ["Cash", "$428K", "Stable near-term liquidity."],
          ["Revenue", "$1.8M", "Trending above the prior period."],
          ["Profitability", "14.6%", "Positive margin with expense discipline needed."],
        ].map(([label, value, detail]) => (
          <div key={label} className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-black text-white">{value}</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <DashboardFocusCard
          title="Pulse Executive Summary"
          items={[
            "Stable liquidity with positive revenue momentum.",
            "Profitability is healthy, but labor and overhead should stay under review.",
            "Collections concentration remains the most important near-term watch item.",
          ]}
        />
        <DashboardFocusCard
          title="Risks"
          items={[
            "AR concentration could pressure short-term cash.",
            "Vendor payment timing should stay aligned with receipts.",
            "Margin can soften if payroll and overhead move faster than revenue.",
          ]}
        />
        <DashboardFocusCard
          title="Opportunities & Tasks"
          items={[
            "Follow up on the top overdue customer balances.",
            "Review pricing and expense discipline for margin expansion.",
            "Confirm next weekly brief recipients and approval settings.",
          ]}
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-3xl border border-emerald-300/25 bg-emerald-400/10 p-6">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-200">Pulse Business Health Score</p>
          <p className="mt-3 text-5xl font-black text-white">82 / 100</p>
          <p className="mt-2 text-lg font-black text-emerald-100">Healthy</p>
          <p className="mt-3 text-sm leading-6 text-emerald-50/80">
            Pulse is taking the pulse of your business across cash, revenue, profitability, working capital, and industry operating drivers.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <PulseListCard title="Pulse Insights" items={pulseInsights} />
          <PulseListCard title="Pulse Alerts" items={pulseAlerts} />
          <PulseListCard title="Pulse Recommendations" items={pulseRecommendations} />
        </div>
      </div>
    </div>
  );
}

function ExecutiveQuestionBar({ question, onQuestionChange, onSubmit, messages = [], expanded = false, onCollapse, onUpgradePackage }) {
  const examples = [
    "I need to reduce expenses. Where should I start?",
    "Why is cash lower this month?",
    "What is causing margins to decline?",
    "What is my biggest financial risk?",
    "What should I focus on this month?",
    "What expenses seem unusually high?",
    "Which customers are most profitable?",
    "What should I do to improve cash flow?",
  ];
  const recentMessagePairs = [];
  const conversationMessages = messages.filter((message) => message.role === "user" || message.role === "advisacor");
  for (let index = 0; index < conversationMessages.length; index += 1) {
    const message = conversationMessages[index];
    if (message.role !== "user") continue;
    recentMessagePairs.unshift({
      question: message,
      answer: conversationMessages[index + 1]?.role === "advisacor" ? conversationMessages[index + 1] : null,
    });
  }

  return (
    <div className="rounded-[2rem] border border-[#FFB36F]/25 bg-[#FF7A1A]/10 p-6 shadow-2xl shadow-orange-500/5">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Ask Pulse Anything About Your Business</p>
      <div className="mt-4 flex flex-col gap-3 lg:flex-row">
        <input
          value={question}
          onChange={(event) => onQuestionChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSubmit();
          }}
          placeholder="Ask about cash, margins, expenses, customers, risk, or what to do next..."
          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-sm font-bold text-white outline-none focus:border-[#FFB36F]"
        />
        <button type="button" onClick={() => onSubmit()} className="rounded-2xl bg-[#FF7A1A] px-6 py-4 text-sm font-black text-white">
          Ask Pulse
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {examples.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => onSubmit(example)}
            className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-2 text-xs font-bold text-slate-200"
          >
            {example}
          </button>
        ))}
      </div>
      {expanded && (
        <div className="mt-5 rounded-3xl border border-white/10 bg-slate-950/70 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black text-white">Pulse response workspace</p>
            <button type="button" onClick={onCollapse} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-slate-300">
              Collapse
            </button>
          </div>
          <div className="mt-4 grid max-h-96 gap-3 overflow-y-auto">
            {recentMessagePairs.slice(0, 4).map((pair, index) => (
              <div key={`${pair.question.content}-${index}`} className="grid gap-3">
                <div className="ml-auto rounded-2xl bg-[#FF7A1A] px-4 py-3 text-sm leading-6 text-white">
                  <p className="text-xs font-black uppercase tracking-[0.14em] opacity-70">You</p>
                  <p className="mt-1 whitespace-pre-wrap">{pair.question.content}</p>
                </div>
                {pair.answer && (
                  <div className="mr-auto rounded-2xl bg-white/[0.06] px-4 py-3 text-sm leading-6 text-slate-200">
                    <p className="text-xs font-black uppercase tracking-[0.14em] opacity-70">Pulse</p>
                    <p className="mt-1 whitespace-pre-wrap">{pair.answer.content}</p>
                    {pair.answer.content.includes("not included in your current Advisacor package") && (
                      <button type="button" onClick={onUpgradePackage} className="mt-3 rounded-xl bg-[#FF7A1A] px-4 py-2 text-xs font-black text-white">
                        Upgrade Package
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ExecutiveInsightEngine({ insights, onAskMetric, compact = false }) {
  return (
    <div className={compact ? "rounded-[1.5rem] border border-white/10 bg-slate-950/40 p-5" : "rounded-[2rem] border border-white/10 bg-white/[0.04] p-8"}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-200">Executive Insight Engine</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.03em]">What Pulse found when you logged in</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-400">
          Pulse reviews historical trends, recurring issues, seasonality, and forecast movement to identify where executives should focus first.
        </p>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <ExecutiveInsightCard title="Top 3 Risks" items={insights.risks} onAskMetric={onAskMetric} />
        <ExecutiveInsightCard title="Top 3 Opportunities" items={insights.opportunities} onAskMetric={onAskMetric} />
        <ExecutiveInsightCard title="Top 3 Recommended Actions" items={insights.recommendedActions} onAskMetric={onAskMetric} />
      </div>
    </div>
  );
}

function ExecutiveInsightCard({ title, items, onAskMetric }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
      <p className="text-sm font-black uppercase tracking-[0.16em] text-[#FFB36F]">{title}</p>
      <div className="mt-4 grid gap-3">
        {items.map((item, index) => (
          <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm leading-6 text-slate-300">
                <span className="font-black text-white">{index + 1}.</span> {item}
              </p>
              <button
                type="button"
                onClick={() => onAskMetric(item)}
                className="shrink-0 rounded-xl border border-blue-300/20 bg-blue-400/10 px-3 py-2 text-xs font-black text-blue-100"
              >
                Ask Pulse
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PulseListCard({ title, items }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
      <p className="text-sm font-black uppercase tracking-[0.16em] text-[#FFB36F]">{title}</p>
      <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-300">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}

function FluxAnalysisWorkspace({ config, currentFluxLevel, message, onChange, onClose, onRun }) {
  const currentRank = fluxLevelRank[currentFluxLevel] || 1;
  const selectedType = fluxTypeOptions.find((option) => option.key === config.fluxType) || fluxTypeOptions[0];
  const toggleStatement = (statement) => {
    onChange((current) => {
      const exists = current.statements.includes(statement);
      const statements = exists ? current.statements.filter((item) => item !== statement) : [...current.statements, statement];
      return { ...current, statements: statements.length ? statements : ["Balance Sheet"] };
    });
  };
  const toggleCommentary = (option) => {
    onChange((current) => {
      const exists = current.commentaryOptions.includes(option);
      return {
        ...current,
        commentaryOptions: exists ? current.commentaryOptions.filter((item) => item !== option) : [...current.commentaryOptions, option],
      };
    });
  };

  return (
    <div className="rounded-[2rem] border border-[#FFB36F]/25 bg-[#0A1020] p-8 shadow-2xl shadow-orange-500/10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Flux Analysis Workspace</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">Configure the analysis before execution.</h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">
            Flux uses the same Balance Sheet and Income Statement source data included in the generated package, so the analysis reconciles back to the package.
          </p>
        </div>
        <button type="button" onClick={onClose} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-slate-200">
          Close
        </button>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Step 1</p>
          <h3 className="mt-2 text-xl font-black text-white">What Flux Analysis Would You Like To Perform?</h3>
          <div className="mt-4 grid gap-3">
            {fluxTypeOptions.map((option) => {
              const allowed = currentRank >= fluxLevelRank[option.minimumLevel];
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => allowed && onChange((current) => ({ ...current, fluxType: option.key }))}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-black ${
                    config.fluxType === option.key
                      ? "border-[#FF7A1A] bg-[#FF7A1A]/20 text-white"
                      : allowed
                        ? "border-white/10 bg-slate-950/60 text-slate-200"
                        : "border-white/5 bg-slate-950/30 text-slate-500"
                  }`}
                >
                  {option.label}
                  {!allowed && <span className="ml-2 text-xs text-[#FFB36F]">Upgrade required</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Step 2</p>
          <h3 className="mt-2 text-xl font-black text-white">Select Financial Statements To Analyze</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {fluxStatements.map((statement) => (
              <label key={statement} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm font-bold text-slate-200">
                <input type="checkbox" checked={config.statements.includes(statement)} onChange={() => toggleStatement(statement)} />
                {statement}
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Step 3</p>
          <h3 className="mt-2 text-xl font-black text-white">Materiality Thresholds</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-slate-300">
              Dollar Threshold
              <input value={config.dollarThreshold} onChange={(event) => onChange((current) => ({ ...current, dollarThreshold: event.target.value }))} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-300">
              Percentage Threshold
              <input value={config.percentageThreshold} onChange={(event) => onChange((current) => ({ ...current, percentageThreshold: event.target.value }))} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              ["dollar", "Dollar Threshold Only"],
              ["percentage", "Percentage Threshold Only"],
              ["both", "Both Thresholds"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => onChange((current) => ({ ...current, filteringLogic: key }))}
                className={`rounded-full px-4 py-2 text-xs font-black ${config.filteringLogic === key ? "bg-[#FF7A1A] text-white" : "border border-white/10 text-slate-300"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Step 4</p>
          <h3 className="mt-2 text-xl font-black text-white">AI Commentary Settings</h3>
          <label className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm font-bold text-slate-200">
            <input type="checkbox" checked={config.aiCommentaryEnabled} onChange={(event) => onChange((current) => ({ ...current, aiCommentaryEnabled: event.target.checked }))} />
            AI Commentary Enabled
          </label>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {fluxCommentaryOptions.map((option) => (
              <label key={option} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm font-bold text-slate-200">
                <input type="checkbox" checked={config.commentaryOptions.includes(option)} disabled={!config.aiCommentaryEnabled} onChange={() => toggleCommentary(option)} />
                {option}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-blue-300/20 bg-blue-400/10 p-5">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-200">Dashboard Flux View</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            ["Payroll Expense", "$45,000", "18%", "Payroll growth exceeded revenue growth by 6%."],
            ["Current FTE", "57", "+5", "Payroll cost per FTE is $4,250 versus $4,010 prior."],
            ["Accounts Receivable", "$19,500", "15.4%", "Working capital pressure increased with customer receivable growth."],
          ].map(([label, change, percent, note]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-black text-white">{change}</p>
              <p className="text-sm font-bold text-[#FFB36F]">{percent}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{note}</p>
            </div>
          ))}
        </div>
      </div>

      {message && <p className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100">{message}</p>}

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={() => onRun("pdf")} className="rounded-2xl bg-[#FF7A1A] px-5 py-3 text-sm font-black text-white">
          Generate PDF Flux Package
        </button>
        <button type="button" onClick={() => onRun("powerpoint")} className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-slate-200">
          Generate PowerPoint Flux Package
        </button>
        <button type="button" onClick={() => onRun("dashboard")} className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-slate-200">
          Generate Dashboard Flux View
        </button>
        <span className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-slate-400">
          Selected: {selectedType.label} | {config.statements.join(", ")}
        </span>
      </div>
    </div>
  );
}

function ExecutivePackageWizard({ config, generating, message, refreshStatus, onChange, onClose, onGenerate, periodLabel }) {
  const togglePowerPointSection = (section) => {
    onChange((current) => {
      const exists = current.powerPointSections.includes(section);
      return {
        ...current,
        powerPointSections: exists ? current.powerPointSections.filter((item) => item !== section) : [...current.powerPointSections, section],
      };
    });
  };

  return (
    <div className="rounded-[2rem] border border-[#FFB36F]/25 bg-[#0A1020] p-8 shadow-2xl shadow-orange-500/10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Generate Executive Reporting</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">Choose the package and reporting period.</h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">
            Advisacor refreshes current company data before generation so PDF and PowerPoint packages use the latest available financial information.
          </p>
        </div>
        <button type="button" onClick={onClose} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-slate-200">
          Close
        </button>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Package Type</p>
          <h3 className="mt-2 text-xl font-black text-white">What would you like to generate?</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["pdf", "Generate PDF Package", "Board-ready PDF package using current package configuration."],
              ["powerpoint", "Generate PowerPoint Package", "Board-ready PowerPoint with customizable content sections."],
            ].map(([key, label, description]) => (
              <button
                key={key}
                type="button"
                onClick={() => onChange((current) => ({ ...current, packageType: key }))}
                className={`rounded-2xl border p-4 text-left ${config.packageType === key ? "border-[#FF7A1A] bg-[#FF7A1A]/20" : "border-white/10 bg-slate-950/60"}`}
              >
                <p className="text-sm font-black text-white">{label}</p>
                <p className="mt-2 text-xs leading-5 text-slate-400">{description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Step 1</p>
          <h3 className="mt-2 text-xl font-black text-white">What reporting period would you like to generate?</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {executivePackagePeriodOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => onChange((current) => ({ ...current, reportingPeriod: option.key }))}
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-black ${
                  config.reportingPeriod === option.key ? "border-[#FF7A1A] bg-[#FF7A1A]/20 text-white" : "border-white/10 bg-slate-950/60 text-slate-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {config.reportingPeriod === "custom-date" && (
            <label className="mt-4 grid gap-2 text-sm font-bold text-slate-300">
              Custom Date
              <input type="date" value={config.customDate} onChange={(event) => onChange((current) => ({ ...current, customDate: event.target.value }))} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
            </label>
          )}
          <p className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm font-bold text-slate-300">Selected period: {periodLabel}</p>
        </div>
      </div>

      {config.packageType === "powerpoint" && (
        <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">PowerPoint Content</p>
          <h3 className="mt-2 text-xl font-black text-white">Include</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {executivePowerPointSections.map((section) => (
              <label key={section} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm font-bold text-slate-200">
                <input type="checkbox" checked={config.powerPointSections.includes(section)} onChange={() => togglePowerPointSection(section)} />
                {section}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 rounded-3xl border border-blue-300/20 bg-blue-400/10 p-5">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-200">Live Data Refresh</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {liveDataRefreshSources.map((source) => (
            <div key={source} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm font-bold text-slate-200">
              <span className={refreshStatus.includes(source) ? "text-emerald-200" : "text-slate-500"}>{refreshStatus.includes(source) ? "Refreshed" : "Pending"}</span>
              <span className="ml-2">{source}</span>
            </div>
          ))}
        </div>
      </div>

      {message && <p className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100">{message}</p>}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onGenerate(config.packageType || "pdf")}
          disabled={generating}
          className="rounded-2xl bg-[#FF7A1A] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {generating ? "Refreshing data..." : config.packageType === "powerpoint" ? "Generate PowerPoint" : "Generate PDF"}
        </button>
        <button type="button" onClick={() => onGenerate("pdf")} disabled={generating} className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-slate-200 disabled:cursor-not-allowed disabled:opacity-60">
          Generate PDF
        </button>
        <button type="button" onClick={() => onGenerate("powerpoint")} disabled={generating} className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-slate-200 disabled:cursor-not-allowed disabled:opacity-60">
          Generate PowerPoint
        </button>
      </div>
    </div>
  );
}

function ExploreDeeperActiveSection({
  sectionTitle,
  companyName,
  industryType,
  pulsePredictSnapshot,
  whatIfStrategy,
  onAskMetric,
  fluxConfig,
  currentFluxLevel,
  fluxWorkspaceMessage,
  onFluxChange,
  onFluxClose,
  onFluxRun,
  executivePackageConfig,
  executivePackageGenerating,
  executivePackageMessage,
  executivePackageRefreshStatus,
  onExecutivePackageChange,
  onExecutivePackageClose,
  onExecutivePackageGenerate,
  executivePackagePeriodLabel,
  advisoryIntelligence,
  onRefreshAdvisoryIntelligence,
  onRunAdvisoryIntelligence,
  onDismissAdvisoryPackage,
  onGenerateRecommendedPackage,
  onCloseSection,
}) {
  return (
    <section id="explore-deeper-active-section" className="scroll-mt-28">
      <div className="mb-3 flex justify-end">
        <button type="button" onClick={onCloseSection} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-2 text-xs font-black text-slate-300 transition hover:border-white/25 hover:text-white">
          Close Section
        </button>
      </div>
      {sectionTitle === "Pulse Insights" && <PulseInsightsShortcutSection />}
      {sectionTitle === "Pulse Predict" && <PulsePredictPanel snapshot={pulsePredictSnapshot} whatIfStrategy={whatIfStrategy} onAskMetric={onAskMetric} />}
      {sectionTitle === "Executive Package" && (
        <ExecutivePackageWizard
          config={executivePackageConfig}
          generating={executivePackageGenerating}
          message={executivePackageMessage}
          refreshStatus={executivePackageRefreshStatus}
          onChange={onExecutivePackageChange}
          onClose={onExecutivePackageClose}
          onGenerate={onExecutivePackageGenerate}
          periodLabel={executivePackagePeriodLabel}
        />
      )}
      {sectionTitle === "Flux Analysis" && (
        <FluxAnalysisWorkspace
          config={fluxConfig}
          currentFluxLevel={currentFluxLevel}
          message={fluxWorkspaceMessage}
          onChange={onFluxChange}
          onClose={onFluxClose}
          onRun={onFluxRun}
        />
      )}
      {sectionTitle === "Financial Statements" && <FinancialStatementsShortcutSection />}
      {sectionTitle === "Pulse Advisory Intelligence" && (
        <PulseAdvisoryIntelligencePanel
          intelligence={advisoryIntelligence}
          onRefresh={onRefreshAdvisoryIntelligence}
          onRun={onRunAdvisoryIntelligence}
          onDismiss={onDismissAdvisoryPackage}
          onGeneratePackage={onGenerateRecommendedPackage}
        />
      )}
      {sectionTitle === "Cash Flow" && <CashFlowShortcutSection />}
      {sectionTitle === "Profitability" && <ProfitabilityShortcutSection />}
      {sectionTitle === "Payroll & Labor" && <PayrollLaborShortcutSection />}
      {sectionTitle === "AR / AP Intelligence" && <ArApShortcutSection />}
      {sectionTitle === "Industry Insights" && <IndustryIntelligenceDashboard industryType={industryType} onAskMetric={onAskMetric} />}
      {!["Pulse Insights", "Pulse Predict", "Executive Package", "Flux Analysis", "Financial Statements", "Pulse Advisory Intelligence", "Cash Flow", "Profitability", "Payroll & Labor", "AR / AP Intelligence", "Industry Insights"].includes(sectionTitle) && (
        <OperationalDashboardSnapshot companyName={companyName} industryType={industryType} readOnly />
      )}
    </section>
  );
}

function PulseInsightsShortcutSection() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-200">Pulse Insights</p>
      <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">Executive analysis is ready.</h2>
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <DashboardFocusCard title="Executive Summary" items={["Stable liquidity with positive revenue momentum.", "Profitability is healthy, but labor and overhead should stay under review.", "Collections concentration remains the most important near-term watch item."]} />
        <DashboardFocusCard title="Top 3 Risks" items={["AR concentration could pressure short-term cash.", "Vendor payment timing should stay aligned with receipts.", "Margin can soften if payroll and overhead move faster than revenue."]} />
        <DashboardFocusCard title="Top 3 Opportunities" items={["Improve collections cadence on larger customer balances.", "Expand margin through pricing and expense discipline.", "Use Pulse Predict before approving new recurring costs."]} />
        <DashboardFocusCard title="Top 3 Recommended Actions" items={["Follow up on overdue customer balances.", "Review payroll and overhead movement against revenue.", "Confirm next weekly brief recipients and approval settings."]} />
        <DashboardFocusCard title="Key Alerts" items={pulseAlerts} />
        <DashboardFocusCard title="Priority Focus Areas" items={["Cash timing", "Collections quality", "Margin protection", "Payroll productivity"]} />
      </div>
    </div>
  );
}

function severityClass(severity) {
  if (severity === "critical") return "border-red-300/30 bg-red-500/10 text-red-100";
  if (severity === "high") return "border-amber-300/30 bg-amber-400/10 text-amber-100";
  if (severity === "medium") return "border-blue-300/30 bg-blue-400/10 text-blue-100";
  return "border-slate-300/20 bg-slate-400/10 text-slate-100";
}

function PulseAdvisoryIntelligencePanel({ intelligence, onRefresh, onRun, onDismiss, onGeneratePackage }) {
  const signals = intelligence?.signals || [];
  const recommendations = intelligence?.recommendations || [];
  const packageQueue = intelligence?.packageQueue || [];
  const highPriority = signals.some((signal) => ["high", "critical"].includes(signal.severity));
  const recommendationBySignal = new Map(recommendations.map((recommendation) => [recommendation.signal_id, recommendation]));

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-200">Pulse Advisory Intelligence</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">Autonomous advisory review queue.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Advisacor monitors connected company data for meaningful changes and prepares recommendations for review. Nothing is sent or shared externally without approval.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onRefresh} disabled={intelligence?.loading} className="rounded-2xl border border-white/10 px-4 py-2 text-xs font-black text-slate-200 disabled:opacity-50">
            Refresh
          </button>
          <button type="button" onClick={onRun} disabled={intelligence?.loading} className="rounded-2xl bg-[#FF7A1A] px-4 py-2 text-xs font-black text-white disabled:opacity-50">
            {intelligence?.loading ? "Running..." : "Run Intelligence"}
          </button>
        </div>
      </div>

      {highPriority && (
        <p className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-100">
          Advisacor detected changes that may require advisor review. A recommended package is available.
        </p>
      )}
      {intelligence?.message && <p className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100">{intelligence.message}</p>}
      {intelligence?.error && <p className="mt-5 rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-100">{intelligence.error}</p>}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-4">
          {signals.length ? signals.slice(0, 6).map((signal) => {
            const recommendation = recommendationBySignal.get(signal.id);
            return (
              <div key={signal.id} className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${severityClass(signal.severity)}`}>{signal.severity}</span>
                    <h3 className="mt-3 text-lg font-black text-white">{signal.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{signal.description}</p>
                  </div>
                  <button type="button" onClick={() => onRefresh()} className="rounded-2xl border border-white/10 px-3 py-2 text-xs font-black text-slate-200">
                    Review recommendation
                  </button>
                </div>
                {recommendation && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-sm font-black text-white">{recommendation.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{recommendation.summary}</p>
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
              <p className="text-sm font-black text-white">No new advisory signals loaded.</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">Run advisory intelligence or refresh after data sync to review signals.</p>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-200">Recommended Packages</p>
          <div className="mt-4 grid gap-3">
            {packageQueue.length ? packageQueue.slice(0, 5).map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-black text-white">{String(item.package_type || "").replaceAll("_", " ")}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{item.status}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">Recommended period: {item.recommended_period || "review period"}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => onGeneratePackage(item)} className="rounded-2xl bg-[#FF7A1A] px-3 py-2 text-xs font-black text-white">
                    Generate recommended package
                  </button>
                  <button type="button" onClick={() => onDismiss(item)} className="rounded-2xl border border-white/10 px-3 py-2 text-xs font-black text-slate-200">
                    Dismiss
                  </button>
                </div>
              </div>
            )) : (
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-400">
                No package recommendations are pending review.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FinancialStatementsShortcutSection() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-200">Financial Statements</p>
      <h2 className="mt-3 text-3xl font-black text-white">Balance Sheet and Income Statement snapshot.</h2>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <DashboardFocusCard title="Balance Sheet" items={["Cash: $428K", "Accounts Receivable: $146K", "Net Fixed Assets: $565K", "Total Assets: $1.079M"]} />
        <DashboardFocusCard title="Income Statement" items={["Current month revenue: $824K", "Profitability: 14.6%", "Current month net income: $269.9K", "Gross margin assumption: 42%"]} />
      </div>
    </div>
  );
}

function CashFlowShortcutSection() {
  return <ShortcutMetricSection title="Cash Flow" summary="Cash remains stable, with collections timing and payroll/vendor payments as the key watch items." cards={[["Cash Balance", "$428K", "Stable near-term liquidity."], ["AR Exposure", "$146K", "Collections timing is the largest cash sensitivity."], ["AP Exposure", "$78K", "Vendor timing should stay aligned with receipts."]]} />;
}

function ProfitabilityShortcutSection() {
  return <ShortcutMetricSection title="Profitability" summary="Profitability is positive, but margin protection depends on labor, overhead, and pricing discipline." cards={[["Profitability", "14.6%", "Positive margin with expense discipline needed."], ["Net Income", "$269.9K", "Current period earnings support scenario capacity."], ["Margin Focus", "Labor + overhead", "Watch costs moving faster than revenue."]]} />;
}

function PayrollLaborShortcutSection() {
  return <ShortcutMetricSection title="Payroll & Labor" summary="Payroll analysis is populated with FTE and productivity context for scenario planning." cards={[["Current FTE", "57", "Prior FTE was 52."], ["Payroll Cost Per FTE", "$4,250", "Prior payroll cost per FTE was $4,010."], ["Revenue Per FTE", "$14,456", "Use before approving additional hiring."]]} />;
}

function ArApShortcutSection() {
  return <ShortcutMetricSection title="AR / AP Intelligence" summary="Working capital analysis is focused on collections, payable timing, and cash conversion." cards={[["Accounts Receivable", "$146K", "Monitor concentration and aging movement."], ["Accounts Payable", "$78K", "Manage vendor timing against receipts."], ["Working Capital", "$330K", "Healthy, but sensitive to collections speed."]]} />;
}

function ShortcutMetricSection({ title, summary, cards }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-200">{title}</p>
      <h2 className="mt-3 text-3xl font-black text-white">{summary}</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {cards.map(([label, value, detail]) => (
          <MetricTile key={label} label={label} value={value} detail={detail} />
        ))}
      </div>
    </div>
  );
}

function SimplifiedFeatureCards({ onExploreSection }) {
  const cards = [
    ["Pulse Insights", "Review executive summary, risks, opportunities, alerts, and recommendations."],
    ["Pulse Advisory Intelligence", "Review detected signals, recommendations, and package suggestions."],
    ["Pulse Predict", "Forecasts, scenarios, and what-if analysis."],
    ["Executive Package", "Generate PDF and PowerPoint reporting packages."],
    ["Flux Analysis", "Generate a separate variance report with account-level commentary."],
    ["Financial Statements", "View P&L, Balance Sheet, and Cash Flow insights."],
    ["Cash Flow", "Review cash trends, runway, and risks."],
    ["Profitability", "Analyze margin trends and profit drivers."],
    ["Payroll & Labor", "Review payroll trends and staffing impact."],
    ["AR / AP Intelligence", "Review receivables, payables, and working capital."],
    ["Industry Insights", "View industry-specific metrics."],
  ];

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-200">Explore Deeper</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(([title, description]) => (
          <button
            key={title}
            type="button"
            onClick={() => onExploreSection(title)}
            className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-left transition hover:border-[#FF7A1A]/50"
          >
            <p className="text-base font-black text-white">{title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function PulseCfoMemoryPanel({ memory, onAskMetric }) {
  const timeline = memory.timeline?.length ? memory.timeline : buildPulseMemoryTimeline(demoPulseInsightMemory);
  const [selectedInsightId, setSelectedInsightId] = useState(timeline[0]?.id || "");
  const selectedInsight = timeline.find((item) => item.id === selectedInsightId) || timeline[0];
  const score = memory.score || buildPulseMemoryScore(timeline);

  return (
    <div className="rounded-[2rem] border border-violet-300/20 bg-violet-400/10 p-8 shadow-2xl shadow-violet-500/5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-violet-200">Pulse CFO Memory</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.03em]">Pulse remembers what it identified, recommended, and tracked.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Persistent insight memory lets Pulse act like a CFO that has worked with the company over time, not a stateless chatbot.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onAskMetric("what concerns you most based on prior Pulse memory")}
          className="rounded-2xl bg-violet-300 px-5 py-3 text-sm font-black text-[#170826]"
        >
          Ask Pulse About Memory
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MemoryScoreCard label="Issues Resolved" value={score.issuesResolved} />
        <MemoryScoreCard label="Open Risks" value={score.openRisks} />
        <MemoryScoreCard label="Potential Annual Savings" value={`$${Number(score.potentialAnnualSavings || 0).toLocaleString()}`} />
        <MemoryScoreCard label="Revenue Opportunity" value={`$${Number(score.potentialRevenueOpportunity || 0).toLocaleString()}`} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
          <p className="text-sm font-black text-white">Executive Timeline</p>
          <div className="mt-4 grid gap-3">
            {timeline.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setSelectedInsightId(item.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  selectedInsight?.id === item.id
                    ? "border-violet-200/60 bg-violet-300/15"
                    : "border-white/10 bg-[#0A1020] hover:border-white/25"
                }`}
              >
                <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-200">{item.month}</p>
                <p className="mt-1 text-sm font-black text-white">{item.label}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {item.current_trend} | {item.status} | {item.severity}
                </p>
              </button>
            ))}
          </div>
        </div>

        {selectedInsight && (
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-violet-300/15 px-3 py-1 text-xs font-black text-violet-100">{selectedInsight.insight_category}</span>
              <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-black text-slate-300">{selectedInsight.current_trend}</span>
              <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-black text-slate-300">{selectedInsight.status}</span>
            </div>
            <h3 className="mt-5 text-2xl font-black text-white">{selectedInsight.description}</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#0A1020] p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Financial Impact</p>
                <p className="mt-2 text-lg font-black text-white">
                  {selectedInsight.financial_impact_label || `$${Number(selectedInsight.financial_impact || 0).toLocaleString()}`}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0A1020] p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Current Status</p>
                <p className="mt-2 text-lg font-black capitalize text-white">{String(selectedInsight.current_trend || "monitoring").replace(/_/g, " ")}</p>
              </div>
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-[#0A1020] p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Original Recommendation</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{selectedInsight.recommended_action}</p>
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-[#0A1020] p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Follow-up Notes</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{selectedInsight.follow_up_notes}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MemoryScoreCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function PulsePredictPanel({ snapshot, whatIfStrategy, onAskMetric }) {
  return (
    <div className="rounded-[2rem] border border-cyan-300/20 bg-cyan-400/10 p-8 shadow-2xl shadow-cyan-500/5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-200">{snapshot.moduleName}</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">Predictive analytics for the next 30-90 days</h2>
          <p className="mt-3 max-w-3xl leading-7 text-slate-300">
            Pulse automatically explains revenue, EBITDA, cash, payroll, risk, and opportunity forecasts in plain English.
            {snapshot.industryType ? ` Industry model: ${snapshot.industryType}.` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onAskMetric("biggest risks over the next 90 days")}
          className="rounded-2xl border border-cyan-200/30 bg-cyan-300/10 px-5 py-3 text-sm font-black text-cyan-100"
        >
          Ask Pulse About Forecast
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {snapshot.forecasts.map((forecast) => (
          <div key={forecast.label} className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{forecast.label}</p>
                <p className="mt-3 text-3xl font-black text-white">{forecast.value}</p>
                <p className="mt-1 text-sm font-black text-cyan-100">{forecast.trend}</p>
              </div>
              <button
                type="button"
                onClick={() => onAskMetric(forecast.label)}
                className="rounded-xl border border-cyan-200/20 px-3 py-2 text-xs font-black text-cyan-100"
              >
                Ask Pulse
              </button>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">{forecast.explanation}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.85fr]">
        <PulseListCard title="Predictive Alerts" items={snapshot.alerts} />
        <PulseListCard title="Industry Models" items={snapshot.industryModels} />
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/70 p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#FFB36F]">Predictive Alert Center</p>
            <h3 className="mt-2 text-2xl font-black text-white">Explanation, impact, and recommended action</h3>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-400">
            Every alert includes plain-English context and can be sent to Pulse for follow-up.
          </p>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {snapshot.predictiveAlerts.map((alert) => (
            <div key={alert.title} className="rounded-3xl border border-white/10 bg-[#0A1020] p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-lg font-black text-white">{alert.title}</p>
                <button
                  type="button"
                  onClick={() => onAskMetric(alert.title)}
                  className="rounded-xl border border-cyan-200/20 px-3 py-2 text-xs font-black text-cyan-100"
                >
                  Ask Pulse
                </button>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                <span className="font-black text-slate-100">Explanation:</span> {alert.explanation}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                <span className="font-black text-slate-100">Financial impact:</span> {alert.financialImpact}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                <span className="font-black text-slate-100">Recommended action:</span> {alert.recommendedAction}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {snapshot.scores.map((score) => (
            <div key={score.label} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{score.label}</p>
              <p className="mt-3 text-3xl font-black text-white">{score.value}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">{score.explanation}</p>
            </div>
          ))}
        </div>
      </div>

      {whatIfStrategy && (
        <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/70 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#FFB36F]">What-If Scenario Modeling</p>
              <h3 className="mt-2 text-2xl font-black text-white">{whatIfStrategy.label}</h3>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                Pulse can build scenarios from natural language and explain estimated profit, cash, EBITDA, and KPI impact in plain English.
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-200/20 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100">
              {whatIfStrategy.limits.join(" | ")}
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <PulseListCard title="Scenario Inputs" items={whatIfStrategy.inputs} />
            <PulseListCard title="Scenario Outputs" items={whatIfStrategy.outputs} />
            <PulseListCard title="Example Questions" items={whatIfStrategy.examples} />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {whatIfScenarioExamples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => onAskMetric(example)}
                className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-slate-200"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardFocusCard({ title, items }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
      <p className="text-sm font-black uppercase tracking-[0.16em] text-[#FFB36F]">{title}</p>
      <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-300">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}

function MetricTile({ label, value, detail, onAskMetric }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-black text-white">{value}</p>
        </div>
        {onAskMetric && (
          <button
            type="button"
            onClick={() => onAskMetric(label)}
            className="rounded-xl border border-blue-300/20 bg-blue-400/10 px-3 py-2 text-xs font-black text-blue-100"
          >
            Ask Pulse
          </button>
        )}
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
    </div>
  );
}

function IndustryIntelligenceDashboard({ industryType, onAskMetric }) {
  if (industryType === "Construction") return <ConstructionDashboard onAskMetric={onAskMetric} />;
  if (industryType === "Healthcare") return <HealthcareDashboard onAskMetric={onAskMetric} />;
  if (industryType === "Manufacturing") return <ManufacturingDashboard onAskMetric={onAskMetric} />;
  if (industryType === "Wholesale Distribution") return <WholesaleDashboard onAskMetric={onAskMetric} />;
  if (industryType === "Professional Services") return <ProfessionalServicesDashboard onAskMetric={onAskMetric} />;

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-200">Industry Intelligence</p>
      <h2 className="mt-3 text-3xl font-black">Operational intelligence will adapt as industry data becomes available.</h2>
      <p className="mt-3 max-w-3xl leading-7 text-slate-300">
        Advisacor combines core financial intelligence with industry-specific KPIs, commentary, and recommendations.
      </p>
    </div>
  );
}

function ConstructionDashboard({ onAskMetric }) {
  const jobs = [
    ["Riverfront Medical Buildout", "$1.8M", "$1.1M", "$420K", "22.4%", "67%", "$96K", "$28K", "$42K", "$0", "Watch"],
    ["North Ridge Warehouse", "$2.4M", "$1.5M", "$610K", "24.8%", "71%", "$122K", "$45K", "$0", "$38K", "Healthy"],
    ["Civic Center Renovation", "$950K", "$760K", "$260K", "11.8%", "79%", "$54K", "$19K", "$0", "$72K", "Risk"],
  ];

  return (
    <IndustryShell title="Construction Intelligence Dashboard" subtitle="Contract performance, retainage exposure, job profitability, and backlog trends.">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricTile label="Total Retainage" value="$218K" detail="Receivable retainage is concentrated in two active jobs." onAskMetric={onAskMetric} />
        <MetricTile label="WIP Summary" value="$110K under" detail="Under billing requires review before the next draw cycle." onAskMetric={onAskMetric} />
        <MetricTile label="Backlog" value="$3.9M" detail="Backlog supports near-term revenue visibility." onAskMetric={onAskMetric} />
        <MetricTile label="Contract Margin Trends" value="19.7%" detail="Margin is stable but one renovation job is pressuring results." onAskMetric={onAskMetric} />
      </div>
      <div className="mt-6 overflow-x-auto rounded-3xl border border-white/10">
        <table className="min-w-[1200px] w-full text-left text-sm">
          <thead className="bg-slate-950/80 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>{["Job Name", "Contract Value", "Cost Incurred", "Estimated Remaining Cost", "Gross Margin", "Percent Complete", "Retainage Receivable", "Retainage Payable", "Over Billing", "Under Billing", "Status"].map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {jobs.map((job) => (
              <tr key={job[0]} className="bg-slate-950/35">
                {job.map((cell) => <td key={`${job[0]}-${cell}`} className="px-4 py-4 font-bold text-slate-300">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <IndustryCommentary items={["Retainage exposure is manageable but should be reviewed before vendor timing tightens.", "Top risk job is Civic Center Renovation due to under billing and lower margin.", "Backlog remains healthy and supports near-term revenue planning."]} />
    </IndustryShell>
  );
}

function HealthcareDashboard({ onAskMetric }) {
  return (
    <IndustryShell title="Patient Day Intelligence Dashboard" subtitle="Healthcare operating economics with per patient day trends and workforce modeling.">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricTile label="Revenue Per Patient Day" value="$712" detail="Improved despite flat census levels." onAskMetric={onAskMetric} />
        <MetricTile label="Expense Per Patient Day" value="$548" detail="Operating expenses remain within the expected range." onAskMetric={onAskMetric} />
        <MetricTile label="Labor Cost Per Patient Day" value="$185" detail="Labor cost is the key staffing sensitivity." onAskMetric={onAskMetric} />
        <MetricTile label="Contract Labor Per Patient Day" value="$42" detail="Agency usage is elevated versus target." onAskMetric={onAskMetric} />
        <MetricTile label="Average Daily Census" value="118" detail="Stable volume supports comparable PPD analysis." onAskMetric={onAskMetric} />
        <MetricTile label="Occupancy" value="86%" detail="Occupancy is healthy but staffing mix needs review." onAskMetric={onAskMetric} />
      </div>
      <WorkforceModeling onAskMetric={onAskMetric} />
    </IndustryShell>
  );
}

function WorkforceModeling({ onAskMetric }) {
  const currentLaborPpd = 185;
  const addedNurses = 2;
  const projectedLaborPpd = 198;
  const dollarImpact = projectedLaborPpd - currentLaborPpd;
  const percentImpact = ((dollarImpact / currentLaborPpd) * 100).toFixed(1);

  return (
    <div className="mt-6 rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-200">What If Workforce Modeling</p>
          <h3 className="mt-2 text-2xl font-black">Add 2 Nurses</h3>
          <p className="mt-2 text-sm leading-6 text-emerald-50/80">Simulates adding nurses, CNAs, therapists, or other staff positions against patient day economics.</p>
        </div>
        <button type="button" onClick={() => onAskMetric("Labor Cost Per Patient Day workforce model")} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-white">
          Ask Pulse
        </button>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <MetricTile label="Current Labor PPD" value={`$${currentLaborPpd}`} detail="Current labor cost per patient day." />
        <MetricTile label="Projected Labor PPD" value={`$${projectedLaborPpd}`} detail="Projected after adding staff." />
        <MetricTile label="Dollar Impact" value={`+$${dollarImpact}`} detail={`${addedNurses} nurses added to staffing model.`} />
        <MetricTile label="Percentage Impact" value={`+${percentImpact}%`} detail="Projected increase in labor PPD." />
      </div>
    </div>
  );
}

function ManufacturingDashboard({ onAskMetric }) {
  return (
    <IndustryShell title="Manufacturing Intelligence Dashboard" subtitle="Production efficiency, inventory intelligence, and margin performance.">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["BOM Variance", "3.8%", "Material standards are slightly unfavorable."],
          ["Bill of Labor Variance", "2.1%", "Labor routing variance is controlled."],
          ["PPV", "$42K", "Purchase price variance is pressuring margin."],
          ["Labor Efficiency Variance", "1.7%", "Efficiency remains near target."],
          ["Material Usage Variance", "4.4%", "Usage variance needs production review."],
          ["Yield %", "94.8%", "Yield is stable."],
          ["Scrap %", "2.6%", "Scrap is above target."],
          ["Rework %", "1.9%", "Rework is manageable but trending up."],
        ].map(([label, value, detail]) => <MetricTile key={label} label={label} value={value} detail={detail} onAskMetric={onAskMetric} />)}
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <DashboardFocusCard title="Inventory Intelligence" items={["Raw material turns: 5.4x", "WIP: $640K", "Finished goods turns: 4.1x", "Obsolete inventory: $82K", "Slow moving inventory: $146K"]} />
        <DashboardFocusCard title="Profitability" items={["Job profitability is strongest in repeat production runs.", "Product profitability is pressured by PPV and scrap.", "Margin trends are stable but material costs need review."]} />
      </div>
      <IndustryCommentary items={["PPV is the primary material cost driver this period.", "Labor performance is stable, but scrap and rework should be reviewed with production leadership.", "Inventory concerns are concentrated in slow moving finished goods."]} />
    </IndustryShell>
  );
}

function WholesaleDashboard({ onAskMetric }) {
  return (
    <IndustryShell title="Wholesale Distribution Intelligence Dashboard" subtitle="Inventory velocity, stock exposure, margin by product group, and working capital.">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Inventory Turns", "6.2x", "Velocity is healthy but varies by product group."],
          ["DIO", "58 days", "Days inventory outstanding is slightly elevated."],
          ["Inventory Aging", "$410K", "Aged inventory needs review."],
          ["Dead Inventory", "$96K", "Dead stock creates carrying-cost risk."],
          ["Stockout Risk", "Medium", "Three product groups need reorder review."],
          ["Vendor Concentration", "41%", "Top two vendors drive supply exposure."],
          ["Margin By Product Group", "22.8%", "Margin compression appears in commodity lines."],
          ["Working Capital", "$1.2M", "Cash conversion cycle should be monitored."],
        ].map(([label, value, detail]) => <MetricTile key={label} label={label} value={value} detail={detail} onAskMetric={onAskMetric} />)}
      </div>
    </IndustryShell>
  );
}

function ProfessionalServicesDashboard({ onAskMetric }) {
  return (
    <IndustryShell title="Professional Services Intelligence Dashboard" subtitle="Utilization, realization, labor leverage, and project margin.">
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Revenue Per Employee", "$184K", "Revenue productivity is healthy."],
          ["Revenue Per FTE", "$196K", "FTE-adjusted revenue is trending up."],
          ["Utilization %", "74%", "Billable utilization is below target."],
          ["Realization %", "91%", "Discounting and write-downs are controlled."],
          ["Labor Leverage", "3.1x", "Manager-to-staff leverage is improving."],
          ["Project Margin %", "28%", "Project profitability is strong with staffing discipline."],
        ].map(([label, value, detail]) => <MetricTile key={label} label={label} value={value} detail={detail} onAskMetric={onAskMetric} />)}
      </div>
    </IndustryShell>
  );
}

function IndustryShell({ title, subtitle, children }) {
  return (
    <div className="rounded-[2rem] border border-blue-300/20 bg-blue-500/10 p-8">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Industry Intelligence</p>
      <h2 className="mt-3 text-3xl font-black">{title}</h2>
      <p className="mt-3 max-w-3xl leading-7 text-slate-300">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function IndustryCommentary({ items }) {
  return (
    <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/60 p-5">
      <p className="text-sm font-black uppercase tracking-[0.16em] text-[#FFB36F]">Executive Commentary</p>
      <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-300">
        {items.map((item) => <li key={item}>- {item}</li>)}
      </ul>
    </div>
  );
}

function DashboardAiLauncher({ open, onOpenChange, question, onQuestionChange, messages, onSubmit, context }) {
  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="fixed bottom-5 right-5 z-50 rounded-full bg-[#FF7A1A] px-5 py-4 text-sm font-black text-white shadow-2xl shadow-black/40"
      >
        Ask Pulse
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-50 flex max-h-[78vh] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1220] shadow-2xl shadow-black/50">
          <div className="border-b border-white/10 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#FFB36F]">Pulse</p>
                <h3 className="mt-2 text-2xl font-black text-white">Your business intelligence assistant</h3>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Context: {context.companyName} | {context.industryType} | {context.packageName}
                </p>
              </div>
              <button type="button" onClick={() => onOpenChange(false)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-slate-200">
                Close
              </button>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`rounded-3xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "ml-auto bg-[#FF7A1A] text-white" : "mr-auto bg-white/[0.06] text-slate-200"}`}>
                {message.content}
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {defaultAiQuestions.slice(0, 5).map((item) => (
                <button key={item} type="button" onClick={() => onSubmit(item)} className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-slate-300">
                  {item}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={question}
                onChange={(event) => onQuestionChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onSubmit();
                }}
                placeholder="Ask about forecasts, cash, profit, staffing, margin..."
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none"
              />
              <button type="button" onClick={() => onSubmit()} className="rounded-2xl bg-[#FF7A1A] px-4 py-3 text-sm font-black text-white">
                Ask
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
