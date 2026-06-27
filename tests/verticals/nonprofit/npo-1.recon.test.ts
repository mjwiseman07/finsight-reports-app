import { describe, expect, it } from "vitest";
import {
  applyHSubSegmentDefaults,
  routeByFramework,
  routeIpsasVintage,
  routeUniformGuidanceVintage,
  FrameworkUnsetError,
} from "../../../src/verticals/nonprofit/routing";
import type {
  NonprofitSubSegment,
  AccountingFramework,
  EntityDoctrineProfile,
  NonprofitEntityFlags,
} from "../../../src/verticals/nonprofit/types";
import { NPO_CITATION_HANDLE_COUNT } from "../../../src/verticals/nonprofit/citations";
import { restrictedNetAssetAuditHandler } from "../../../src/audit/channels/restricted-net-asset-audit";
import { AUDIT_CHANNEL_COUNT } from "../../../src/audit/channel-registry";
import { DOCTRINE_FLAG_COUNT } from "../../../src/doctrine/entity-doctrine-profile";
import { D0 } from "../../../src/registry/d0";

describe("NPO-1 recon matrix (15 cells)", () => {
  it("cell 1 — P sub-segment with filingTier discriminator (Q12=A)", () => {
    const seg: NonprofitSubSegment = {
      code: "P",
      subType: "public-charity",
      filingTier: "FULL",
    };
    expect(seg.filingTier).toBe("FULL");
  });

  it("cell 2 — F private-foundation sub-segment", () => {
    const seg: NonprofitSubSegment = { code: "F", subType: "private-foundation" };
    expect(seg.subType).toBe("private-foundation");
  });

  it("cell 3 — H dual-doctrine sub-segment shape (Q5=B)", () => {
    const seg: NonprofitSubSegment = {
      code: "H",
      subType: "healthcare-nfp",
      doctrines: ["containsPHI", "containsRestrictedNetAssetData"],
    };
    expect(seg.doctrines).toContain("containsPHI");
    expect(seg.doctrines).toContain("containsRestrictedNetAssetData");
  });

  it("cell 4 — R religious-church flat sub-segment (Q13=W1 flat)", () => {
    const seg: NonprofitSubSegment = { code: "R", subType: "religious-church" };
    expect(seg.code).toBe("R");
  });

  it("cell 5 — A split A1/A2 association sub-segments (Q2=B)", () => {
    const a1: NonprofitSubSegment = { code: "A1", subType: "association-501c4" };
    const a2: NonprofitSubSegment = { code: "A2", subType: "association-501c6" };
    expect(a1.code).toBe("A1");
    expect(a2.code).toBe("A2");
  });

  it("cell 6 — AccountingFramework 4 lanes + FrameworkUnsetError (Q1=B, Q3=B)", () => {
    const frameworks: AccountingFramework[] = ["US_GAAP", "IFRS", "IPSAS", "NON_GAAP"];
    expect(frameworks).toHaveLength(4);
    expect(() =>
      routeByFramework({ framework: undefined }, {
        US_GAAP: () => "us",
        IFRS: () => "ifrs",
        IPSAS: () => "ipsas",
        NON_GAAP: () => "non",
      }),
    ).toThrow(FrameworkUnsetError);
  });

  it("cell 7 — routeByFramework 4-way switch including NON_GAAP (Q1=B)", () => {
    const result = routeByFramework({ framework: "NON_GAAP" }, {
      US_GAAP: () => "us",
      IFRS: () => "ifrs",
      IPSAS: () => "ipsas",
      NON_GAAP: () => "non",
    });
    expect(result).toBe("non");
  });

  it("cell 8 — routeIpsasVintage IPSAS_47_48 primary (2026+)", () => {
    const v = routeIpsasVintage(new Date("2026-06-01"));
    expect(v.active).toBe("IPSAS_47_48");
  });

  it("cell 9 — routeIpsasVintage open legacy whitelist (Q4=A)", () => {
    const v = routeIpsasVintage(new Date("2025-01-01"), "Kenya");
    expect(v.active).toBe("IPSAS_23");
    if (v.active === "IPSAS_23") {
      expect(v.legacyJurisdiction).toBe("Kenya");
    }
  });

  it("cell 10 — routeUniformGuidanceVintage UG_2014 pre Oct 2024", () => {
    const v = routeUniformGuidanceVintage(new Date("2024-01-01"));
    expect(v.active).toBe("UG_2014");
  });

  it("cell 11 — routeUniformGuidanceVintage UG_2024 full effective", () => {
    const v = routeUniformGuidanceVintage(new Date("2025-11-01"));
    expect(v.active).toBe("UG_2024");
  });

  it("cell 12 — 8th doctrine flag + 297-handle citation registry", () => {
    expect(DOCTRINE_FLAG_COUNT).toBe(8);
    expect(NPO_CITATION_HANDLE_COUNT).toBe(297);
    const profile: EntityDoctrineProfile = {
      containsPHI: false,
      containsFedFunds: false,
      containsClassifiedData: false,
      containsControlledUnclassified: false,
      containsExportControlled: false,
      containsCardData: false,
      containsCriticalInfra: false,
      containsRestrictedNetAssetData: true,
    };
    expect(profile.containsRestrictedNetAssetData).toBe(true);
  });

  it("cell 13 — 11th audit channel reserved + D0 COMPLETE-9-VERTICAL", () => {
    expect(restrictedNetAssetAuditHandler.channel).toBe("restricted-net-asset-audit");
    expect(restrictedNetAssetAuditHandler.invoke().status).toBe("reserved-for-NPO-2");
    expect(AUDIT_CHANNEL_COUNT).toBe(11);
    expect(D0.cascadeStatus).toBe("COMPLETE-9-VERTICAL");
    expect(D0.verticalCount).toBe(9);
  });

  it("cell 14 — UG_2024_HHS_PARTIAL + entity flags advisory (Q6/Q9/Q11/Q14)", () => {
    const v = routeUniformGuidanceVintage(new Date("2025-01-01"), "HHS");
    expect(v.active).toBe("UG_2024_HHS_PARTIAL");
    const flags: NonprofitEntityFlags = {
      upmifaJurisdictionOverride: "PA",
      scheduleATippingStatus: "WARN_YEAR_1",
      hasUbit: true,
    };
    expect(flags.upmifaJurisdictionOverride).toBe("PA");
  });

  it("cell 15 — applyHSubSegmentDefaults auto restricted-net-asset + explicit PHI (Q5=B)", () => {
    const h: Extract<NonprofitSubSegment, { code: "H" }> = {
      code: "H",
      subType: "healthcare-nfp",
      doctrines: ["containsPHI", "containsRestrictedNetAssetData"],
    };
    const profile = applyHSubSegmentDefaults(h, { containsPHI: true });
    expect(profile.containsRestrictedNetAssetData).toBe(true);
    expect(profile.containsPHI).toBe(true);
    expect(() => applyHSubSegmentDefaults(h, {})).toThrow(/containsPHI/);
  });
});
