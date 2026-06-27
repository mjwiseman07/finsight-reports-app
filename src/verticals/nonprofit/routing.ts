import {
  AccountingFramework,
  IpsasVintage,
  UniformGuidanceVintage,
  NonprofitSubSegment,
  EntityDoctrineProfile,
} from "./types";
import { FrameworkCrossBlendError, FrameworkUnsetError } from "../../framework/cross-blend";

export { FrameworkCrossBlendError, FrameworkUnsetError };

export function routeByFramework<T>(
  entity: { framework: AccountingFramework | undefined | null },
  handlers: {
    US_GAAP: () => T;
    IFRS: () => T;
    IPSAS: () => T;
    NON_GAAP: () => T;
  },
): T {
  if (entity.framework == null) {
    throw new FrameworkUnsetError(
      "AccountingFramework not declared — explicit selection required (Q3=B).",
    );
  }
  switch (entity.framework) {
    case "US_GAAP":
      return handlers.US_GAAP();
    case "IFRS":
      return handlers.IFRS();
    case "IPSAS":
      return handlers.IPSAS();
    case "NON_GAAP":
      return handlers.NON_GAAP();
    default:
      throw new FrameworkCrossBlendError(
        `Unrecognized framework: ${String((entity as { framework: unknown }).framework)}`,
      );
  }
}

export function routeIpsasVintage(
  fiscalYearStart: Date,
  legacyJurisdiction?: string,
): IpsasVintage {
  if (fiscalYearStart >= new Date("2026-01-01")) {
    return { active: "IPSAS_47_48", effectiveFrom: "2026-01-01" };
  }
  if (legacyJurisdiction) {
    return { active: "IPSAS_23", effectiveUntil: "2025-12-31", legacyJurisdiction };
  }
  return { active: "IPSAS_47_48", effectiveFrom: "2026-01-01" };
}

export function routeUniformGuidanceVintage(
  fiscalYearStart: Date,
  agency?: string,
): UniformGuidanceVintage {
  if (fiscalYearStart < new Date("2024-10-01")) {
    return {
      active: "UG_2014",
      thresholds: { singleAudit: 750_000, typeA: 750_000, deMinimis: 0.1 },
    };
  }
  if (agency === "HHS" && fiscalYearStart < new Date("2025-10-01")) {
    return {
      active: "UG_2024_HHS_PARTIAL",
      effectiveFrom: "2024-10-01",
      fullEffectiveFrom: "2025-10-01",
    };
  }
  return {
    active: "UG_2024",
    thresholds: { singleAudit: 1_000_000, typeA: 1_000_000, deMinimis: 0.15 },
  };
}

export function applyHSubSegmentDefaults(
  _subSegment: Extract<NonprofitSubSegment, { code: "H" }>,
  doctrine: Partial<EntityDoctrineProfile>,
): EntityDoctrineProfile {
  if (doctrine.containsPHI === undefined) {
    throw new Error("H sub-segment requires explicit containsPHI declaration (Q5=B).");
  }
  return {
    containsPHI: doctrine.containsPHI,
    containsFedFunds: doctrine.containsFedFunds ?? false,
    containsClassifiedData: doctrine.containsClassifiedData ?? false,
    containsControlledUnclassified: doctrine.containsControlledUnclassified ?? false,
    containsExportControlled: doctrine.containsExportControlled ?? false,
    containsCardData: doctrine.containsCardData ?? false,
    containsCriticalInfra: doctrine.containsCriticalInfra ?? false,
    containsRestrictedNetAssetData: true,
  };
}
