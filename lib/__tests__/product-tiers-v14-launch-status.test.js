import { describe, it, expect } from "vitest";
import {
  LAUNCH_STATUS,
  LAUNCH_STATUS_VALUES,
  SUPER_ADMIN_PACKAGE_GROUP,
  getLiveTiers,
  getTestingTiers,
  getComingSoonTiers,
  getBundleLaunchStatus,
  isBundleReadyForLive,
  getSuperAdminPackageLevels,
  getSuperAdminPackageGroups,
  TIERS,
} from "../product-tiers.js";

describe("v1.4 launch status enums", () => {
  it("exposes LAUNCH_STATUS constants with expected values", () => {
    expect(LAUNCH_STATUS.LIVE).toBe("live");
    expect(LAUNCH_STATUS.TESTING).toBe("testing");
    expect(LAUNCH_STATUS.COMING_SOON).toBe("coming_soon");
    expect(LAUNCH_STATUS.ARCHIVED).toBe("archived");
  });

  it("freezes LAUNCH_STATUS to prevent mutation", () => {
    expect(Object.isFrozen(LAUNCH_STATUS)).toBe(true);
  });

  it("LAUNCH_STATUS_VALUES contains all four states", () => {
    expect(LAUNCH_STATUS_VALUES).toEqual(["live", "testing", "coming_soon", "archived"]);
  });

  it("SUPER_ADMIN_PACKAGE_GROUP has all expected buckets", () => {
    expect(SUPER_ADMIN_PACKAGE_GROUP.V14_LIVE).toBe("v14Live");
    expect(SUPER_ADMIN_PACKAGE_GROUP.V14_TESTING).toBe("v14Testing");
    expect(SUPER_ADMIN_PACKAGE_GROUP.V14_COMING_SOON).toBe("v14ComingSoon");
    expect(SUPER_ADMIN_PACKAGE_GROUP.LEGACY_OWNER).toBe("legacyOwner");
    expect(SUPER_ADMIN_PACKAGE_GROUP.ARCHIVED).toBe("archived");
  });
});

describe("v1.4 tier launch_status defaults", () => {
  it("review_assist starts as testing", () => {
    expect(TIERS.review_assist.launch_status).toBe(LAUNCH_STATUS.TESTING);
  });

  it("all v1.4 add-ons start as testing", () => {
    const testingKeys = [
      "ra_cashapp_addon",
      "ra_je_write_addon",
      "review_assist_pro",
      "ra_pro_cashapp_addon",
      "ra_pro_ar_addon",
      "ra_pro_ap_addon",
      "ra_pro_billpay_connector_addon",
      "ra_pro_billpay_native_addon",
      "ra_pro_full_bundle",
      "ra_pro_full_native_bundle",
    ];
    for (const key of testingKeys) {
      expect(TIERS[key], `${key} missing`).toBeDefined();
      expect(TIERS[key].launch_status, `${key} launch_status`).toBe(LAUNCH_STATUS.TESTING);
    }
  });

  it("payroll add-on is coming_soon", () => {
    expect(TIERS.ra_pro_payroll_addon.launch_status).toBe(LAUNCH_STATUS.COMING_SOON);
  });

  it("solo_bookkeeper is archived", () => {
    expect(TIERS.solo_bookkeeper.launch_status).toBe(LAUNCH_STATUS.ARCHIVED);
  });

  it("legacy catalog tiers have no launch_status field", () => {
    // Catalog keys are owner_lite / owner_pro (not Essential/Professional/Virtual CFO display labels).
    expect(TIERS.owner_lite.launch_status).toBeUndefined();
    expect(TIERS.owner_pro.launch_status).toBeUndefined();
    expect(TIERS.firm.launch_status).toBeUndefined();
  });
});

describe("getLiveTiers", () => {
  it("returns legacy catalog tiers (no launch_status field) as live", () => {
    const live = getLiveTiers();
    expect(live).toContain("owner_lite");
    expect(live).toContain("owner_pro");
    expect(live).toContain("firm");
  });

  it("excludes testing tiers", () => {
    const live = getLiveTiers();
    expect(live).not.toContain("review_assist");
    expect(live).not.toContain("review_assist_pro");
  });

  it("excludes archived tiers", () => {
    const live = getLiveTiers();
    expect(live).not.toContain("solo_bookkeeper");
  });

  it("excludes coming_soon tiers", () => {
    const live = getLiveTiers();
    expect(live).not.toContain("ra_pro_payroll_addon");
  });
});

describe("getTestingTiers", () => {
  it("returns all 10 v1.4 testing tiers", () => {
    const testing = getTestingTiers();
    expect(testing.length).toBeGreaterThanOrEqual(10);
    expect(testing).toContain("review_assist");
    expect(testing).toContain("review_assist_pro");
    expect(testing).toContain("ra_pro_full_bundle");
    expect(testing).toContain("ra_pro_full_native_bundle");
  });

  it("does not include payroll (coming_soon) or solo_bookkeeper (archived)", () => {
    const testing = getTestingTiers();
    expect(testing).not.toContain("ra_pro_payroll_addon");
    expect(testing).not.toContain("solo_bookkeeper");
  });
});

