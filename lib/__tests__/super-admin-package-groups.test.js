import { describe, it, expect } from "vitest";
import {
  getSuperAdminPackageLevels,
  getSuperAdminPackageGroups,
  superAdminPersonaModes,
  superAdminActionTypes,
} from "../super-admin.js";

describe("super-admin package levels — dynamic source", () => {
  it("getSuperAdminPackageLevels returns a non-empty array", () => {
    const levels = getSuperAdminPackageLevels();
    expect(Array.isArray(levels)).toBe(true);
    expect(levels.length).toBeGreaterThan(0);
  });

  it("getSuperAdminPackageLevels excludes solo_bookkeeper (archived)", () => {
    expect(getSuperAdminPackageLevels()).not.toContain("solo_bookkeeper");
  });

  it("getSuperAdminPackageLevels includes v1.4 tiers", () => {
    const levels = getSuperAdminPackageLevels();
    expect(levels).toContain("review_assist");
    expect(levels).toContain("review_assist_pro");
    expect(levels).toContain("ra_pro_full_bundle");
  });

  it("getSuperAdminPackageLevels includes legacy catalog + display labels", () => {
    const levels = getSuperAdminPackageLevels();
    expect(levels).toContain("owner_lite");
    expect(levels).toContain("owner_pro");
    expect(levels).toContain("Essential");
    expect(levels).toContain("Professional");
    expect(levels).toContain("Virtual CFO");
  });

  it("getSuperAdminPackageGroups returns grouped shape", () => {
    const groups = getSuperAdminPackageGroups();
    expect(groups.v14Live).toBeDefined();
    expect(groups.v14Testing).toBeDefined();
    expect(groups.legacyOwner).toBeDefined();
  });
});

describe("super-admin persona modes — unchanged", () => {
  it("persona modes remain hardcoded", () => {
    expect(superAdminPersonaModes).toEqual([
      "Bookkeeper",
      "Controller",
      "Fractional CFO",
      "Business Owner",
    ]);
  });
});

describe("super-admin action types — unchanged", () => {
  it("package_switched action is still recognized", () => {
    expect(superAdminActionTypes).toContain("package_switched");
  });

  it("persona_switched action is still recognized", () => {
    expect(superAdminActionTypes).toContain("persona_switched");
  });
});
