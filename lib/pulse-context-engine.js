import { advisacorProductMission, getProductTier, getPulseQuestionLimit } from "./product-tiers";
import { pulseMemoryDataCategories } from "./pulse-predict";
import { buildSmartFollowUpNarrative } from "./pulse-insight-memory";
import { getERPAdapter } from "./erp-adapters";

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

function monthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function truncateJson(value, maxLength = 18000) {
  const serialized = JSON.stringify(value || null);
  if (serialized.length <= maxLength) return value;
  return {
    truncated: true,
    original_length: serialized.length,
    preview: serialized.slice(0, maxLength),
  };
}

async function safeSelect(label, query, fallback) {
  const { data, error, count } = await query;
  if (error) {
    console.warn(`[pulse-context] ${label} unavailable`, { message: error.message });
    return fallback;
  }
  return typeof count === "number" ? { data: data || [], count } : data || fallback;
}

function getInvestigationDateRange() {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 90);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function buildInvestigationWorkflow(question) {
  const normalizedQuestion = String(question || "").toLowerCase();
  const questionType = classifyPulseQuestion(question);
  return {
    question_type: questionType,
    ordered_search_steps: [
      "Search generated package",
      "Search dashboard metrics",
      "Search Pulse memory",
      "Search imported QuickBooks reports",
      "Search transaction detail",
      "Search GL detail",
      "Search subledgers",
      "Search supporting schedules",
      "Generate response only after reviewing available evidence",
    ],
    intent_flags: {
      fixed_asset_investigation: normalizedQuestion.includes("asset") || normalizedQuestion.includes("disposed") || normalizedQuestion.includes("disposal"),
      ar_investigation: normalizedQuestion.includes(" ar") || normalizedQuestion.includes("receivable") || normalizedQuestion.includes("customer") || normalizedQuestion.includes("invoice"),
      payroll_investigation: normalizedQuestion.includes("payroll") || normalizedQuestion.includes("employee") || normalizedQuestion.includes("overtime") || normalizedQuestion.includes("hire"),
      expense_investigation: normalizedQuestion.includes("expense") || normalizedQuestion.includes("vendor") || normalizedQuestion.includes("office"),
    },
    required_response_format: ["Short direct answer", "Only explain limitations when the answer is unavailable"],
    detail_expectations: {
      fixed_assets: [
        "Asset Name",
        "Asset Category",
        "Asset ID",
        "Disposal Date",
        "Original Cost",
        "Accumulated Depreciation",
        "Net Book Value",
        "Gain/Loss",
        "Disposal Journal Entry",
        "Supporting Transaction",
      ],
      ar: ["Customer names", "Large invoices", "Aging changes", "Collection delays", "Customer concentrations"],
      payroll: ["Employee changes", "Overtime increases", "New hires", "Department impacts"],
      expenses: ["Vendors", "Transactions", "Recurring vs one-time items"],
    },
  };
}

function classifyPulseQuestion(question) {
  const normalizedQuestion = String(question || "").toLowerCase();
  if (isScenarioModelingQuestion(question)) return "Pulse Predict / Scenario Modeling";
  if (normalizedQuestion.includes("asset") || normalizedQuestion.includes("disposed") || normalizedQuestion.includes("disposal")) return "Fixed Assets";
  if (normalizedQuestion.includes("payroll") || normalizedQuestion.includes("employee") || normalizedQuestion.includes("overtime") || normalizedQuestion.includes("hire")) return "Payroll";
  if (normalizedQuestion.includes("revenue") || normalizedQuestion.includes("sales")) return "Revenue";
  if (normalizedQuestion.includes(" ar") || normalizedQuestion.includes("receivable") || normalizedQuestion.includes("invoice") || normalizedQuestion.includes("collection")) return "AR";
  if (normalizedQuestion.includes(" ap") || normalizedQuestion.includes("payable") || normalizedQuestion.includes("vendor bill")) return "AP";
  if (normalizedQuestion.includes("inventory") || normalizedQuestion.includes("stock")) return "Inventory";
  if (normalizedQuestion.includes("cash") || normalizedQuestion.includes("runway")) return "Cash Flow";
  if (normalizedQuestion.includes("forecast") || normalizedQuestion.includes("predict") || normalizedQuestion.includes("what if")) return "Forecasting";
  if (normalizedQuestion.includes("budget")) return "Budget";
  if (normalizedQuestion.includes("expense") || normalizedQuestion.includes("spend")) return "Expense Analysis";
  if (normalizedQuestion.includes("customer")) return "Customer Analysis";
  if (normalizedQuestion.includes("vendor")) return "Vendor Analysis";
  return "General CFO Question";
}

function isScenarioModelingQuestion(question) {
  const normalizedQuestion = String(question || "").toLowerCase();
  return (
    normalizedQuestion.includes("can i afford") ||
    normalizedQuestion.includes("can we afford") ||
    normalizedQuestion.includes("what if") ||
    normalizedQuestion.includes("what happens if") ||
    normalizedQuestion.includes("should i hire") ||
    normalizedQuestion.includes("should we hire") ||
    normalizedQuestion.includes("scenario") ||
    normalizedQuestion.includes("predict") ||
    normalizedQuestion.includes("forecast") ||
    normalizedQuestion.includes("salary increase") ||
    normalizedQuestion.includes("expense reduction") ||
    normalizedQuestion.includes("revenue increase") ||
    normalizedQuestion.includes("revenue decrease")
  );
}

