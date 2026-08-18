/**
 * Pure AP tie-out measurement. Shared by live-provider and persisted-snapshot paths.
 * Formulas are locked: do not rewrite.
 *
 * AP is credit-normal: GL comparison uses Math.abs(net_cents).
 * Vendor debit balances are review flags with variance_cents = 0.
 */

import {
  classifyVariance,
  type PolicySnapshot,
  type VarianceClassification,
} from "./policy";
import type { QboApAgingResult, QboTrialBalanceLine, QboTrialBalanceResult } from "./qbo-reports";

export type ApVendorMeasurementRow = {
  entity_qbo_id: string | null;
  entity_display_name: string | null;
  subledger_amount_cents: number | null;
  gl_amount_cents: number | null;
  variance_cents: number;
  variance_percent: number | null;
  status: VarianceClassification;
  classification_reason: string | null;
};

export type ApTieOutMeasurement = {
  glLine: QboTrialBalanceLine | undefined;
  glNetCents: number;
  glTotalCents: number;
  subTotalCents: number;
  totalsVariance: number;
  totalsClass: ReturnType<typeof classifyVariance>;
  totalsStatus: "tie" | "auto_reconcile" | "review" | "kickout";
  vendorRows: ApVendorMeasurementRow[];
};

export function measureApTieOut(args: {
  aging: QboApAgingResult;
  trialBalance: QboTrialBalanceResult;
  apAccountId: string;
  policy: PolicySnapshot;
}): ApTieOutMeasurement {
  const { aging: subledger, trialBalance: trial, apAccountId, policy } = args;
  // GL side — AP account is typically a credit-normal account, so its
  // net_cents will be negative (credit > debit). Use absolute value for the
  // comparison against the subledger open-balance total (which is positive).
  const glLine = trial.lines.find((l) => l.account_ref === apAccountId);
  const glNetCents = glLine ? glLine.net_cents : 0;
  const glTotalCents = Math.abs(glNetCents);
  const subTotalCents = subledger.total_cents;
  const totalsVariance = subTotalCents - glTotalCents;
  const totalsClass = classifyVariance(
    totalsVariance,
    glTotalCents !== 0 ? glTotalCents : subTotalCents,
    policy,
  );
  const totalsStatus: ApTieOutMeasurement["totalsStatus"] =
    totalsClass.status === "auto_cleared"
      ? "auto_reconcile"
      : totalsClass.status === "tie"
        ? "tie"
        : totalsClass.status === "review"
          ? "review"
          : "kickout";
  const vendorRows: ApVendorMeasurementRow[] = subledger.vendors.map((vendor) => {
    const isDebitBalance = vendor.total_cents < 0;
    return {
      entity_qbo_id: vendor.vendor_ref,
      entity_display_name: vendor.vendor_display_name,
      subledger_amount_cents: vendor.total_cents,
      gl_amount_cents: null,
      variance_cents: 0,
      variance_percent: null,
      status: (isDebitBalance ? "review" : "tie") as VarianceClassification,
      classification_reason: isDebitBalance
        ? "vendor_debit_balance_review"
        : "vendor detail row (informational)",
    };
  });
  return {
    glLine,
    glNetCents,
    glTotalCents,
    subTotalCents,
    totalsVariance,
    totalsClass,
    totalsStatus,
    vendorRows,
  };
}
