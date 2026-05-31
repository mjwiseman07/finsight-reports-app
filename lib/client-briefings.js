export const briefingCadences = ["weekly", "bi-weekly", "monthly", "quarterly", "custom"];

export const briefingCadenceLabels = {
  weekly: "Weekly",
  "bi-weekly": "Bi-weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  custom: "Custom",
};

export const briefingDeliveryMethods = ["email", "dashboard", "both"];

export const briefingStatuses = ["Draft", "Pending Approval", "Approved", "Sent", "Failed", "Skipped"];

export const briefingRiskLevels = ["Low", "Medium", "High"];

export const briefingCriticalReports = [
  "Balance Sheet",
  "Income Statement",
  "AR Aging",
  "AP Aging",
];

export const briefingOptionalReports = [
  "Payroll Report",
  "FTE Report",
  "Inventory Report",
  "Cash Flow",
  "Budget / Forecast",
];

export const demoFirmBranding = {
  firmName: "Advisacor Demo Advisory",
  advisorName: "Morgan Ellis, Fractional CFO",
  replyToEmail: "advisor@advisacor.com",
  footerDisclaimer:
    "This briefing is intended for management discussion and should be reviewed with your advisor before making material financial decisions.",
  customIntroMessage:
    "Every client gets a CFO-style briefing at the cadence the firm chooses, without manually writing every update.",
};

export function normalizeBriefingSettings(row = {}) {
  return {
    id: row.id,
    firmId: row.firm_id || row.firmId || "",
    clientId: row.client_id || row.clientId || "",
    cadence: row.cadence || "weekly",
    dayOfWeek: row.day_of_week || row.dayOfWeek || "Friday",
    deliveryTime: row.delivery_time || row.deliveryTime || "08:00",
    timezone: row.timezone || "America/New_York",
    deliveryMethod: row.delivery_method || row.deliveryMethod || "both",
    approvalRequired: Boolean(row.approval_required ?? row.approvalRequired ?? true),
    isActive: Boolean(row.is_active ?? row.isActive ?? true),
    createdAt: row.created_at || row.createdAt || "",
    updatedAt: row.updated_at || row.updatedAt || "",
  };
}

export function normalizeBriefing(row = {}) {
  return {
    id: row.id,
    firmId: row.firm_id || row.firmId || "",
    clientId: row.client_id || row.clientId || "",
    clientName: row.firm_clients?.name || row.client_name || row.clientName || "Client",
    firmName: row.firms?.name || row.firm_name || row.firmName || demoFirmBranding.firmName,
    periodStart: row.period_start || row.periodStart || "",
    periodEnd: row.period_end || row.periodEnd || "",
    briefingType: row.briefing_type || row.briefingType || "both",
    status: row.status || "Draft",
    clientBriefingContent: row.client_briefing_content || row.clientBriefingContent || {},
    advisorBriefingContent: row.advisor_briefing_content || row.advisorBriefingContent || {},
    missingReports: Array.isArray(row.missing_reports) ? row.missing_reports : row.missingReports || [],
    riskLevel: row.risk_level || row.riskLevel || "Low",
    generatedAt: row.generated_at || row.generatedAt || "",
    approvedAt: row.approved_at || row.approvedAt || "",
    sentAt: row.sent_at || row.sentAt || "",
    createdBy: row.created_by || row.createdBy || "",
    updatedAt: row.updated_at || row.updatedAt || "",
  };
}

export function normalizeBriefingEvent(row = {}) {
  return {
    id: row.id,
    briefingId: row.briefing_id || row.briefingId || "",
    eventType: row.event_type || row.eventType || "",
    eventDescription: row.event_description || row.eventDescription || "",
    createdAt: row.created_at || row.createdAt || "",
    createdBy: row.created_by || row.createdBy || "",
  };
}

export function normalizeBriefingDashboardRow({ client = {}, settings = {}, briefing = {} }) {
  const normalizedSettings = normalizeBriefingSettings(settings);
  const normalizedBriefing = briefing?.id ? normalizeBriefing(briefing) : null;
  const missingReports = normalizedBriefing?.missingReports || [];

  return {
    clientId: client.id,
    clientName: client.name || "Unnamed Client",
    cadence: briefingCadenceLabels[normalizedSettings.cadence] || "Weekly",
    lastBriefingSent: normalizedBriefing?.sentAt || client.last_package_generated || "Not sent",
    nextScheduledBriefing: calculateNextScheduledBriefing(normalizedSettings),
    status: normalizedBriefing?.status || "Skipped",
    approvalRequired: normalizedSettings.approvalRequired,
    missingReports,
    riskLevel: normalizedBriefing?.riskLevel || mapClientHealthToRisk(client.health_status),
    settings: normalizedSettings,
    latestBriefing: normalizedBriefing,
  };
}