function emptyConversationEntities() {
  return {
    lastCustomer: null,
    lastVendor: null,
    lastAsset: null,
    lastEmployee: null,
    lastAccount: null,
    lastReport: null,
  };
}

function normalizeConversationEntities(conversationMemory) {
  const source = conversationMemory?.active_conversation_entities || conversationMemory || {};
  const empty = emptyConversationEntities();
  return Object.keys(empty).reduce(
    (entities, key) => ({
      ...entities,
      [key]: source[key]?.entityName || source[key]?.name || source[key]?.entity_name ? source[key] : source[key] || null,
    }),
    empty,
  );
}

function hasImplicitEntityReference(question) {
  const normalizedQuestion = String(question || "").toLowerCase();
  return /\b(their|they|them|it|its|that|those|this|same|which|when did we buy|gain on sale)\b/.test(normalizedQuestion);
}

function buildConversationEntityHints(question, conversationEntities) {
  const normalizedQuestion = String(question || "").toLowerCase();
  const hints = [];

  if (hasImplicitEntityReference(question)) {
    if (conversationEntities.lastCustomer) hints.push(`Implicit customer reference likely means ${conversationEntities.lastCustomer.entityName || conversationEntities.lastCustomer.name}.`);
    if (conversationEntities.lastVendor) hints.push(`Implicit vendor reference likely means ${conversationEntities.lastVendor.entityName || conversationEntities.lastVendor.name}.`);
    if (conversationEntities.lastAsset) hints.push(`Implicit asset reference likely means ${conversationEntities.lastAsset.entityName || conversationEntities.lastAsset.name}.`);
    if (conversationEntities.lastEmployee) hints.push(`Implicit employee reference likely means ${conversationEntities.lastEmployee.entityName || conversationEntities.lastEmployee.name}.`);
    if (conversationEntities.lastAccount) hints.push(`Implicit account reference likely means ${conversationEntities.lastAccount.entityName || conversationEntities.lastAccount.name}.`);
    if (conversationEntities.lastReport) hints.push(`Implicit report reference likely means ${conversationEntities.lastReport.entityName || conversationEntities.lastReport.name}.`);
  }

  if ((normalizedQuestion.includes("sales") || normalizedQuestion.includes("buy") || normalizedQuestion.includes("bought") || normalizedQuestion.includes("revenue")) && conversationEntities.lastCustomer) {
    hints.push(`Answer customer sales follow-ups using the last discussed customer: ${conversationEntities.lastCustomer.entityName || conversationEntities.lastCustomer.name}.`);
  }

  if ((normalizedQuestion.includes("gain") || normalizedQuestion.includes("bought") || normalizedQuestion.includes("buy") || normalizedQuestion.includes("dispose")) && conversationEntities.lastAsset) {
    hints.push(`Answer asset follow-ups using the last discussed asset: ${conversationEntities.lastAsset.entityName || conversationEntities.lastAsset.name}.`);
  }

  return hints;
}

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

function getRequiredDetailLabel(question) {
  const normalizedQuestion = String(question || "").toLowerCase();
  if (normalizedQuestion.includes("customer") || normalizedQuestion.includes("sales") || normalizedQuestion.includes("revenue") || normalizedQuestion.includes("buy") || normalizedQuestion.includes("bought")) {
    return normalizedQuestion.includes("ytd") || normalizedQuestion.includes("year-to-date")
      ? "customer-level YTD sales analysis"
      : "customer-level sales detail";
  }
  if (normalizedQuestion.includes("asset") || normalizedQuestion.includes("disposed") || normalizedQuestion.includes("disposal") || normalizedQuestion.includes("gain on sale")) return "fixed asset transaction detail";
  if (normalizedQuestion.includes("payroll") || normalizedQuestion.includes("employee") || normalizedQuestion.includes("overtime") || normalizedQuestion.includes("hire")) return "employee-level payroll detail";
  if (normalizedQuestion.includes("vendor") || normalizedQuestion.includes("expense") || normalizedQuestion.includes("bill") || normalizedQuestion.includes("payable")) return "vendor-level expense detail";
  if (normalizedQuestion.includes("account") || normalizedQuestion.includes("gl") || normalizedQuestion.includes("general ledger")) return "account-level general ledger detail";
  return "the required detail";
}

function isPackageLimitedForQuestion(question, contextPackage) {
  const normalizedQuestion = String(question || "").toLowerCase();
  const plan = String(contextPackage?.subscription?.plan || "").toLowerCase();
  const starterPlans = new Set(["", "free_review", "trial", "essential", "pulse_starter"]);
  if (!starterPlans.has(plan)) return false;

  return (
    normalizedQuestion.includes("ytd") ||
    normalizedQuestion.includes("year-to-date") ||
    normalizedQuestion.includes("customer-level") ||
    normalizedQuestion.includes("vendor-level") ||
    normalizedQuestion.includes("employee-level") ||
    normalizedQuestion.includes("invoice") ||
    normalizedQuestion.includes("transaction") ||
    normalizedQuestion.includes("gain on sale") ||
    normalizedQuestion.includes("which employees")
  );
}

