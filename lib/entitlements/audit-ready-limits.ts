/**
 * Audit Ready volume-limit enforcement helpers.
 * Used at request time to prevent tier limits from being exceeded.
 * Track 4 Option C revision — RA Pro base covers ≤2 entities / ≤150 PBC.
 * Complex + Multi-entity are true upsells for larger engagements.
 */

import {
  AUDIT_READY_SKU_CATALOG,
  REVIEW_ASSIST_PRO_BASE_LIMITS,
  assignAuditReadyTier,
} from '../product-tiers.js';
import type { AuditReadySize } from './types';

export type { AuditReadySize };

export interface AuditReadyEngagementFacts {
  entity_count: number;
  pbc_request_count: number;
  auditor_user_count: number;
}

export interface AuditReadyLimitCheckResult {
  ok: boolean;
  reason?: string;
  current_tier: AuditReadySize | 'review_assist_pro_base';
  recommended_tier: AuditReadySize | 'review_assist_pro_base';
  limits: {
    entities: { current: number; max: number };
    pbc_requests: { current: number; max: number };
    auditor_users: { current: number; max: number };
  };
}

function catalogKeyForSize(size: AuditReadySize) {
  return `ra_pro_audit_ready_${size}` as keyof typeof AUDIT_READY_SKU_CATALOG;
}

/**
 * Check if an engagement stays within the caps for its current tier.
 * When `currentTier` is null, checks against RA Pro base limits.
 */
export function checkAuditReadyLimits(
  currentTier: AuditReadySize | null,
  facts: AuditReadyEngagementFacts,
): AuditReadyLimitCheckResult {
  const currentLimits = currentTier
    ? AUDIT_READY_SKU_CATALOG[catalogKeyForSize(currentTier)].limits
    : {
        max_entities: REVIEW_ASSIST_PRO_BASE_LIMITS.max_entities,
        max_pbc_requests: REVIEW_ASSIST_PRO_BASE_LIMITS.max_pbc_requests,
        max_auditor_users: REVIEW_ASSIST_PRO_BASE_LIMITS.max_auditor_users,
      };

  const recommended = assignAuditReadyTier({
    entity_count: facts.entity_count,
    pbc_request_count: facts.pbc_request_count,
  });
  const recommendedTier: AuditReadySize | 'review_assist_pro_base' =
    recommended ?? 'review_assist_pro_base';
  const currentTierLabel: AuditReadySize | 'review_assist_pro_base' =
    currentTier ?? 'review_assist_pro_base';

  const result: AuditReadyLimitCheckResult = {
    ok: true,
    current_tier: currentTierLabel,
    recommended_tier: recommendedTier,
    limits: {
      entities: { current: facts.entity_count, max: currentLimits.max_entities },
      pbc_requests: {
        current: facts.pbc_request_count,
        max: currentLimits.max_pbc_requests,
      },
      auditor_users: {
        current: facts.auditor_user_count,
        max: currentLimits.max_auditor_users,
      },
    },
  };

  if (facts.entity_count > currentLimits.max_entities) {
    result.ok = false;
    result.reason = `Entity count ${facts.entity_count} exceeds tier ${currentTierLabel} maximum of ${currentLimits.max_entities}. Recommended upgrade: ${recommendedTier}.`;
  } else if (facts.pbc_request_count > currentLimits.max_pbc_requests) {
    result.ok = false;
    result.reason = `PBC request count ${facts.pbc_request_count} exceeds tier ${currentTierLabel} maximum of ${currentLimits.max_pbc_requests}. Recommended upgrade: ${recommendedTier}.`;
  } else if (facts.auditor_user_count > currentLimits.max_auditor_users) {
    result.ok = false;
    result.reason = `Auditor user count ${facts.auditor_user_count} exceeds tier ${currentTierLabel} maximum of ${currentLimits.max_auditor_users}. Recommended upgrade: ${recommendedTier}.`;
  }

  return result;
}

/**
 * Validate that an Audit Ready SKU can be attached to a given RA Pro subscription.
 */
export function validateAuditReadyAttachment(input: {
  parent_tier_key: string | null;
  parent_subscription_status: 'active' | 'trialing' | 'past_due' | 'canceled' | null;
  is_firm_subscription: boolean;
  concurrent_open_engagements: number;
}): { ok: boolean; reason?: string } {
  if (input.parent_tier_key !== 'review_assist_pro') {
    return {
      ok: false,
      reason: 'Audit Ready requires Review Assist Pro as parent subscription.',
    };
  }
  if (
    input.parent_subscription_status !== 'active' &&
    input.parent_subscription_status !== 'trialing'
  ) {
    return {
      ok: false,
      reason: `Parent RA Pro subscription must be active or trialing (found: ${input.parent_subscription_status}).`,
    };
  }
  if (!input.is_firm_subscription && input.concurrent_open_engagements >= 1) {
    return {
      ok: false,
      reason:
        'Company-tier RA Pro supports one Audit Ready engagement at a time. Upgrade to Firm variant for concurrent engagements.',
    };
  }
  return { ok: true };
}
