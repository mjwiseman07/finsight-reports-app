import type { EntityDoctrineProfile } from "../verticals/nonprofit/types";

export type { EntityDoctrineProfile };

export const DOCTRINE_FLAG_COUNT = 8;

export function assertRestrictedNetAssetDoctrine(
  profile: Partial<EntityDoctrineProfile>,
): asserts profile is EntityDoctrineProfile & { containsRestrictedNetAssetData: true } {
  if (profile.containsRestrictedNetAssetData !== true) {
    throw new Error("DOCTRINE_VIOLATION: containsRestrictedNetAssetData must be true.");
  }
}