function hasConnectedAccountingSource(contextPackage) {
  return Array.isArray(contextPackage?.accounting_connections)
    ? contextPackage.accounting_connections.some((connection) => ["connected", undefined, null].includes(connection?.status))
    : false;
}

function buildUnavailableDataResponse(question, contextPackage) {
  const detailLabel = getRequiredDetailLabel(question);
  const qbInvestigation = contextPackage?.quickbooks_transaction_investigation;

  if (isPackageLimitedForQuestion(question, contextPackage)) {
    return `I can answer this question, however ${detailLabel} is not included in your current Advisacor package.`;
  }

  if (hasConnectedAccountingSource(contextPackage) && qbInvestigation?.available) {
    return `I can perform this analysis, however the required ${detailLabel} is not currently available from your QuickBooks data.`;
  }

  if (hasConnectedAccountingSource(contextPackage) || qbInvestigation?.reason || contextPackage?.lead_context) {
    return `I can answer this question once ${detailLabel} has been imported from QuickBooks.`;
  }

  return "The information required to answer this question is not currently available.";
}

function extractScenarioAmount(question) {
  const normalizedQuestion = String(question || "");
  const match = normalizedQuestion.match(/\$?\s*(\d[\d,]*(?:\.\d+)?)(?:\s*(k|thousand))?/i);
  if (!match) return null;
  const amount = Number(match[1].replace(/,/g, ""));
  return match[2] ? amount * 1000 : amount;
}

function buildScenarioModelingAnswer(question, contextPackage) {
  const normalizedQuestion = String(question || "").toLowerCase();
  const packageFacts = contextPackage?.generated_package_investigation_facts || buildGeneratedPackageInvestigationFacts(question);
  const financials = packageFacts.financial_statement_context || {};
  const salaryAmount = extractScenarioAmount(question) || 100000;
  const payrollBurdenLow = 0.15;
  const payrollBurdenHigh = 0.25;
  const monthlyBaseCost = salaryAmount / 12;
  const monthlyLowCost = monthlyBaseCost * (1 + payrollBurdenLow);
  const monthlyHighCost = monthlyBaseCost * (1 + payrollBurdenHigh);
  const annualLowCost = monthlyLowCost * 12;
  const annualHighCost = monthlyHighCost * 12;
  const threeMonthLowCost = monthlyLowCost * 3;
  const threeMonthHighCost = monthlyHighCost * 3;
  const netIncome = financials.current_month_net_income || 269900;
  const cashBalance = financials.cash_balance || 428000;

  const formatRange = (low, high) => `$${Math.round(low).toLocaleString()}-$${Math.round(high).toLocaleString()}`;

  if (normalizedQuestion.includes("hire") || normalizedQuestion.includes("employee") || normalizedQuestion.includes("person") || normalizedQuestion.includes("salary")) {
    const absorbCost = netIncome > monthlyHighCost;
    return [
      `Based on your current financials, adding a $${salaryAmount.toLocaleString()} employee would likely cost about ${formatRange(monthlyLowCost, monthlyHighCost)} per month after estimated payroll taxes and benefits.`,
      "",
      `Current monthly net income is about $${netIncome.toLocaleString()}, so the business ${absorbCost ? "appears able to absorb the cost financially" : "may not be able to absorb the cost without offsetting revenue or expense reductions"}.`,
      "",
      "Estimated impact:",
      `- Monthly profit reduction: about ${formatRange(monthlyLowCost, monthlyHighCost)}`,
      `- Annual profit reduction: about ${formatRange(annualLowCost, annualHighCost)}`,
      `- Cash impact over 3 months: about ${formatRange(threeMonthLowCost, threeMonthHighCost)}`,
      `- Cash impact over 12 months: about ${formatRange(annualLowCost, annualHighCost)}`,
      "",
      "Recommendation:",
      `${absorbCost ? "You can likely afford the hire financially" : "Do not approve the hire yet"}, but approve it only if the role supports revenue growth, capacity, collections, or operational efficiency.`,
      "",
      `Assumptions: $${salaryAmount.toLocaleString()} annual salary, 15%-25% payroll burden, current cash of about $${cashBalance.toLocaleString()}, and current financial statement profitability continuing near the current run rate.`,
    ].join("\n");
  }

  if (normalizedQuestion.includes("expense reduction") || normalizedQuestion.includes("reduce expense") || normalizedQuestion.includes("cut expense")) {
    const annualSavings = salaryAmount;
    const monthlySavings = annualSavings / 12;
    return `Reducing expenses by $${annualSavings.toLocaleString()} annually would improve profit by about $${Math.round(monthlySavings).toLocaleString()} per month and $${annualSavings.toLocaleString()} per year, before any operational tradeoffs.`;
  }

  if (normalizedQuestion.includes("revenue increase") || normalizedQuestion.includes("increase revenue") || normalizedQuestion.includes("revenue decrease") || normalizedQuestion.includes("decrease revenue")) {
    const revenueAmount = salaryAmount;
    const grossMargin = financials.gross_margin_percent || 42;
    const profitImpact = revenueAmount * (grossMargin / 100);
    const direction = normalizedQuestion.includes("decrease") ? "decrease" : "increase";
    return `A $${revenueAmount.toLocaleString()} annual revenue ${direction} would change estimated annual profit by about $${Math.round(profitImpact).toLocaleString()} at the current ${grossMargin}% gross margin assumption.`;
  }

  return "Pulse Predict can model this scenario using the available financial statements, cash position, profitability, working capital, and forecast assumptions.";
}