describe("getComingSoonTiers", () => {
  it("includes payroll add-on", () => {
    expect(getComingSoonTiers()).toContain("ra_pro_payroll_addon");
  });
});

describe("getBundleLaunchStatus", () => {
  it("returns testing for ra_pro_full_bundle since children are testing", () => {
    expect(getBundleLaunchStatus("ra_pro_full_bundle")).toBe(LAUNCH_STATUS.TESTING);
  });

  it("returns testing for ra_pro_full_native_bundle since children are testing", () => {
    expect(getBundleLaunchStatus("ra_pro_full_native_bundle")).toBe(LAUNCH_STATUS.TESTING);
  });

  it("returns archived for a bundle key that does not exist", () => {
    expect(getBundleLaunchStatus("nonexistent_bundle")).toBe(LAUNCH_STATUS.ARCHIVED);
  });

  it("respects launch_status_override when present", () => {
    const bundle = TIERS.ra_pro_full_bundle;
    const originalOverride = bundle.launch_status_override;
    bundle.launch_status_override = LAUNCH_STATUS.LIVE;
    try {
      expect(getBundleLaunchStatus("ra_pro_full_bundle")).toBe(LAUNCH_STATUS.LIVE);
    } finally {
      if (originalOverride === undefined) {
        delete bundle.launch_status_override;
      } else {
        bundle.launch_status_override = originalOverride;
      }
    }
  });
});

describe("isBundleReadyForLive", () => {
  it("returns false while children are testing", () => {
    expect(isBundleReadyForLive("ra_pro_full_bundle")).toBe(false);
    expect(isBundleReadyForLive("ra_pro_full_native_bundle")).toBe(false);
  });
});

describe("getSuperAdminPackageLevels", () => {
  it("returns all non-archived tier keys", () => {
    const levels = getSuperAdminPackageLevels();
    expect(levels).toContain("review_assist");
    expect(levels).toContain("owner_lite");
    expect(levels).toContain("ra_pro_full_bundle");
    expect(levels).not.toContain("solo_bookkeeper");
  });

  it("preserves Essential/Professional/Virtual CFO display labels for demo QA", () => {
    const levels = getSuperAdminPackageLevels();
    expect(levels).toContain("Essential");
    expect(levels).toContain("Professional");
    expect(levels).toContain("Virtual CFO");
  });
});

describe("getSuperAdminPackageGroups", () => {
  it("returns all expected buckets", () => {
    const groups = getSuperAdminPackageGroups();
    expect(groups).toHaveProperty("v14Live");
    expect(groups).toHaveProperty("v14Testing");
    expect(groups).toHaveProperty("v14ComingSoon");
    expect(groups).toHaveProperty("legacyOwner");
    expect(groups).toHaveProperty("archived");
  });

  it("v14Live is empty by default (nothing promoted yet)", () => {
    const groups = getSuperAdminPackageGroups();
    expect(groups.v14Live).toEqual([]);
  });

  it("v14Testing contains all 10 v1.4 tiers under QA", () => {
    const groups = getSuperAdminPackageGroups();
    expect(groups.v14Testing).toContain("review_assist");
    expect(groups.v14Testing).toContain("review_assist_pro");
    expect(groups.v14Testing).toContain("ra_pro_full_bundle");
    expect(groups.v14Testing).toContain("ra_pro_full_native_bundle");
  });

  it("v14ComingSoon contains payroll add-on", () => {
    const groups = getSuperAdminPackageGroups();
    expect(groups.v14ComingSoon).toContain("ra_pro_payroll_addon");
  });

  it("legacyOwner contains catalog keys + Essential/Professional/Virtual CFO labels", () => {
    const groups = getSuperAdminPackageGroups();
    expect(groups.legacyOwner).toContain("owner_lite");
    expect(groups.legacyOwner).toContain("owner_pro");
    expect(groups.legacyOwner).toContain("Essential");
    expect(groups.legacyOwner).toContain("Professional");
    expect(groups.legacyOwner).toContain("Virtual CFO");
  });

  it("archived contains solo_bookkeeper", () => {
    const groups = getSuperAdminPackageGroups();
    expect(groups.archived).toContain("solo_bookkeeper");
  });

  it("v1.4 tiers never leak into legacyOwner group", () => {
    const groups = getSuperAdminPackageGroups();
    for (const key of groups.legacyOwner) {
      if (TIERS[key]) {
        expect(TIERS[key].launch_status).toBeUndefined();
      }
    }
  });

  it("groups are disjoint (no tier appears in more than one bucket)", () => {
    const groups = getSuperAdminPackageGroups();
    const allKeys = [
      ...groups.v14Live,
      ...groups.v14Testing,
      ...groups.v14ComingSoon,
      ...groups.legacyOwner,
      ...groups.archived,
    ];
    const uniqueKeys = new Set(allKeys);
    expect(uniqueKeys.size).toBe(allKeys.length);
  });
});
