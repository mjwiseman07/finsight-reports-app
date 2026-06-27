import type { NetAssetRestriction, RDenomination } from "../types";

export const RESTRICTION_KINDS = [
  "TIME",
  "PURPOSE",
  "PERPETUITY",
  "IMPLICIT_TIME_LONG_LIVED",
  "COMPOSITE",
] as const;

export function isValidRestriction(restriction: NetAssetRestriction): boolean {
  return RESTRICTION_KINDS.includes(restriction.kind as (typeof RESTRICTION_KINDS)[number]);
}

export function validateCompositeReleaseMode(
  restriction: Extract<NetAssetRestriction, { kind: "COMPOSITE" }>,
): boolean {
  return restriction.releaseMode === "ALL" || restriction.releaseMode === "FIRST_SATISFIED";
}

export function normalizeRDenomination(value: RDenomination): RDenomination {
  if (value === "multi") {
    return "multi";
  }
  if (value === "single") {
    return "single";
  }
  return "other";
}

export function isDistinctMultiDenomination(value: RDenomination): boolean {
  return value === "multi";
}
