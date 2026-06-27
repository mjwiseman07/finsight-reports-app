import type { NetAssetRestriction } from "../types";

export type { NetAssetRestriction };

export function maxDate(dates: Date[]): Date {
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

export function evaluateRelease(
  restriction: NetAssetRestriction,
  asOf: Date,
  entityPolicy: { implicitTimeOnLongLivedEnabled: boolean },
): { released: boolean; releasedOn?: Date } {
  switch (restriction.kind) {
    case "TIME":
      return asOf >= restriction.releasesOn
        ? { released: true, releasedOn: restriction.releasesOn }
        : { released: false };
    case "PURPOSE":
      return restriction.releasedWhenSatisfied
        ? { released: true, releasedOn: asOf }
        : { released: false };
    case "PERPETUITY":
      return { released: false };
    case "IMPLICIT_TIME_LONG_LIVED":
      if (!entityPolicy.implicitTimeOnLongLivedEnabled) {
        return { released: false };
      }
      return { released: false };
    case "COMPOSITE": {
      const childResults = restriction.restrictions.map((r) =>
        evaluateRelease(r, asOf, entityPolicy),
      );
      if (restriction.releaseMode === "ALL") {
        const allReleased = childResults.every((c) => c.released);
        return allReleased
          ? {
              released: true,
              releasedOn: maxDate(childResults.map((c) => c.releasedOn!)),
            }
          : { released: false };
      }
      const first = childResults.find((c) => c.released);
      return first ?? { released: false };
    }
    default:
      return { released: false };
  }
}

export function transitionLedgerOnRelease(
  releasedOn: Date,
): { releasedDate: Date } {
  return { releasedDate: releasedOn };
}
