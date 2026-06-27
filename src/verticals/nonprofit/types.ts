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

export type RDenomination = "single" | "multi" | "other";

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
  implicitTimeOnLongLivedEnabled?: boolean;
  refundLiabilityRecognitionTimingOverride?: RefundLiabilityRecognitionTiming;
  refundLiabilityOverrideRationale?: string;
  charityNavigatorOverride?: CharityNavigatorWeights;
  ipsasEarlyAdoptionPermitted?: boolean;
  upmifaSevenPercentOverride?: boolean;
}

export type RefundLiabilityRecognitionTiming = "AT_RECEIPT" | "WHEN_BARRIER_MET";

export type NetAssetRestriction =
  | {
      kind: "TIME";
      releasesOn: Date;
    }
  | {
      kind: "PURPOSE";
      releasedWhenSatisfied: boolean;
    }
  | { kind: "PERPETUITY" }
  | {
      kind: "IMPLICIT_TIME_LONG_LIVED";
      usefulLifeYears: number;
      placedInService: Date;
    }
  | {
      kind: "COMPOSITE";
      releaseMode: "ALL" | "FIRST_SATISFIED";
      restrictions: NetAssetRestriction[];
    };

export interface RestrictionLedgerEntry {
  restrictionId: string;
  amount: number;
  releasedDate?: Date;
}

export interface RestrictedNetAssetBalance {
  restrictionLedger: RestrictionLedgerEntry[];
}

export type BarrierType = "MEASURABLE" | "NON_MEASURABLE";

export interface ContributionInput {
  transactionId: string;
  type: "CONTRIBUTION" | "EXCHANGE";
  conditional?: boolean;
  barrierExists?: boolean;
  barrierType?: BarrierType;
  refundLiabilityRecognitionTimingOverride?: RefundLiabilityRecognitionTiming;
  reciprocity?: "RECIPROCAL" | "NON_RECIPROCAL";
}

export interface ContributionDetermination {
  type: "CONTRIBUTION" | "EXCHANGE";
  reciprocity: "RECIPROCAL" | "NON_RECIPROCAL";
  conditional: boolean;
  barrierExists?: boolean;
  barrierType?: BarrierType;
  refundLiabilityRecognitionTiming?: RefundLiabilityRecognitionTiming;
}

export interface UbitSilo {
  siloId: string;
  activityId: string;
  naics2Digit: string;
  netForSilo: number;
  preTcjaNol?: number;
  postTcjaNol?: number;
}

export interface UbitFiling {
  silos: UbitSilo[];
  grossUbtiAcrossAllSilos: number;
  warnZone: boolean;
  filingTriggered: boolean;
}

export interface ActivityInput {
  activityId: string;
  naics2Digit: string;
}

export type ChnaCycleBasis = "FISCAL_YEAR" | "CALENDAR_YEAR";

export type FapPublicizationChannel = "WEBSITE" | "PHYSICAL_SIGNAGE" | "OTHER";

export interface ChnaCycle {
  cycleBasis: ChnaCycleBasis;
  gracePeriodDays: number;
  fapPublicizationChannels: FapPublicizationChannel[];
  fiscalYearEnd: Date;
  lastChnaCompletedOn?: Date;
}

export type UpmifaFramework = "UPMIFA" | "NO_UPMIFA" | "UMIFA";

export interface UpmifaJurisdiction {
  code: string;
  framework: UpmifaFramework;
  sevenPercentSolution: boolean;
}

export type IpsasAdoptionMode = "FULL" | "PARTIAL" | "PENDING";

export interface IpsasJurisdictionEntry {
  jurisdictionCode: string;
  adoptionMode: IpsasAdoptionMode;
  ipsas47AdoptionDate?: string;
  earlyAdoptionPermitted: boolean;
}

export interface CharityNavigatorBeacon {
  beaconId: string;
  weight: number;
  enabled: boolean;
}

export interface CharityNavigatorWeights {
  beacons: CharityNavigatorBeacon[];
}

export type NpoKvRow =
  | "P-FULL"
  | "P-N-EZ"
  | "F"
  | "H-healthcare"
  | "H-higher-ed"
  | "R"
  | "A1"
  | "A2"
  | "IPSAS_47_48"
  | "IPSAS_23_legacy"
  | "UG_routed";

export type NpoKvColumn =
  | "revenue-recognition"
  | "journal-entry-prep"
  | "reconciliation"
  | "variance-analysis"
  | "close-management"
  | "financial-statements"
  | "audit-support"
  | "fund-accounting-audit"
  | "dcaa-audit"
  | "construction-contract-audit"
  | "restricted-net-asset-audit";
