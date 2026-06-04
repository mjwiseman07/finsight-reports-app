import type { SyntheticSnapshotPayload } from "../types/snapshot-storage";
import type { SnapshotPayloadBuilderInput } from "./types";

const rows = (value?: Record<string, unknown>[]) => value || [];

export function buildSnapshotPayload(input: SnapshotPayloadBuilderInput): SyntheticSnapshotPayload {
  const data = input.normalizedData;
  return {
    balanceSheet: rows(data.normalizedBalanceSheet),
    incomeStatement: rows(data.normalizedIncomeStatement),
    incomeStatementYtd: rows(data.normalizedIncomeStatementYtd),
    trialBalance: rows(data.normalizedTrialBalance),
    arAging: rows(data.normalizedARAging),
    apAging: rows(data.normalizedAPAging),
    fixedAssets: rows(input.fixedAssets),
    inventory: rows(input.inventory),
    payroll: rows(input.payroll),
    debt: rows(input.debt),
    budgets: rows(data.normalizedBudgets),
    dimensions: {
      departments: rows(data.normalizedDepartments),
      locations: rows(data.normalizedLocations),
      classes: rows(data.normalizedClasses),
      projects: rows(data.normalizedProjects),
      vendors: rows(data.normalizedVendors),
      customers: rows(data.normalizedCustomers),
    },
  };
}
