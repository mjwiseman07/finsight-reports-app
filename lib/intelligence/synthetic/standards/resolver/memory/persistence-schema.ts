/**
 * LOCK-VC C5 — memory framework persistence schema (42.7E extension).
 */
import type { FiscalCalendarPolicy, RetailSubSegment } from "../../../../../src/verticals/retail/types";
import type { ManufacturingCostingMethod } from "../../../../../src/verticals/manufacturing/types";
import type { NonprofitRestrictionType } from "../../../../../src/verticals/nonprofit/types";

export interface MemoryFrameworkVerticalState {
  readonly RTL?: {
    readonly subSegmentLocked: {
      readonly primary: RetailSubSegment;
      readonly secondary?: RetailSubSegment;
      readonly lockedAtFirstClose: boolean;
      readonly lockTimestamp: string;
    };
    readonly fiscalCalendarPolicy: FiscalCalendarPolicy;
  };
  readonly MFG?: {
    readonly costingMethodLocked: {
      readonly method: ManufacturingCostingMethod;
      readonly lockTimestamp: string;
    };
  };
  readonly NPO?: {
    readonly restrictionDeclarationHistory: ReadonlyArray<{
      readonly effectiveDate: string;
      readonly restrictionType: NonprofitRestrictionType;
      readonly netAssetPoolId: string;
    }>;
  };
}

export interface MemoryFrameworkState {
  readonly verticalState: MemoryFrameworkVerticalState;
}

export const MEMORY_FRAMEWORK_PERSISTENCE_SCHEMA: MemoryFrameworkState = Object.freeze({
  verticalState: Object.freeze({
    RTL: Object.freeze({
      subSegmentLocked: Object.freeze({
        primary: "B",
        lockedAtFirstClose: true,
        lockTimestamp: "2026-01-01T00:00:00.000Z",
      }),
      fiscalCalendarPolicy: Object.freeze({
        calendar: "4_5_4_NRF",
        exclude53rdWeekFromCompStore: true,
      }),
    }),
    MFG: Object.freeze({
      costingMethodLocked: Object.freeze({
        method: "Standard",
        lockTimestamp: "2026-01-01T00:00:00.000Z",
      }),
    }),
    NPO: Object.freeze({
      restrictionDeclarationHistory: Object.freeze([
        Object.freeze({
          effectiveDate: "2026-01-01T00:00:00.000Z",
          restrictionType: "Unrestricted",
          netAssetPoolId: "pool-general",
        }),
      ]),
    }),
  }),
});