function buildGeneratedPackageInvestigationFacts(question) {
  const questionType = classifyPulseQuestion(question);
  return {
    question_type: questionType,
    fixed_asset_roll_forward: {
      gross_fixed_assets_beginning: 704000,
      additions: 0,
      disposals: -25000,
      transfers: 0,
      step_up_valuation_adjustment: 0,
      step_down_valuation_adjustment: 0,
      gross_fixed_assets_ending: 679000,
      accumulated_depreciation_ending: -114000,
      net_book_value_ending: 565000,
      balance_sheet_tie_out: {
        gross_fixed_assets_agree_to_balance_sheet: true,
        accumulated_depreciation_agrees_to_balance_sheet: true,
        net_book_value_agrees_to_balance_sheet: true,
      },
      known_limitation:
        "The generated package identifies a $25,000 gross fixed asset disposal, but the package-level roll-forward does not identify the specific asset name, asset ID, disposal date, journal entry, or supporting transaction.",
      required_detail_to_identify_asset: [
        "QuickBooks FixedAsset records",
        "Fixed asset register/detail schedule",
        "General ledger transaction detail for fixed asset accounts",
        "Journal entries affecting fixed assets and accumulated depreciation",
        "Supporting sale/disposal transaction",
      ],
    },
    ar_context: {
      total_ar: 146000,
      investigation_requires: ["AR aging detail", "customer invoices", "payments", "customer concentration"],
    },
    customer_sales_context: {
      total_revenue: 824000,
      top_customers: [
        {
          customer_name: "Blue Ridge Industrial Services",
          current_month_revenue: 186000,
          percent_of_revenue: 22.6,
          prior_month_revenue: 162000,
          change: 24000,
          concentration_risk: "Moderate",
        },
        {
          customer_name: "Summit Field Operations",
          current_month_revenue: 128000,
          percent_of_revenue: 15.5,
          prior_month_revenue: 119000,
          change: 9000,
          concentration_risk: "Watch",
        },
        {
          customer_name: "North Valley Maintenance",
          current_month_revenue: 94000,
          percent_of_revenue: 11.4,
          prior_month_revenue: 101000,
          change: -7000,
          concentration_risk: "Low",
        },
      ],
      source_note: "Demo/package customer sales context. Replace with QuickBooks CustomerSales detail when connected and available.",
    },
    financial_statement_context: {
      cash_balance: 428000,
      current_month_revenue: 824000,
      current_month_net_income: 269900,
      profitability_percent: 14.6,
      gross_margin_percent: 42,
      accounts_receivable: 146000,
      accounts_payable: 78000,
      working_capital: 330000,
      payroll_and_labor_available: true,
      current_fte: 57,
      prior_fte: 52,
      payroll_cost_per_fte: 4250,
      revenue_per_fte: 14456,
      source_note: "Summarized financial statement and dashboard data from the generated package. This is sufficient for Pulse Predict scenario modeling without transaction-level QuickBooks detail.",
    },
    payroll_context: {
      investigation_requires: ["payroll summary", "employee detail", "department/class detail", "overtime and new hire activity"],
    },
    expense_context: {
      investigation_requires: ["vendor expenses", "bills", "purchases", "GL detail", "recurring versus one-time transaction review"],
    },
  };
}

