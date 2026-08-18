/**
 * Pure AR tie-out measurement. Shared by live-provider and persisted-snapshot paths.
 * Formulas are locked: do not rewrite.
 */

import {
  classifyVariance,
  type PolicySnapshot,
  type VarianceClassification,
} from "./policy";
import type { QboArAgingResult, QboTrialBalanceLine, QboTrialBalanceResult } from "./qbo-reports";

export type ArCustomerMeasurementRow = {
  entity_qbo_id: string | null;
  entity_display_name: string | null;
  subledger_amount_cents: number | null;
  gl_amount_cents: number | null;
  variance_cents: number;
  variance_percent: number | null;
  status: VarianceClassification;
  classification_reason: string | null;
};

export type ArTieOutMeasurement = {
  glLine: QboTrialBalanceLine | undefined;
  glTotalCents: number;
  subTotalCents: number;
  totalsVariance: number;
  totalsClass: ReturnType<typeof classifyVariance>;
  totalsStatus: "tie" | "auto_reconcile" | "review" | "kickout";
  customerRows: ArCustomerMeasurementRow[];
};

export function measureArTieOut(args: {
  aging: QboArAgingResult;
  trialBalance: QboTrialBalanceResult;
  arAccountId: string;
  policy: PolicySnapshot;
}): ArTieOutMeasurement {
  const { aging: subledger, trialBalance: trial, arAccountId, policy } = args;
  const glLine = trial.lines.find((l) => l.account_ref === arAccountId);
  const glTotalCents = glLine ? glLine.net_cents : 0;
  const subTotalCents = subledger.total_cents;
  const totalsVariance = subTotalCents - glTotalCents;
  const totalsClass = classifyVariance(
    totalsVariance,
    glTotalCents !== 0 ? glTotalCents : subTotalCents,
    policy,
  );
  const totalsStatus: ArTieOutMeasurement["totalsStatus"] =
    totalsClass.status === "auto_cleared"
      ? "auto_reconcile"
      : totalsClass.status === "tie"
        ? "tie"
        : totalsClass.status === "review"
          ? "review"
          : "kickout";
  const customerRows: ArCustomerMeasurementRow[] = subledger.customers.map((c) => {
    const isCredit = c.total_cents < 0;
    return {
      entity_qbo_id: c.customer_ref,
      entity_display_name: c.customer_display_name,
      subledger_amount_cents: c.total_cents,
      gl_amount_cents: null,
      variance_cents: 0,
      variance_percent: null,
      status: (isCredit ? "review" : "tie") as VarianceClassification,
      classification_reason: isCredit
        ? "credit-balance customer on AR aging (potential misapplied payment or unearned revenue)"
        : "customer detail row (informational)",
    };
  });
  return {
    glLine,
    glTotalCents,
    subTotalCents,
    totalsVariance,
    totalsClass,
    totalsStatus,
    customerRows,
  };
}
