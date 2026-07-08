export const PRESET_PACK_CODES = [
  "starter",
  "growing",
  "controller_led",
  "firm_managed",
  "high_risk",
] as const;

export type PresetPackCode = (typeof PRESET_PACK_CODES)[number];

export function isPresetPackCode(x: unknown): x is PresetPackCode {
  return typeof x === "string" && (PRESET_PACK_CODES as readonly string[]).includes(x);
}

export type InboxAutonomyLevel = "observe" | "assist" | "execute";
export type InterlockReviewerRole = "firm_admin" | "controller" | "cfo";
export type RequisitionHierarchy = "flat" | "two_tier" | "three_tier";

export interface PackSettings {
  fraud_anomaly_zscore_threshold: number;
  fraud_aggregate_score_threshold: number;
  inbox_autonomy_level: InboxAutonomyLevel;
  interlock_reviewer_role_slug: InterlockReviewerRole;
  aged_prepay_threshold_days: number;
  requisition_approval_hierarchy: RequisitionHierarchy;
  cross_tenant_aggregation_optin: boolean;
}

export interface PackDefinition extends PackSettings {
  pack_code: PresetPackCode;
  display_name: string;
  description: string;
}

export type PackOverrides = Partial<PackSettings>;

export interface EffectiveSettings extends PackSettings {
  pack_code: PresetPackCode;
  overrides_applied: (keyof PackSettings)[];
}
