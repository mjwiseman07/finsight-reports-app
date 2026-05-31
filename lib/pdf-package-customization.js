import { getProductTier, normalizeProductTierKey, productTierRank } from "./product-tiers";
import { buildFixedAssetRollForward } from "./fixed-asset-roll-forward";

export const pdfPackageReportCatalog = {
  income_statement_summary: {
    title: "Basic Income Statement Summary",
    minTier: "pulse_starter",
    placement: "financial_statements",
    aliases: ["income statement", "profit and loss", "p&l", "pnl"],
  },
  cash_summary: {
    title: "Cash Summary",
    minTier: "pulse_starter",
    placement: "financial_statements",
    aliases: ["cash summary", "cash balance", "cash"],
  },
  revenue_trend: {
    title: "Revenue Trend",
    minTier: "pulse_starter",
    placement: "supporting_schedules",
    aliases: ["revenue trend", "sales trend", "revenue"],
  },
  expense_trend: {
    title: "Expense Trend",
    minTier: "pulse_starter",
    placement: "supporting_schedules",
    aliases: ["expense trend", "expenses"],
  },
  cash_flow_summary: {
    title: "Cash Flow Summary",
    minTier: "pulse_pro",
    placement: "supporting_schedules",
    aliases: ["cash flow summary", "cash flow"],
  },
  payroll_summary: {
    title: "Payroll Summary",
    minTier: "pulse_pro",
    placement: "supporting_schedules",
    aliases: ["payroll analysis", "payroll summary", "staffing analysis"],
  },
  budget_vs_actual: {
    title: "Budget vs Actual",
    minTier: "pulse_pro",
    placement: "supporting_schedules",
    aliases: ["budget vs actual", "budget actual", "variance to budget"],
  },
  revenue_by_customer: {
    title: "Revenue by Customer",
    minTier: "pulse_pro",
    placement: "supporting_schedules",
    aliases: ["revenue by customer", "sales by customer", "customer revenue"],
  },
  expense_by_vendor: {
    title: "Expense by Vendor",
    minTier: "pulse_pro",
    placement: "supporting_schedules",
    aliases: ["expense by vendor", "expenses by vendor", "vendor expense"],
  },
  basic_fixed_asset_roll_forward: {
    title: "Basic Fixed Asset Roll-Forward",
    minTier: "pulse_pro",
    placement: "supporting_schedules",
    aliases: ["basic fixed asset roll-forward", "basic fixed asset rollforward"],
    generator: "fixed_asset_roll_forward",
  },
  fixed_asset_roll_forward: {
    title: "Fixed Asset Roll-Forward",
    minTier: "advisacor_professional",
    placement: "supporting_schedules",
    aliases: ["fixed asset roll-forward", "fixed asset rollforward", "fixed assets", "asset roll-forward", "asset rollforward"],
    generator: "fixed_asset_roll_forward",
  },
  flux_analysis: {
    title: "Flux Analysis",
    minTier: "advisacor_professional",
    placement: "board_package",
    aliases: ["flux analysis", "variance analysis"],
  },
  ar_aging_commentary: {
    title: "AR Aging Commentary",
    minTier: "advisacor_professional",
    placement: "supporting_schedules",
    aliases: ["ar aging commentary", "accounts receivable aging", "receivables commentary"],
  },
  ap_aging_commentary: {
    title: "AP Aging Commentary",
    minTier: "advisacor_professional",
    placement: "supporting_schedules",
    aliases: ["ap aging commentary", "accounts payable aging", "payables commentary"],
  },
  department_reporting: {
    title: "Department Reporting",
    minTier: "advisacor_professional",
    placement: "supporting_schedules",
    aliases: ["department reporting", "department schedule"],
  },
  kpi_schedules: {
    title: "KPI Schedules",
    minTier: "advisacor_professional",
    placement: "supporting_schedules",
    aliases: ["kpi schedule", "kpi schedules"],
  },
  board_package_sections: {
    title: "Board Package Sections",
    minTier: "advisacor_professional",
    placement: "board_package",
    aliases: ["board package section", "board package sections"],
  },
  strategic_commentary: {
    title: "Strategic Commentary",
    minTier: "advisacor_cfo",
    placement: "executive_summary",
    aliases: ["strategic commentary", "strategy commentary"],
  },
  forecast_schedules: {
    title: "Forecast Schedules",
    minTier: "advisacor_cfo",
    placement: "supporting_schedules",
    aliases: ["forecast schedule", "forecast schedules"],
  },
  scenario_analysis: {
    title: "Scenario Analysis",
    minTier: "advisacor_cfo",
    placement: "supporting_schedules",
    aliases: ["scenario analysis", "what-if schedule", "what if schedule"],
  },
  capital_planning_schedules: {
    title: "Capital Planning Schedules",
    minTier: "advisacor_cfo",
    placement: "supporting_schedules",
    aliases: ["capital planning", "capital planning schedule", "capex planning"],
  },
  advanced_fixed_asset_roll_forward: {
    title: "Advanced Fixed Asset Roll-Forward",
    minTier: "advisacor_cfo",
    placement: "supporting_schedules",
    aliases: ["advanced fixed asset roll-forward", "advanced fixed asset rollforward"],
    generator: "fixed_asset_roll_forward",
  },
  executive_scorecards: {
    title: "Executive Scorecards",
    minTier: "advisacor_cfo",
    placement: "board_package",
    aliases: ["executive scorecard", "executive scorecards"],
  },
  custom_appendix_schedules: {
    title: "Custom Appendix Schedules",
    minTier: "advisacor_cfo",
    placement: "appendix",
    aliases: ["custom appendix", "appendix schedule", "custom appendix schedule"],
  },
};

