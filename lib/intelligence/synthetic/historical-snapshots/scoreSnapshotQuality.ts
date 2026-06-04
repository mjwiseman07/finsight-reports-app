import type { SyntheticSnapshotAvailabilitySummary, SyntheticSnapshotQualityScore } from "../types/snapshot-storage";

function factor(code: string, label: string, present: boolean, contribution: number) {
  return {
    code,
    label,
    impact: present ? "positive" as const : "negative" as const,
    factorContribution: present ? contribution : -contribution,
  };
}

export function scoreSnapshotQuality({
  availabilitySummary,
  validationWarningCount = 0,
}: {
  availabilitySummary: SyntheticSnapshotAvailabilitySummary;
  validationWarningCount?: number;
}): SyntheticSnapshotQualityScore {
  const snapshotQualityFactors = [
    factor("balance_sheet_present", "Balance Sheet present", availabilitySummary.hasBalanceSheet, 0.2),
    factor("income_statement_present", "Income Statement present", availabilitySummary.hasIncomeStatement, 0.2),
    factor("trial_balance_present", "Trial Balance present", availabilitySummary.hasTrialBalance, 0.12),
    factor("ar_aging_present", "AR Aging present", availabilitySummary.hasARAging, 0.08),
    factor("ap_aging_present", "AP Aging present", availabilitySummary.hasAPAging, 0.08),
    factor("payroll_available", "Payroll available", availabilitySummary.hasPayroll, 0.05),
    factor("fixed_assets_available", "Fixed Assets available", availabilitySummary.hasFixedAssets, 0.05),
    {
      code: "validation_warnings",
      label: "Validation warnings",
      impact: validationWarningCount ? "negative" as const : "neutral" as const,
      factorContribution: validationWarningCount ? -Math.min(0.12, validationWarningCount * 0.03) : 0,
    },
  ];
  const baseScore = 0.5;
  const score = baseScore + snapshotQualityFactors.reduce((total, item) => total + item.factorContribution, 0);
  return {
    snapshotQualityScore: Math.max(0, Math.min(1, Number(score.toFixed(2)))),
    snapshotQualityFactors,
  };
}
