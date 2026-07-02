import { REFUND_PATHS } from '../refund-config.js';

/** Map Batch B eligibility result to Pulse/API path letter. */
export function resolveResponsePath(eligibility: {
  eligible: boolean;
  path: string;
}): 'A' | 'B' | 'C' {
  if (!eligibility.eligible) return REFUND_PATHS.C;
  if (eligibility.path === REFUND_PATHS.A) return REFUND_PATHS.A;
  if (eligibility.path === REFUND_PATHS.B) return REFUND_PATHS.B;
  return REFUND_PATHS.C;
}