export const customerPackageCustomizationControl = {
  customerEntryPoint: "dashboard_pulse_input",
  customerManualTemplateEditing: false,
  allowedCustomerActions: ["view_generated_packages", "download_generated_packages", "request_changes_through_pulse"],
  superAdminInternalControlsRetained: true,
};

const packageRequestWords = ["add", "include", "create", "build", "insert", "customize", "remove", "exclude", "pdf", "powerpoint", "ppt", "deck", "package", "board package", "board deck", "financial package"];
const fixedAssetQuestionWords = [
  "fixed assets were added",
  "net book value",
  "depreciation",
  "asset additions",
  "fixed asset additions",
  "assets added this year",
  "step-up",
  "step up",
  "step-down",
  "step down",
  "valuation adjustment",
];

function isStepUpStepDownRequest(question) {
  const normalized = String(question || "").toLowerCase();
  return (
    (normalized.includes("step-up") || normalized.includes("step up")) &&
    (normalized.includes("step-down") || normalized.includes("step down")) &&
    normalized.includes("roll")
  );
}

export function detectPackageType(question) {
  const normalized = String(question || "").toLowerCase();
  if (
    normalized.includes("powerpoint") ||
    normalized.includes("ppt") ||
    normalized.includes("board deck") ||
    normalized.includes("deck")
  ) {
    return "powerpoint";
  }
  return "pdf";
}

export function detectCustomizationAction(question) {
  const normalized = String(question || "").toLowerCase();
  if (normalized.includes("remove") || normalized.includes("exclude") || normalized.includes("take out")) return "remove";
  return "add";
}

export function shouldPersistRecurringPreference(recurrence) {
  return ["monthly", "quarterly", "year_end"].includes(recurrence);
}

export function detectPdfPackageRequest(question) {
  const normalized = String(question || "").toLowerCase();
  const hasDirectPackageIntent = packageRequestWords.some((word) => normalized.includes(word));
  const hasFixedAssetQuestion = fixedAssetQuestionWords.some((phrase) => normalized.includes(phrase));
  const hasPackageIntent = hasDirectPackageIntent || hasFixedAssetQuestion;
  const matched = Object.entries(pdfPackageReportCatalog).find(([, report]) =>
    report.aliases.some((alias) => normalized.includes(alias)),
  ) || (hasFixedAssetQuestion
    ? ["fixed_asset_roll_forward", pdfPackageReportCatalog.fixed_asset_roll_forward]
    : null);

  if (!matched || !hasPackageIntent) return null;
  return {
    reportKey: matched[0],
    report: matched[1],
    packageType: detectPackageType(question),
    action: detectCustomizationAction(question),
    mode: isStepUpStepDownRequest(question)
      ? "valuation_adjustment_update"
      : hasDirectPackageIntent
        ? "package_customization"
        : "fixed_asset_question",
  };
}

export function getRequestedRecurrence(question) {
  const normalized = String(question || "").toLowerCase();
  if (normalized.includes("every month") || normalized.includes("monthly")) return "monthly";
  if (normalized.includes("every quarter") || normalized.includes("quarterly")) return "quarterly";
  if (normalized.includes("year-end") || normalized.includes("year end") || normalized.includes("annually")) return "year_end";
  if (normalized.includes("this time") || normalized.includes("one time") || normalized.includes("once")) return "one_time";
  return "pending_confirmation";
}