export function calculateNextScheduledBriefing(settings = {}) {
  const normalized = normalizeBriefingSettings(settings);
  if (!normalized.isActive) return "Inactive";

  const cadence = briefingCadenceLabels[normalized.cadence] || "Custom";
  return `${cadence} on ${normalized.dayOfWeek} at ${normalized.deliveryTime} ${normalized.timezone}`;
}

export function mapClientHealthToRisk(healthStatus = "") {
  if (healthStatus === "Needs Attention") return "High";
  if (healthStatus === "Moderate Review") return "Medium";
  return "Low";
}

export function calculateRiskLevel(metrics = {}, missingReports = []) {
  let concernCount = 0;

  if (Number(metrics.cashMovement || 0) < 0) concernCount += 1;
  if (Number(metrics.revenueMovementPercent || 0) < 0) concernCount += 1;
  if (Number(metrics.arOver60Change || 0) > 0) concernCount += 1;
  if (Number(metrics.grossMarginMovementPercent || 0) < 0) concernCount += 1;
  if (Number(metrics.profitMovementPercent || 0) < 0) concernCount += 1;

  const missingCriticalReports = missingReports.filter((report) => briefingCriticalReports.includes(report));
  if (missingCriticalReports.length >= 2) concernCount += 2;
  if (missingCriticalReports.length === 1) concernCount += 1;

  if (concernCount >= 3) return "High";
  if (concernCount >= 1) return "Medium";
  return "Low";
}

export function getDemoFinancialMetrics(client = {}) {
  const name = String(client.name || "").toLowerCase();

  if (name.includes("construction")) {
    return {
      revenueMovementPercent: -3.2,
      revenueMovementAmount: -28400,
      cashMovement: -42500,
      profitabilityMovementPercent: -1.8,
      grossMarginMovementPercent: -2.4,
      ebitdaMovementPercent: -2.1,
      arOver60Change: 31200,
      apAgingChange: 18400,
      payrollMovementPercent: 4.2,
      fteMovement: 2,
      inventoryMovement: 0,
      budgetVariancePercent: -4.5,
      missingReports: ["Inventory Report"],
    };
  }

  if (name.includes("healthcare")) {
    return {
      revenueMovementPercent: 6.4,
      revenueMovementAmount: 52200,
      cashMovement: -12500,
      profitabilityMovementPercent: 1.2,
      grossMarginMovementPercent: 0.8,
      ebitdaMovementPercent: 1.1,
      arOver60Change: 18200,
      apAgingChange: -5100,
      payrollMovementPercent: 3.6,
      fteMovement: 1,
      inventoryMovement: 0,
      budgetVariancePercent: 2.2,
      missingReports: ["FTE Report"],
    };
  }

  if (name.includes("distribution") || name.includes("manufacturing")) {
    return {
      revenueMovementPercent: 8.4,
      revenueMovementAmount: 74600,
      cashMovement: -18600,
      profitabilityMovementPercent: -0.9,
      grossMarginMovementPercent: -1.6,
      ebitdaMovementPercent: -1.0,
      arOver60Change: 21800,
      apAgingChange: 9400,
      payrollMovementPercent: 1.9,
      fteMovement: 0,
      inventoryMovement: 36400,
      budgetVariancePercent: 1.4,
      missingReports: [],
    };
  }

  return {
    revenueMovementPercent: 4.7,
    revenueMovementAmount: 38500,
    cashMovement: 9800,
    profitabilityMovementPercent: 2.3,
    grossMarginMovementPercent: 1.1,
    ebitdaMovementPercent: 2.6,
    arOver60Change: -7200,
    apAgingChange: 3400,
    payrollMovementPercent: 2.1,
    fteMovement: 1,
    inventoryMovement: 0,
    budgetVariancePercent: 3.1,
    missingReports: ["Inventory Report"],
  };
}

export function buildClientBriefingPrompt({ client = {}, firm = {}, metrics = {}, missingReports = [] }) {
  return [
    "Create a CFO-style client briefing for a business owner.",
    `Client: ${client.name || "Client"}`,
    `Firm: ${firm.name || demoFirmBranding.firmName}`,
    "Tone: simple, confident, practical, not overly technical.",
    "Separate facts from recommendations.",
    "Avoid overpromising and clearly mention missing data limitations.",
    `Metrics: ${JSON.stringify(metrics)}`,
    `Missing reports: ${missingReports.length ? missingReports.join(", ") : "None"}`,
  ].join("\n");
}

