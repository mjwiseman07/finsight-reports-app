import type {
  EffectiveSettings,
  PackDefinition,
  PackOverrides,
  PackSettings,
  PresetPackCode,
} from "./types";
import { PRESET_PACK_CODES } from "./types";

export const PRESET_PACK_DEFINITIONS: Record<PresetPackCode, PackDefinition> = {
  starter: {
    pack_code: "starter",
    display_name: "Starter",
    description:
      "Small businesses with a single approver. Loose thresholds, high-touch reviewer intervention.",
    fraud_anomaly_zscore_threshold: 2.5,
    fraud_aggregate_score_threshold: 0.75,
    inbox_autonomy_level: "observe",
    interlock_reviewer_role_slug: "firm_admin",
    aged_prepay_threshold_days: 90,
    requisition_approval_hierarchy: "flat",
    cross_tenant_aggregation_optin: false,
  },
  growing: {
    pack_code: "growing",
    display_name: "Growing",
    description: "Scaling teams with two-tier approvals. Balanced automation.",
    fraud_anomaly_zscore_threshold: 2.0,
    fraud_aggregate_score_threshold: 0.65,
    inbox_autonomy_level: "assist",
    interlock_reviewer_role_slug: "controller",
    aged_prepay_threshold_days: 60,
    requisition_approval_hierarchy: "two_tier",
    cross_tenant_aggregation_optin: false,
  },
  controller_led: {
    pack_code: "controller_led",
    display_name: "Controller-Led",
    description: "Controller owns AP decisions end-to-end. Elevated autonomy.",
    fraud_anomaly_zscore_threshold: 1.75,
    fraud_aggregate_score_threshold: 0.55,
    inbox_autonomy_level: "execute",
    interlock_reviewer_role_slug: "controller",
    aged_prepay_threshold_days: 45,
    requisition_approval_hierarchy: "two_tier",
    cross_tenant_aggregation_optin: false,
  },
  firm_managed: {
    pack_code: "firm_managed",
    display_name: "Firm-Managed",
    description:
      "Outsourced bookkeeping firm operates on behalf of client. Firm-admin gating.",
    fraud_anomaly_zscore_threshold: 1.75,
    fraud_aggregate_score_threshold: 0.55,
    inbox_autonomy_level: "execute",
    interlock_reviewer_role_slug: "firm_admin",
    aged_prepay_threshold_days: 45,
    requisition_approval_hierarchy: "three_tier",
    cross_tenant_aggregation_optin: false,
  },
  high_risk: {
    pack_code: "high_risk",
    display_name: "High-Risk",
    description:
      "Elevated fraud posture. Tight thresholds, mandatory CFO review, cross-tenant intel opt-in.",
    fraud_anomaly_zscore_threshold: 1.25,
    fraud_aggregate_score_threshold: 0.4,
    inbox_autonomy_level: "observe",
    interlock_reviewer_role_slug: "cfo",
    aged_prepay_threshold_days: 30,
    requisition_approval_hierarchy: "three_tier",
    cross_tenant_aggregation_optin: true,
  },
};

export function getPackDefinition(code: PresetPackCode): PackDefinition {
  return PRESET_PACK_DEFINITIONS[code];
}

export function listPackDefinitions(): PackDefinition[] {
  return PRESET_PACK_CODES.map((c) => PRESET_PACK_DEFINITIONS[c]);
}

const OVERRIDABLE_KEYS: readonly (keyof PackSettings)[] = [
  "fraud_anomaly_zscore_threshold",
  "fraud_aggregate_score_threshold",
  "inbox_autonomy_level",
  "interlock_reviewer_role_slug",
  "aged_prepay_threshold_days",
  "requisition_approval_hierarchy",
  "cross_tenant_aggregation_optin",
];

export function computeEffectiveSettings(
  packCode: PresetPackCode,
  overrides: PackOverrides,
): EffectiveSettings {
  const base = PRESET_PACK_DEFINITIONS[packCode];
  const applied: (keyof PackSettings)[] = [];
  const result: PackSettings = {
    fraud_anomaly_zscore_threshold: base.fraud_anomaly_zscore_threshold,
    fraud_aggregate_score_threshold: base.fraud_aggregate_score_threshold,
    inbox_autonomy_level: base.inbox_autonomy_level,
    interlock_reviewer_role_slug: base.interlock_reviewer_role_slug,
    aged_prepay_threshold_days: base.aged_prepay_threshold_days,
    requisition_approval_hierarchy: base.requisition_approval_hierarchy,
    cross_tenant_aggregation_optin: base.cross_tenant_aggregation_optin,
  };
  for (const key of OVERRIDABLE_KEYS) {
    const v = overrides[key];
    if (v !== undefined && v !== null) {
      (result as unknown as Record<string, unknown>)[key] = v;
      applied.push(key);
    }
  }
  return { pack_code: packCode, ...result, overrides_applied: applied };
}