export function canUsePdfReport(subscriptionPlan, reportKey) {
  const report = pdfPackageReportCatalog[reportKey];
  const normalizedPlan = normalizeProductTierKey(subscriptionPlan);
  const currentRank = productTierRank[normalizedPlan] || 1;
  const requiredRank = productTierRank[report?.minTier] || 1;
  return {
    allowed: Boolean(report) && currentRank >= requiredRank,
    report,
    tier: getProductTier(subscriptionPlan),
    requiredTier: getProductTier(report?.minTier),
  };
}

export function buildReportPayload({ reportKey, snapshots }) {
  const report = pdfPackageReportCatalog[reportKey];
  if (report?.generator === "fixed_asset_roll_forward") {
    return buildFixedAssetRollForward({ snapshots });
  }

  return {
    reportKey,
    title: report?.title || "Custom PDF Schedule",
    subtitle: "Current package customization",
    rows: [],
    executiveCommentary: [
      `${report?.title || "This report"} has been queued as a custom package section using available customer data.`,
    ],
  };
}

export function buildPdfCustomizationResponse({ reportKey, reportPayload, permission, recurrence, packagePeriod, packageType = "pdf", action = "add" }) {
  const report = pdfPackageReportCatalog[reportKey];
  const packageLabel = packageType === "powerpoint" ? "PowerPoint board package" : "PDF financial package";
  if (!permission.allowed) {
    return {
      allowed: false,
      response: `${report?.title || "That report"} is not included in ${permission.tier.name}. It becomes available starting with ${permission.requiredTier.name}. I can still help summarize the available data in your current package, but I cannot ${action} this custom section under the current tier.`,
    };
  }

  const recurrenceText =
    recurrence === "monthly"
      ? "I saved this as a monthly recurring package preference."
      : recurrence === "quarterly"
        ? "I saved this as a quarterly recurring package preference."
        : recurrence === "year_end"
          ? "I saved this as a year-end recurring package preference."
          : recurrence === "one_time"
            ? "I will apply this to the current package only and will not save it as a recurring preference."
            : "Would you like this added to this package only or saved as a recurring section?";
  const updateText =
    action === "remove"
      ? `I can remove ${report.title.toLowerCase()} from your ${packagePeriod} ${packageLabel}.`
      : `I can add ${report.title.toLowerCase()} to your ${packagePeriod} ${packageLabel}.`;

  return {
    allowed: true,
    response: `${updateText} ${reportPayload.subtitle ? `${reportPayload.subtitle}. ` : ""}The fixed asset roll-forward includes separate Step-Up Valuation Adjustment and Step-Down Valuation Adjustment fields so acquisition-related valuation changes stay separate from normal additions, disposals, and transfers. Pulse is the customer-facing control point for package customization, so there is no separate customer template editor. I will update the table of contents, page numbering, ${packageType === "powerpoint" ? "board deck sections" : "supporting schedules section"}, and executive summary where applicable. ${recurrenceText}\n\nOptions: Add this time only, Add every month, Add every quarter, Add at year-end only.`,
  };
}

export function buildValuationAdjustmentUpdateResponse({ permission }) {
  if (!permission.allowed) {
    return `${permission.tier.name} does not include the fixed asset roll-forward schedule. It becomes available starting with ${permission.requiredTier.name}.`;
  }

  return "I added separate Step-Up Valuation Adjustment and Step-Down Valuation Adjustment fields to the fixed asset roll-forward. These will only populate when there are acquisition-related valuation changes or approved valuation adjustments. Normal additions, disposals, and transfers will remain separate.";
}

export function buildFixedAssetQuestionResponse({ reportPayload, permission }) {
  if (!permission.allowed) {
    return `${permission.tier.name} does not include the fixed asset roll-forward schedule. It becomes available starting with ${permission.requiredTier.name}.`;
  }

  const totals = reportPayload?.totals || {};
  const commentary = reportPayload?.executiveCommentary || [];
  return [
    `${reportPayload.title}: ${reportPayload.subtitle}.`,
    `Fixed asset additions year to date are $${Number(totals.additions || 0).toLocaleString()}.`,
    `Current year depreciation is $${Number(totals.currentYearDepreciation || 0).toLocaleString()}.`,
    `Net book value is $${Number(totals.netBookValue || 0).toLocaleString()}.`,
    commentary.length ? `Pulse note: ${commentary.join(" ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
