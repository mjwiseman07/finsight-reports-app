import type { SyntheticSnapshotAvailabilitySummary, SyntheticSnapshotPayload } from "../types/snapshot-storage";

function count(rows?: Record<string, unknown>[]) {
  return rows?.length || 0;
}

export function buildAvailabilitySummary(payload: SyntheticSnapshotPayload): SyntheticSnapshotAvailabilitySummary {
  const rowCounts = {
    balanceSheet: count(payload.balanceSheet),
    incomeStatement: count(payload.incomeStatement),
    trialBalance: count(payload.trialBalance),
    arAging: count(payload.arAging),
    apAging: count(payload.apAging),
    fixedAssets: count(payload.fixedAssets),
    inventory: count(payload.inventory),
    payroll: count(payload.payroll),
    debt: count(payload.debt),
    budgets: count(payload.budgets),
  };
  return {
    hasBalanceSheet: rowCounts.balanceSheet > 0,
    hasIncomeStatement: rowCounts.incomeStatement > 0,
    hasTrialBalance: rowCounts.trialBalance > 0,
    hasARAging: rowCounts.arAging > 0,
    hasAPAging: rowCounts.apAging > 0,
    hasFixedAssets: rowCounts.fixedAssets > 0,
    hasInventory: rowCounts.inventory > 0,
    hasPayroll: rowCounts.payroll > 0,
    hasDebt: rowCounts.debt > 0,
    hasBudgets: rowCounts.budgets > 0,
    rowCounts,
    sourceReports: {
      balanceSheet: rowCounts.balanceSheet ? ["BalanceSheet"] : [],
      incomeStatement: rowCounts.incomeStatement ? ["ProfitAndLoss"] : [],
      trialBalance: rowCounts.trialBalance ? ["TrialBalance"] : [],
      arAging: rowCounts.arAging ? ["ARAging"] : [],
      apAging: rowCounts.apAging ? ["APAging"] : [],
      fixedAssets: rowCounts.fixedAssets ? ["FixedAssets"] : [],
      inventory: rowCounts.inventory ? ["Inventory"] : [],
      payroll: rowCounts.payroll ? ["Payroll"] : [],
      debt: rowCounts.debt ? ["Debt"] : [],
      budgets: rowCounts.budgets ? ["Budgets"] : [],
    },
  };
}
