export type NonprofitSubSegment =
  | { code: "P"; subType: "public-charity"; filingTier: "N" | "EZ" | "FULL" }
  | { code: "F"; subType: "private-foundation" }
  | {
      code: "H";
      subType: "healthcare-nfp" | "higher-ed-nfp";
      doctrines: ["containsPHI", "containsRestrictedNetAssetData"];
    }
  | { code: "R"; subType: "religious-church" }
  | { code: "A1"; subType: "association-501c4" }
  | { code: "A2"; subType: "association-501c6" };

export type AccountingFramework = "US_GAAP" | "IFRS" | "IPSAS" | "NON_GAAP";

export type IpsasVintage =
  | { active: "IPSAS_47_48"; effectiveFrom: "2026-01-01" }
  | { active: "IPSAS_23"; effectiveUntil: "2025-12-31"; legacyJurisdiction: string };

export type NonGaapBasis =
  | { basis: "CASH" }
  | { basis: "MODIFIED_CASH" }
  | { basis: "DENOMINATIONAL"; denominationNote?: string };

export type UniformGuidanceVintage =
  | {
      active: "UG_2014";
      thresholds: { singleAudit: 750_000; typeA: 750_000; deMinimis: 0.1 };
    }
  | {
      active: "UG_2024";
      thresholds: { singleAudit: 1_000_000; typeA: 1_000_000; deMinimis: 0.15 };
    }
  | {
      active: "UG_2024_HHS_PARTIAL";
      effectiveFrom: "2024-10-01";
      fullEffectiveFrom: "2025-10-01";
    };

export interface EntityDoctrineProfile {
  containsPHI: boolean;
  containsFedFunds: boolean;
  containsClassifiedData: boolean;
  containsControlledUnclassified: boolean;
  containsExportControlled: boolean;
  containsCardData: boolean;
  containsCriticalInfra: boolean;
  containsRestrictedNetAssetData: boolean;
}

export interface NonprofitEntityFlags {
  upmifaJurisdictionOverride?: "PA";
  scheduleATippingStatus?: "OK" | "WARN_YEAR_1" | "WARN_YEAR_2_TIPPED";
  hasUbit?: boolean;
}