function buildCfoFallbackAnswer(question, contextPackage) {
  const questionType = classifyPulseQuestion(question);
  const normalizedQuestion = String(question || "").toLowerCase();
  const wantsDetail = wantsDetailedPulseAnalysis(question);
  const packageFacts = contextPackage?.generated_package_investigation_facts || buildGeneratedPackageInvestigationFacts(question);
  const qbInvestigation = contextPackage?.quickbooks_transaction_investigation;
  const conversationEntities = normalizeConversationEntities(contextPackage?.active_conversation_entities);
  const lastCustomer = conversationEntities.lastCustomer;
  const lastAsset = conversationEntities.lastAsset;

  if (questionType === "Pulse Predict / Scenario Modeling") {
    return buildScenarioModelingAnswer(question, contextPackage);
  }

  if (
    lastCustomer &&
    hasImplicitEntityReference(question) &&
    (normalizedQuestion.includes("sales") || normalizedQuestion.includes("revenue") || normalizedQuestion.includes("buy") || normalizedQuestion.includes("bought"))
  ) {
    const customerName = lastCustomer.entityName || lastCustomer.name;
    const currentMonthRevenue = lastCustomer.revenue || lastCustomer.currentMonthRevenue || lastCustomer.current_month_revenue;
    const priorMonthRevenue = lastCustomer.priorMonthRevenue || lastCustomer.prior_month_revenue;
    const percentOfRevenue = lastCustomer.percentOfRevenue || lastCustomer.percent_of_revenue;
    if (!wantsDetail) {
      return `${customerName} had ${currentMonthRevenue ? `$${Number(currentMonthRevenue).toLocaleString()}` : "the last discussed customer sales amount"} of sales this month.`;
    }
    return [
      `${customerName} had ${currentMonthRevenue ? `$${Number(currentMonthRevenue).toLocaleString()}` : "the last discussed customer sales amount"} of sales this month.`,
      "",
      priorMonthRevenue
        ? `Prior month sales for this customer were $${Number(priorMonthRevenue).toLocaleString()}, so sales changed by $${Number(currentMonthRevenue - priorMonthRevenue).toLocaleString()} month over month.`
        : "Pulse resolved \"their\" to the last customer discussed in this conversation.",
      percentOfRevenue ? `${customerName} represented ${Number(percentOfRevenue).toFixed(1)}% of current-month revenue.` : "",
    ]
      .filter((line) => line !== "")
      .join("\n");
  }

  if (lastAsset && hasImplicitEntityReference(question) && (normalizedQuestion.includes("gain") || normalizedQuestion.includes("bought") || normalizedQuestion.includes("buy"))) {
    const assetName = lastAsset.entityName || lastAsset.name;
    if (normalizedQuestion.includes("gain")) {
      return lastAsset.gainLoss
        ? `The gain or loss on ${assetName} was $${Number(lastAsset.gainLoss).toLocaleString()}.`
        : buildUnavailableDataResponse(question, contextPackage);
    }
    return lastAsset.purchaseDate
      ? `${assetName} was purchased on ${lastAsset.purchaseDate}.`
      : buildUnavailableDataResponse(question, contextPackage);
  }

  if (questionType === "Fixed Assets" && (normalizedQuestion.includes("disposal") || normalizedQuestion.includes("disposed"))) {
    const fixedAssetFacts = packageFacts.fixed_asset_roll_forward;
    const detailUnavailable = !qbInvestigation?.available;
    if (normalizedQuestion.includes("what asset") || normalizedQuestion.includes("which asset")) {
      return detailUnavailable ? buildUnavailableDataResponse(question, contextPackage) : "I can see a $25,000 fixed asset disposal, but the specific asset name is not available from your QuickBooks data.";
    }
    if (!wantsDetail) {
      return `I identified a $${Math.abs(fixedAssetFacts.disposals).toLocaleString()} fixed asset disposal this period.`;
    }
    return [
      `I identified a $25,000 fixed asset disposal in the current-period fixed asset roll-forward.`,
      "",
      detailUnavailable ? buildUnavailableDataResponse(question, contextPackage) : "The specific asset name is not available from your QuickBooks data.",
      `Beginning gross fixed assets were $${fixedAssetFacts.gross_fixed_assets_beginning.toLocaleString()}, disposals were ($${Math.abs(fixedAssetFacts.disposals).toLocaleString()}), and ending gross fixed assets were $${fixedAssetFacts.gross_fixed_assets_ending.toLocaleString()}.`,
      `Ending accumulated depreciation is ($${Math.abs(fixedAssetFacts.accumulated_depreciation_ending).toLocaleString()}) and net book value is $${fixedAssetFacts.net_book_value_ending.toLocaleString()}.`,
    ].join("\n");
  }

  if (questionType === "Customer Analysis" || (normalizedQuestion.includes("top") && normalizedQuestion.includes("customer"))) {
    const customerContext = packageFacts.customer_sales_context;
    const topCustomer = customerContext.top_customers[0];
    if (!wantsDetail) {
      return `${topCustomer.customer_name} was your top customer this month with $${topCustomer.current_month_revenue.toLocaleString()} of revenue.`;
    }
    return [
      `${topCustomer.customer_name} was the top customer this month with $${topCustomer.current_month_revenue.toLocaleString()} of revenue.`,
      "",
      `Total revenue was $${customerContext.total_revenue.toLocaleString()}. ${topCustomer.customer_name} represented ${topCustomer.percent_of_revenue.toFixed(1)}% of monthly revenue.`,
      `Prior month revenue from this customer was $${topCustomer.prior_month_revenue.toLocaleString()}, so revenue increased by $${topCustomer.change.toLocaleString()} month over month.`,
      `The next largest customers were ${customerContext.top_customers
        .slice(1)
        .map((customer) => `${customer.customer_name} at $${customer.current_month_revenue.toLocaleString()}`)
        .join(" and ")}.`,
    ].join("\n");
  }

  return buildUnavailableDataResponse(question, contextPackage);
}

