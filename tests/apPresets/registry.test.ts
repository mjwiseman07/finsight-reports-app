import { describe, it, expect } from "vitest";
import {
  PRESET_PACK_DEFINITIONS,
  listPackDefinitions,
  computeEffectiveSettings,
} from "@/lib/ap-intake/presets/registry";
import { PRESET_PACK_CODES } from "@/lib/ap-intake/presets/types";

describe("preset pack registry", () => {
  it("contains exactly 5 packs", () => {
    expect(Object.keys(PRESET_PACK_DEFINITIONS).length).toBe(5);
    expect(PRESET_PACK_CODES.length).toBe(5);
  });

  it("each pack has all 7 setting fields", () => {
    for (const pack of listPackDefinitions()) {
      expect(pack.fraud_anomaly_zscore_threshold).toBeGreaterThan(0);
      expect(pack.fraud_aggregate_score_threshold).toBeGreaterThan(0);
      expect(pack.fraud_aggregate_score_threshold).toBeLessThanOrEqual(1);
      expect(["observe", "assist", "execute"]).toContain(pack.inbox_autonomy_level);
      expect(["firm_admin", "controller", "cfo"]).toContain(pack.interlock_reviewer_role_slug);
      expect(pack.aged_prepay_threshold_days).toBeGreaterThan(0);
      expect(["flat", "two_tier", "three_tier"]).toContain(pack.requisition_approval_hierarchy);
      expect(typeof pack.cross_tenant_aggregation_optin).toBe("boolean");
    }
  });

  it("high_risk is the only pack with cross_tenant_aggregation_optin=true", () => {
    const withOptin = listPackDefinitions().filter((p) => p.cross_tenant_aggregation_optin);
    expect(withOptin.length).toBe(1);
    expect(withOptin[0].pack_code).toBe("high_risk");
  });

  it("computeEffectiveSettings merges overrides and tracks which keys were applied", () => {
    const eff = computeEffectiveSettings("starter", {
      inbox_autonomy_level: "execute",
      aged_prepay_threshold_days: 15,
    });
    expect(eff.pack_code).toBe("starter");
    expect(eff.inbox_autonomy_level).toBe("execute");
    expect(eff.aged_prepay_threshold_days).toBe(15);
    expect(eff.fraud_anomaly_zscore_threshold).toBe(2.5);
    expect(eff.overrides_applied.sort()).toEqual(
      ["aged_prepay_threshold_days", "inbox_autonomy_level"].sort(),
    );
  });
});