export function buildBriefingContent({ client = {}, firm = {}, metrics = getDemoFinancialMetrics(client), missingReports = [] }) {
  const allMissingReports = Array.from(new Set([...(metrics.missingReports || []), ...missingReports]));
  const riskLevel = calculateRiskLevel(metrics, allMissingReports);
  const positiveRevenue = Number(metrics.revenueMovementPercent || 0) >= 0;
  const cashMovement = Number(metrics.cashMovement || 0);
  const arMovement = Number(metrics.arOver60Change || 0);

  const missingDataNotice = allMissingReports.length
    ? allMissingReports.map((report) => `Limited insight available because ${report} was not provided.`)
    : ["All critical reports were available for this briefing."];

  const recommendedActions = [
    arMovement > 0
      ? "Follow up on the largest overdue customer balances this week to reduce short-term cash pressure."
      : "Keep the current collections rhythm in place because aged receivables improved.",
    cashMovement < 0
      ? "Review the next two weeks of payroll and vendor payments against expected receipts."
      : "Maintain the current cash discipline and confirm upcoming vendor commitments are covered.",
    Number(metrics.grossMarginMovementPercent || 0) < 0
      ? "Review pricing, job costs, or material/labor changes that pressured margin."
      : "Use the favorable margin movement as a baseline for the next client discussion.",
  ];

  const clientBriefingContent = {
    executiveSummary: positiveRevenue
      ? `Revenue increased ${Math.abs(metrics.revenueMovementPercent).toFixed(1)}% compared to the prior period, which is a positive trend. Cash ${cashMovement < 0 ? "decreased" : "increased"} by ${formatCurrency(Math.abs(cashMovement))}, and receivables ${arMovement > 0 ? "need attention because older balances increased" : "improved as older balances declined"}.`
      : `Revenue decreased ${Math.abs(metrics.revenueMovementPercent).toFixed(1)}% compared to the prior period. Cash ${cashMovement < 0 ? "also decreased" : "improved"}, so the next discussion should focus on revenue recovery, collections, and expense timing.`,
    revenue: `Revenue ${positiveRevenue ? "increased" : "decreased"} by ${formatCurrency(Math.abs(metrics.revenueMovementAmount || 0))}, or ${Math.abs(metrics.revenueMovementPercent || 0).toFixed(1)}%, compared to the prior period.`,
    cash: `Cash ${cashMovement < 0 ? "decreased" : "increased"} by ${formatCurrency(Math.abs(cashMovement))}. This movement appears tied to normal operating activity, payroll, vendor payments, and customer collections timing.`,
    profitability: `Profitability moved ${Number(metrics.profitabilityMovementPercent || 0) >= 0 ? "up" : "down"} ${Math.abs(metrics.profitabilityMovementPercent || 0).toFixed(1)}%, with gross margin ${Number(metrics.grossMarginMovementPercent || 0) >= 0 ? "improving" : "softening"} by ${Math.abs(metrics.grossMarginMovementPercent || 0).toFixed(1)}%.`,
    receivables: arMovement > 0
      ? `Accounts receivable over 60 days increased by ${formatCurrency(arMovement)}, which may create short-term cash pressure if not addressed.`
      : `Accounts receivable over 60 days decreased by ${formatCurrency(Math.abs(arMovement))}, which supports healthier cash conversion.`,
    payables: `Accounts payable aging changed by ${formatCurrency(Math.abs(metrics.apAgingChange || 0))}. The client should confirm vendor timing aligns with expected cash receipts.`,
    payroll: `Payroll and labor costs moved ${Math.abs(metrics.payrollMovementPercent || 0).toFixed(1)}%, with FTE movement of ${metrics.fteMovement || 0}.`,
    inventory: Number(metrics.inventoryMovement || 0)
      ? `Inventory increased by ${formatCurrency(Math.abs(metrics.inventoryMovement))}. Review whether the increase supports near-term sales or creates carrying-cost risk.`
      : "Inventory did not create a material briefing item for this period.",
    risks: buildRiskNarrative(riskLevel, allMissingReports),
    recommendedActions,
    missingDataNotice,
  };

  const advisorBriefingContent = {
    revenueVariance: `${formatPercent(metrics.revenueMovementPercent)} revenue variance, or ${formatCurrency(metrics.revenueMovementAmount || 0)}.`,
    grossMarginVariance: `${formatPercent(metrics.grossMarginMovementPercent)} gross margin variance.`,
    ebitdaVariance: `${formatPercent(metrics.ebitdaMovementPercent)} EBITDA/profit variance.`,
    cashMovementByDriver: `Cash movement of ${formatCurrency(metrics.cashMovement || 0)} appears driven by payroll, vendor payments, and collections timing.`,
    arAgingChanges: `${formatCurrency(metrics.arOver60Change || 0)} change in AR over 60 days.`,
    apAgingChanges: `${formatCurrency(metrics.apAgingChange || 0)} change in aged AP exposure.`,
    payrollFteTrends: `${formatPercent(metrics.payrollMovementPercent)} payroll movement with ${metrics.fteMovement || 0} FTE change.`,
    inventoryMovement: `${formatCurrency(metrics.inventoryMovement || 0)} inventory movement.`,
    budgetVsActual: `${formatPercent(metrics.budgetVariancePercent)} budget variance.`,
    kpiExceptions: buildKpiExceptions(metrics, allMissingReports),
    riskFlags: buildRiskFlags(metrics, allMissingReports),
    suggestedTalkingPoints: [
      "Confirm whether revenue movement is timing or recurring demand.",
      "Discuss overdue AR ownership and weekly follow-up cadence.",
      "Review cash requirements before the next payroll and vendor cycle.",
      "Use missing report notices to request better data for the next briefing.",
    ],
    prompt: buildClientBriefingPrompt({ client, firm, metrics, missingReports: allMissingReports }),
  };

  return {
    clientBriefingContent,
    advisorBriefingContent,
    missingReports: allMissingReports,
    riskLevel,
  };
}

