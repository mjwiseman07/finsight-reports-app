export const healthcareIndustryType = "Healthcare";

export const healthcareOperationalInputSources = [
  "manual",
  "uploaded_census_data",
  "imported_operational_statistics",
];

export const healthcarePeriodTypes = ["month", "quarter", "year"];

export const perPatientDayMetricDefinitions = [
  {
    id: "expensePerPatientDay",
    label: "Expense Per Patient Day",
    numerator: "totalOperatingExpenses",
    numeratorLabel: "Total Operating Expenses",
  },
  {
    id: "laborCostPerPatientDay",
    label: "Labor Cost Per Patient Day",
    numerator: "payrollExpense",
    numeratorLabel: "Payroll Expense",
  },
  {
    id: "revenuePerPatientDay",
    label: "Revenue Per Patient Day",
    numerator: "totalRevenue",
    numeratorLabel: "Total Revenue",
  },
  {
    id: "supplyCostPerPatientDay",
    label: "Supply Cost Per Patient Day",
    numerator: "medicalSuppliesExpense",
    numeratorLabel: "Medical Supplies Expense",
  },
  {
    id: "contractLaborPerPatientDay",
    label: "Contract Labor Per Patient Day",
    numerator: "contractLaborExpense",
    numeratorLabel: "Contract Labor Expense",
  },
];

export const futureHealthcareIntelligenceMetrics = [
  "Average Daily Census",
  "Occupancy %",
  "Patient Days",
  "Net Revenue Per Patient Day",
  "Nursing Hours Per Patient Day",
  "Agency Labor %",
  "Payer Mix Analysis",
  "Denial Trends",
  "DSO",
  "Cash Collections",
];

export const healthcareDemoCompanyId = "11111111-1111-4111-8111-333333333333";

export const healthcareDemoOperationalStats = [
  {
    companyId: healthcareDemoCompanyId,
    periodType: "month",
    periodLabel: "Mar 2026",
    periodStart: "2026-03-01",
    periodEnd: "2026-03-31",
    patientDays: 2720,
    totalRevenue: 1357280,
    totalOperatingExpenses: 1060800,
    payrollExpense: 585000,
    medicalSuppliesExpense: 151000,
    contractLaborExpense: 94000,
    inputSource: "imported_operational_statistics",
    importBatchId: "healthcare-demo-mar-2026",
  },
  {
    companyId: healthcareDemoCompanyId,
    periodType: "month",
    periodLabel: "Apr 2026",
    periodStart: "2026-04-01",
    periodEnd: "2026-04-30",
    patientDays: 2785,
    totalRevenue: 1412000,
    totalOperatingExpenses: 1102860,
    payrollExpense: 612000,
    medicalSuppliesExpense: 158000,
    contractLaborExpense: 102000,
    inputSource: "uploaded_census_data",
    censusFileName: "healthcare-demo-census-apr-2026.csv",
  },
  {
    companyId: healthcareDemoCompanyId,
    periodType: "month",
    periodLabel: "May 2026",
    periodStart: "2026-05-01",
    periodEnd: "2026-05-31",
    patientDays: 2810,
    totalRevenue: 1483680,
    totalOperatingExpenses: 1138050,
    payrollExpense: 636000,
    medicalSuppliesExpense: 166000,
    contractLaborExpense: 112000,
    inputSource: "manual",
  },
];

function toNumber(value) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function divideByPatientDays(numerator, patientDays) {
  const denominator = toNumber(patientDays);
  if (denominator <= 0) return null;
  return toNumber(numerator) / denominator;
}

export function normalizeHealthcareOperationalStats(row = {}) {
  row = row || {};
  return {
    id: row.id || null,
    companyId: row.company_id || row.companyId || "",
    periodType: row.period_type || row.periodType || "month",
    periodLabel: row.period_label || row.periodLabel || "",
    periodStart: row.period_start || row.periodStart || null,
    periodEnd: row.period_end || row.periodEnd || null,
    patientDays: toNumber(row.patient_days ?? row.patientDays),
    totalOperatingExpenses: toNumber(row.total_operating_expenses ?? row.totalOperatingExpenses),
    payrollExpense: toNumber(row.payroll_expense ?? row.payrollExpense),
    totalRevenue: toNumber(row.total_revenue ?? row.totalRevenue),
    medicalSuppliesExpense: toNumber(row.medical_supplies_expense ?? row.medicalSuppliesExpense),
    contractLaborExpense: toNumber(row.contract_labor_expense ?? row.contractLaborExpense),
    inputSource: row.input_source || row.inputSource || "manual",
    censusFileName: row.census_file_name || row.censusFileName || null,
    importBatchId: row.import_batch_id || row.importBatchId || null,
  };
}

