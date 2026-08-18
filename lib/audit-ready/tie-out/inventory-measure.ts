/**
 * Pure Inventory tie-out measurement. Shared by live-provider and persisted-snapshot paths.
 * Formulas are locked: do not rewrite.
 *
 * Inventory is debit-normal: GL comparison uses signed net_cents without absolute-value wrapping.
 * Negative qty / negative asset-value rows are review flags with variance_cents = 0.
 */

import {
  classifyVariance,
  type PolicySnapshot,
  type VarianceClassification,
} from "./policy";
import type {
  QboInventoryValuationResult,
  QboTrialBalanceLine,
  QboTrialBalanceResult,
} from "./qbo-reports";

export type InventoryItemMeasurementRow = {
  entity_qbo_id: string | null;
  entity_display_name: string | null;
  subledger_amount_cents: number | null;
  gl_amount_cents: number | null;
  variance_cents: number;
  variance_percent: number | null;
  status: VarianceClassification;
  classification_reason: string | null;
};

export type InventoryTieOutMeasurement = {
  glLine: QboTrialBalanceLine | undefined;
  glTotalCents: number;
  subTotalCents: number;
  totalsVariance: number;
  totalsClass: ReturnType<typeof classifyVariance>;
  totalsStatus: "tie" | "auto_reconcile" | "review" | "kickout";
  itemRows: InventoryItemMeasurementRow[];
};

export function measureInventoryTieOut(args: {
  valuation: QboInventoryValuationResult;
  trialBalance: QboTrialBalanceResult;
  inventoryAccountId: string;
  policy: PolicySnapshot;
}): InventoryTieOutMeasurement {
  const { valuation: subledger, trialBalance: trial, inventoryAccountId, policy } = args;
  const glLine = trial.lines.find((l) => l.account_ref === inventoryAccountId);
  const glTotalCents = glLine ? glLine.net_cents : 0; // Inventory is debit-normal
  const subTotalCents = subledger.total_cents;
  const totalsVariance = subTotalCents - glTotalCents;
  const totalsClass = classifyVariance(
    totalsVariance,
    glTotalCents !== 0 ? glTotalCents : subTotalCents,
    policy,
  );
  const totalsStatus: InventoryTieOutMeasurement["totalsStatus"] =
    totalsClass.status === "auto_cleared"
      ? "auto_reconcile"
      : totalsClass.status === "tie"
        ? "tie"
        : totalsClass.status === "review"
          ? "review"
          : "kickout";
  const itemRows: InventoryItemMeasurementRow[] = subledger.items.map((item) => {
    const isNegativeOnHand = item.qty_on_hand < 0;
    const isNegativeAssetValue = item.asset_value_cents < 0;
    const flagReview = isNegativeOnHand || isNegativeAssetValue;
    return {
      entity_qbo_id: item.item_ref,
      entity_display_name: item.item_display_name,
      subledger_amount_cents: item.asset_value_cents,
      gl_amount_cents: null,
      variance_cents: 0,
      variance_percent: null,
      status: (flagReview ? "review" : "tie") as VarianceClassification,
      classification_reason: isNegativeOnHand
        ? "item_negative_qty_on_hand"
        : isNegativeAssetValue
          ? "item_negative_asset_value"
          : "item detail row (informational)",
    };
  });
  return {
    glLine,
    glTotalCents,
    subTotalCents,
    totalsVariance,
    totalsClass,
    totalsStatus,
    itemRows,
  };
}