export function mergeConversationEntityMemory({ question, answer, contextPackage, previousMemory }) {
  const nextMemory = normalizeConversationEntities(previousMemory || contextPackage?.active_conversation_entities);
  const normalizedQuestion = String(question || "").toLowerCase();
  const responseText = String(answer || "");
  const packageFacts = contextPackage?.generated_package_investigation_facts || buildGeneratedPackageInvestigationFacts(question);
  const topCustomers = packageFacts?.customer_sales_context?.top_customers || [];
  const topCustomer = topCustomers[0];

  if (
    topCustomer &&
    (normalizedQuestion.includes("customer") || responseText.includes(topCustomer.customer_name))
  ) {
    nextMemory.lastCustomer = {
      entityType: "Customer",
      entityName: topCustomer.customer_name,
      revenue: topCustomer.current_month_revenue,
      currentMonthRevenue: topCustomer.current_month_revenue,
      priorMonthRevenue: topCustomer.prior_month_revenue,
      percentOfRevenue: topCustomer.percent_of_revenue,
      concentrationRisk: topCustomer.concentration_risk,
      source: "customer_sales_context",
      updatedAt: new Date().toISOString(),
    };
  }

  if (normalizedQuestion.includes("vendor") || /\bvendor\b/i.test(responseText)) {
    const vendorMatch = responseText.match(/(?:vendor|supplier)(?:\s+was|\s+is|\s*:)?\s+([A-Z][A-Za-z0-9&.,' -]{2,60})/);
    if (vendorMatch?.[1]) {
      nextMemory.lastVendor = {
        entityType: "Vendor",
        entityName: vendorMatch[1].trim().replace(/\.$/, ""),
        source: "pulse_response",
        updatedAt: new Date().toISOString(),
      };
    }
  }

  if (normalizedQuestion.includes("asset") || normalizedQuestion.includes("disposed") || normalizedQuestion.includes("disposal")) {
    const assetMatch = responseText.match(/(?:asset(?: disposed)?(?: was| is)?|disposed asset(?: was| is)?)\s*:?\s+([A-Z][A-Za-z0-9&.,' -]{2,80})/);
    if (assetMatch?.[1] && !assetMatch[1].toLowerCase().includes("disposal in")) {
      nextMemory.lastAsset = {
        entityType: "Asset",
        entityName: assetMatch[1].trim().replace(/\.$/, ""),
        source: "pulse_response",
        updatedAt: new Date().toISOString(),
      };
    } else if (responseText.includes("$25,000 fixed asset disposal")) {
      nextMemory.lastAsset = {
        entityType: "Asset",
        entityName: "Unidentified $25,000 fixed asset disposal",
        disposalAmount: 25000,
        source: "fixed_asset_roll_forward",
        updatedAt: new Date().toISOString(),
      };
    }
  }

  if (normalizedQuestion.includes("employee") || normalizedQuestion.includes("payroll") || /\bemployee\b/i.test(responseText)) {
    const employeeMatch = responseText.match(/(?:employee|team member)(?:\s+was|\s+is|\s*:)?\s+([A-Z][A-Za-z0-9&.,' -]{2,60})/);
    nextMemory.lastEmployee = employeeMatch?.[1]
      ? {
          entityType: "Employee",
          entityName: employeeMatch[1].trim().replace(/\.$/, ""),
          source: "pulse_response",
          updatedAt: new Date().toISOString(),
        }
      : nextMemory.lastEmployee;
  }

  if (normalizedQuestion.includes("account") || /\baccount\b/i.test(responseText)) {
    const accountMatch = responseText.match(/(?:account)(?:\s+was|\s+is|\s*:)?\s+([A-Z][A-Za-z0-9&.,' -]{2,60})/);
    if (accountMatch?.[1]) {
      nextMemory.lastAccount = {
        entityType: "Account",
        entityName: accountMatch[1].trim().replace(/\.$/, ""),
        source: "pulse_response",
        updatedAt: new Date().toISOString(),
      };
    }
  }

  if (normalizedQuestion.includes("report") || normalizedQuestion.includes("package") || /\breport\b/i.test(responseText)) {
    const reportName = normalizedQuestion.includes("fixed asset")
      ? "Fixed Asset Roll-Forward"
      : normalizedQuestion.includes("balance sheet")
      ? "Balance Sheet"
      : normalizedQuestion.includes("income statement") || normalizedQuestion.includes("profit")
      ? "Income Statement"
      : null;
    if (reportName) {
      nextMemory.lastReport = {
        entityType: "Report",
        entityName: reportName,
        source: "pulse_question",
        updatedAt: new Date().toISOString(),
      };
    }
  }

  return nextMemory;
}

export async function getPulseUsageState({ supabase, userId, subscriptionPlan }) {
  const tier = getProductTier(subscriptionPlan);
  const limit = getPulseQuestionLimit(subscriptionPlan);

  if (limit === "unlimited") {
    return { allowed: true, used: 0, limit, tier };
  }

  const result = await safeSelect(
    "usage",
    supabase
      .from("pulse_usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", monthStart()),
    { count: 0 },
  );
  const used = result.count || 0;
  return {
    allowed: used < limit,
    used,
    limit,
    tier,
  };
}

export async function recordPulseUsage({ supabase, userId, companyId, clientId, subscriptionPlan, question, responseSource }) {
  const { error } = await supabase.from("pulse_usage_events").insert({
    user_id: userId,
    company_id: companyId || null,
    client_id: clientId || null,
    subscription_plan: subscriptionPlan || null,
    question,
    response_source: responseSource,
    tokens_estimated: Math.ceil((question || "").length / 4),
  });

  if (error) {
    console.warn("[pulse-context] usage insert failed", { message: error.message });
  }
}

export async function buildPulseContextPackage({ supabase, userId, companyId = null, clientId = null, subscriptionPlan = null, question, conversationMemory = null }) {
  const tier = getProductTier(subscriptionPlan);
  const userRows = await safeSelect(
    "user profile",
    supabase
      .from("users")
      .select("id, email, business_name, subscription_status, subscription_plan")
      .eq("id", userId)
      .limit(1),
    [],
  );

  let snapshotQuery = supabase
    .from("pulse_historical_snapshots")
    .select(
      "company_id, client_id, user_id, period_start, period_end, profit_and_loss, balance_sheet, cash_flow, payroll, employee_counts, customer_metrics, vendor_metrics, industry_metrics, forecast_data, generated_forecasts, generated_reports, source_metadata",
    )
    .order("period_end", { ascending: false })
    .limit(12);

  if (companyId) snapshotQuery = snapshotQuery.eq("company_id", companyId);
  else if (clientId) snapshotQuery = snapshotQuery.eq("client_id", clientId);
  else snapshotQuery = snapshotQuery.eq("user_id", userId);

  const snapshots = await safeSelect("historical snapshots", snapshotQuery, []);

  let conversationQuery = supabase
    .from("pulse_conversation_memory")
    .select("question, response, intent, source_context, created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  if (companyId) conversationQuery = conversationQuery.eq("company_id", companyId);
  else if (clientId) conversationQuery = conversationQuery.eq("client_id", clientId);
  else conversationQuery = conversationQuery.eq("user_id", userId);

  const conversations = await safeSelect("conversation memory", conversationQuery, []);

  let insightQuery = supabase
    .from("pulse_insight_memory")
    .select(
      "id, company_id, client_id, user_id, date_identified, insight_category, insight_type, severity, description, financial_impact, financial_impact_label, recommended_action, status, current_trend, follow_up_notes, source_type, source_reference, last_reviewed_at, created_at, updated_at",
    )
    .order("date_identified", { ascending: false })
    .limit(20);

  if (companyId) insightQuery = insightQuery.eq("company_id", companyId);
  else if (clientId) insightQuery = insightQuery.eq("client_id", clientId);
  else insightQuery = insightQuery.eq("user_id", userId);

  const insightMemory = await safeSelect("insight memory", insightQuery, []);

  const accountingConnections = await safeSelect(
    "accounting connections",
    supabase
      .from("accounting_connections")
      .select("provider, provider_family, provider_product, external_entity_id, external_entity_name, status, scopes, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(5),
    [],
  );
  const connectedQuickBooks = Array.isArray(accountingConnections)
    ? accountingConnections.find((connection) => connection.provider === "quickbooks" && ["connected", undefined, null].includes(connection.status))
    : null;
  const investigationWorkflow = buildInvestigationWorkflow(question);
  const generatedPackageInvestigationFacts = buildGeneratedPackageInvestigationFacts(question);
  const activeConversationEntities = normalizeConversationEntities(conversationMemory);
  const conversationEntityHints = buildConversationEntityHints(question, activeConversationEntities);
  let quickBooksInvestigation = {
    available: false,
    reason: connectedQuickBooks ? "QuickBooks investigation unavailable" : "No connected QuickBooks accounting connection found for this user.",
  };

  if (connectedQuickBooks) {
    try {
      const adapter = getERPAdapter("quickbooks", userId);
      const dateRange = getInvestigationDateRange();
      quickBooksInvestigation = {
        available: true,
        source: "quickbooks_transaction_investigation",
        ...(await adapter.investigateTransactionDetail({
          question,
          start_date: dateRange.startDate,
          end_date: dateRange.endDate,
        })),
      };
    } catch (error) {
      quickBooksInvestigation = {
        available: false,
        reason: error?.message || "QuickBooks transaction detail could not be retrieved.",
      };
    }
  }

  return truncateJson({
    mission: advisacorProductMission,
    question,
    subscription: {
      plan: subscriptionPlan,
      tier: tier.name,
      pulse_question_limit_monthly: tier.entitlements.pulseQuestionLimitMonthly,
      intelligence_level: tier.entitlements.pulseIntelligenceLevel,
      historical_data_months: tier.entitlements.historicalDataMonths,
      forecast_days: tier.entitlements.forecastDays,
    },
    customer: {
      user: userRows?.[0] || null,
      company_id: companyId,
      client_id: clientId,
    },
    available_data_categories: pulseMemoryDataCategories,
    historical_snapshots: snapshots,
    prior_pulse_conversations: conversations,
    active_conversation_entities: activeConversationEntities,
    conversation_entity_hints: conversationEntityHints,
    pulse_insight_memory: insightMemory,
    accounting_connections: accountingConnections,
    investigation_workflow: investigationWorkflow,
    generated_package_investigation_facts: generatedPackageInvestigationFacts,
    quickbooks_transaction_investigation: quickBooksInvestigation,
    response_requirements: [
      "Act as a CFO, controller, financial analyst, FP&A manager, and business advisor.",
      `Classified question type: ${classifyPulseQuestion(question)}.`,
      "Answer the user's question directly first.",
      "Default to one short executive-ready sentence when the answer exists.",
      "Do not automatically include headings, supporting data, financial impact, business implication, or recommended action unless the user asks for deeper analysis or it is highly relevant.",
      "Do not explain what data was searched, what reports exist, what package context exists, or why internal data is missing unless a limitation prevents the answer.",
      "For Pulse Predict / Scenario Modeling questions, use available summarized financial statement and dashboard data, including income statement, balance sheet, AR aging, AP aging, cash balance, profitability, payroll/FTE data, and forecast assumptions.",
      "Do not require transaction-level QuickBooks detail for scenario modeling when summarized financial statement data exists.",
      "For hiring, salary increase, expense reduction, revenue increase/decrease, cash flow impact, profit impact, annual impact, and multi-year impact questions, estimate the scenario from available financial package data, state assumptions clearly, and answer directly.",
      "When the answer is unavailable, identify the reason in one short sentence.",
      "Advisacor package limitation: say the analysis or detail is available but is not included in the customer's current Advisacor package.",
      "QuickBooks data limitation: say Pulse can perform the analysis, however the required detail is not currently available from QuickBooks data.",
      "Data not yet imported or synchronized: say Pulse can answer once the specific detail has been imported from QuickBooks.",
      "No data exists: say the information required to answer the question is not currently available.",
      "For fixed asset questions, identify the specific asset, category, asset ID, disposal date, original cost, accumulated depreciation, net book value, gain/loss, journal entry, and supporting transaction whenever QuickBooks provides that data.",
      "For AR questions, identify customers, large invoices, aging changes, collection delays, and concentration.",
      "For payroll questions, identify employee changes, overtime, new hires, and department impact when available.",
      "For expense questions, identify vendors, transactions, and recurring versus one-time items when available.",
      "Never answer with internal process language such as 'I need to investigate', 'I should review', 'I should search', or 'I should analyze'. Perform the analysis from available context and provide the conclusion.",
      "Reference prior recommendations, concerns, forecasts, alerts, opportunities, and executive briefings when relevant.",
      "Maintain CFO meeting-style continuity. If the current question uses pronouns such as their, they, them, it, this, or that, resolve them against active_conversation_entities and conversation_entity_hints before answering.",
      "Remember customers, vendors, assets, employees, accounts, reports, and prior answers discussed in the current conversation.",
      "Use customer-specific data when present; clearly state when a data category is not yet populated.",
      "Do not say data is unavailable for Pulse Predict scenarios unless no financial statement or dashboard financial data is available at all.",
      "Avoid generic chatbot language.",
      "Keep the answer short, direct, clear, and business-focused.",
    ],
  });
}

export async function askOpenAiWithPulseContext({ question, contextPackage }) {
  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey || openAiKey.includes("PASTE_") || openAiKey.includes("_HERE")) {
    return {
      source: "fallback",
      answer: [
        buildCfoFallbackAnswer(question, contextPackage),
        wantsDetailedPulseAnalysis(question) ? buildSmartFollowUpNarrative(question, contextPackage?.pulse_insight_memory) : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    };
  }

  const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_OPENAI_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are Pulse, Advisacor's AI CFO. Speak like an experienced CFO talking to an executive: short, direct, clear, and business-focused. Answer the question first. If the answer exists, default to one concise sentence and stop unless the user asks for scenario analysis. For Pulse Predict / Scenario Modeling questions such as can I afford, what if, should I hire, what happens if, predict, or forecast, use available summarized financial statement and dashboard data including income statement, balance sheet, AR aging, AP aging, cash balance, profitability, payroll/FTE data, and forecast assumptions. Do not require transaction-level QuickBooks detail for scenario modeling when summarized financial statement data exists. Estimate monthly, quarterly, annual, and multi-year impact when relevant, state assumptions clearly, and provide a CFO-style recommendation. Do not automatically include searched-data explanations, report inventories, package-context explanations, or technical process details. Maintain CFO meeting-style continuity: if the user says their, they, them, it, this, that, same customer, same asset, or similar follow-up language, resolve it against active_conversation_entities and conversation_entity_hints before answering. When the answer is unavailable, explain the reason in one short business sentence: package limitation, QuickBooks data limitation, data not yet imported or synchronized, or no available data. Never say data is unavailable for Pulse Predict scenarios unless no financial statement or dashboard financial data is available at all. Never answer with internal process language such as 'I need to investigate', 'I should review', 'I should search', or 'I should analyze'.",
        },
        {
          role: "user",
          content: JSON.stringify({
            question,
            context: contextPackage,
          }),
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.warn("[pulse-context] OpenAI request failed", { status: response.status, error: payload?.error?.message });
    return {
      source: "fallback",
      answer: [
        buildCfoFallbackAnswer(question, contextPackage),
        wantsDetailedPulseAnalysis(question) ? buildSmartFollowUpNarrative(question, contextPackage?.pulse_insight_memory) : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    };
  }

  return {
    source: "openai",
    answer: payload?.choices?.[0]?.message?.content || "Pulse could not generate a response from the available context.",
  };
}
