import type { RetentionPolicy } from "./types";

export const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  minDays: 365,
  soc1Days: 7 * 365,
  hipaaDays: 6 * 365,
  purgeAllowed: false,
  requireFsync: true,
};

export function validateRetentionPolicy(policy: RetentionPolicy): void {
  if (policy.soc1Days < policy.minDays) {
    throw new Error(`retention soc1Days ${policy.soc1Days} below minDays floor ${policy.minDays}`);
  }
  if (policy.hipaaDays < policy.minDays) {
    throw new Error(`retention hipaaDays ${policy.hipaaDays} below minDays floor ${policy.minDays}`);
  }
}