export function buildRiskNarrative(riskLevel, missingReports = []) {
  if (riskLevel === "High") {
    return `High risk briefing: multiple financial movements require advisor review. ${missingReports.length ? "Some insight is limited by missing reports." : "Critical reports were available."}`;
  }

  if (riskLevel === "Medium") {
    return `Medium risk briefing: one or two items need attention, but the overall picture is manageable with timely follow-up.`;
  }

  return "Low risk briefing: no major negative trends were identified from the available reports.";
}

export function buildKpiExceptions(metrics = {}, missingReports = []) {
  return [
    Number(metrics.cashMovement || 0) < 0 ? "Cash declined during the period." : "",
    Number(metrics.revenueMovementPercent || 0) < 0 ? "Revenue declined versus the prior period." : "",
    Number(metrics.arOver60Change || 0) > 0 ? "AR over 60 days increased." : "",
    Number(metrics.grossMarginMovementPercent || 0) < 0 ? "Gross margin declined." : "",
    missingReports.length ? `Missing data: ${missingReports.join(", ")}.` : "",
  ].filter(Boolean);
}

export function buildRiskFlags(metrics = {}, missingReports = []) {
  return [
    Number(metrics.cashMovement || 0) < 0 ? "declining_cash" : "",
    Number(metrics.revenueMovementPercent || 0) < 0 ? "declining_revenue" : "",
    Number(metrics.arOver60Change || 0) > 0 ? "rising_ar" : "",
    Number(metrics.grossMarginMovementPercent || 0) < 0 ? "margin_decline" : "",
    missingReports.some((report) => briefingCriticalReports.includes(report)) ? "missing_critical_reports" : "",
  ].filter(Boolean);
}

export function formatCurrency(value = 0) {
  const amount = Number(value || 0);
  const sign = amount < 0 ? "-" : "";
  return `${sign}$${Math.abs(amount).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function formatPercent(value = 0) {
  const amount = Number(value || 0);
  return `${amount >= 0 ? "+" : ""}${amount.toFixed(1)}%`;
}

export function normalizeBriefingInput(body = {}) {
  return {
    clientId: String(body.client_id || body.clientId || "").trim(),
    cadence: briefingCadences.includes(body.cadence) ? body.cadence : "weekly",
    dayOfWeek: String(body.day_of_week || body.dayOfWeek || "Friday").trim(),
    deliveryTime: String(body.delivery_time || body.deliveryTime || "08:00").trim(),
    timezone: String(body.timezone || "America/New_York").trim(),
    deliveryMethod: briefingDeliveryMethods.includes(body.delivery_method || body.deliveryMethod)
      ? body.delivery_method || body.deliveryMethod
      : "both",
    approvalRequired: Boolean(body.approval_required ?? body.approvalRequired ?? true),
    isActive: Boolean(body.is_active ?? body.isActive ?? true),
  };
}