export function calculatePerPatientDayMetrics(stats = {}) {
  const normalizedStats = normalizeHealthcareOperationalStats(stats);

  return perPatientDayMetricDefinitions.reduce((metrics, definition) => {
    metrics[definition.id] = {
      id: definition.id,
      label: definition.label,
      numeratorLabel: definition.numeratorLabel,
      patientDays: normalizedStats.patientDays,
      value: divideByPatientDays(normalizedStats[definition.numerator], normalizedStats.patientDays),
    };
    return metrics;
  }, {});
}

export function calculatePercentageChange(currentValue, comparisonValue) {
  if (currentValue === null || comparisonValue === null || comparisonValue === 0) return null;
  return ((currentValue - comparisonValue) / Math.abs(comparisonValue)) * 100;
}

export function buildPerPatientDayTrendAnalysis(currentStats, comparisonStats = {}) {
  const currentMetrics = calculatePerPatientDayMetrics(currentStats);

  return Object.entries(comparisonStats).reduce((analysis, [comparisonKey, stats]) => {
    if (!stats) return analysis;
    const comparisonMetrics = calculatePerPatientDayMetrics(stats);
    analysis[comparisonKey] = perPatientDayMetricDefinitions.map((definition) => ({
      id: definition.id,
      label: definition.label,
      currentValue: currentMetrics[definition.id].value,
      comparisonValue: comparisonMetrics[definition.id].value,
      percentChange: calculatePercentageChange(currentMetrics[definition.id].value, comparisonMetrics[definition.id].value),
    }));
    return analysis;
  }, {});
}

export function buildHealthcareExecutiveCommentary({ currentStats, priorQuarterStats, priorYearStats }) {
  const current = calculatePerPatientDayMetrics(currentStats);
  const priorQuarter = priorQuarterStats ? calculatePerPatientDayMetrics(priorQuarterStats) : null;
  const priorYear = priorYearStats ? calculatePerPatientDayMetrics(priorYearStats) : null;
  const commentary = [];

  const laborQuarterChange = priorQuarter
    ? calculatePercentageChange(current.laborCostPerPatientDay.value, priorQuarter.laborCostPerPatientDay.value)
    : null;
  if (laborQuarterChange !== null && laborQuarterChange > 3) {
    commentary.push(
      "Labor cost per patient day increased while patient volume should be reviewed, indicating higher staffing costs per occupied bed.",
    );
  }

  const revenueYearChange = priorYear
    ? calculatePercentageChange(current.revenuePerPatientDay.value, priorYear.revenuePerPatientDay.value)
    : null;
  if (revenueYearChange !== null && revenueYearChange > 0) {
    commentary.push("Revenue per patient day improved compared with the prior year, even if census levels are flat.");
  }

  const supplyQuarterChange = priorQuarter
    ? calculatePercentageChange(current.supplyCostPerPatientDay.value, priorQuarter.supplyCostPerPatientDay.value)
    : null;
  if (supplyQuarterChange !== null && supplyQuarterChange > 5) {
    commentary.push("Supply cost per patient day increased and should be reviewed for vendor pricing, utilization, or case mix changes.");
  }

  if (commentary.length === 0) {
    commentary.push("Per patient day metrics are ready for healthcare trend review once comparison periods are available.");
  }

  return commentary;
}

export function buildPerPatientDayChartSeries(statsRows = []) {
  return statsRows.map((row) => {
    const stats = normalizeHealthcareOperationalStats(row);
    const metrics = calculatePerPatientDayMetrics(stats);
    return {
      period: stats.periodLabel,
      revenuePerPatientDay: metrics.revenuePerPatientDay.value,
      expensePerPatientDay: metrics.expensePerPatientDay.value,
      laborCostPerPatientDay: metrics.laborCostPerPatientDay.value,
      supplyCostPerPatientDay: metrics.supplyCostPerPatientDay.value,
      contractLaborPerPatientDay: metrics.contractLaborPerPatientDay.value,
    };
  });
}
