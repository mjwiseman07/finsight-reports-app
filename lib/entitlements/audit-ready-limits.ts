/**
 * Audit Ready volume-limit enforcement helpers.
 * Used at request time to prevent tier limits from being exceeded.
 */

import {
  AUDIT_READY_SKU_CATALOG,
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
  current_tier: AuditReadySize;
  recommended_tier: AuditReadySize;
  limits: {
    entities: { current: number; max: number };
    pbc_requests: { current: number; max: number };
    auditor_users: { current: number; max: number };
  };
}

function catalogKeyForSize(size: AuditReadySize) {
  return `ra_pro_audit_ready_${size}` as keyof typeof AUDIT_READY_SKU_CATALOG;
}

export function checkAuditReadyLimits(
  currentTier: AuditReadySize,
  facts: AuditReadyEngagementFacts,
): AuditReadyLimitCheckResult {
  const currentEntry = AUDIT_READY_SKU_CATALOG[catalogKeyForSize(currentTier)];
  const recommended = assignAuditReadyTier({
    entity_count: facts.entity_count,
    pbc_request_count: facts.pbc_request_count,
  }) as AuditReadySize;

  const result: AuditReadyLimitCheckResult = {
    ok: true,
    current_tier: currentTier,
    recommended_tier: recommended,
    limits: {
      entities: { current: facts.entity_count, max: currentEntry.limits.max_entities },
      pbc_requests: {
        current: facts.pbc_request_count,
        max: currentEntry.limits.max_pbc_requests,
      },
      auditor_users: {
        current: facts.auditor_user_count,
        max: currentEntry.limits.max_auditor_users,
      },
    },
  };

  if (facts.entity_count > currentEntry.limits.max_entities) {
    result.ok = false;
    result.reason = `Entity count ${facts.entity_count} exceeds tier ${currentTier} maximum of ${currentEntry.limits.max_entities}. Recommended upgrade: ${recommended}.`;
  } else if (facts.pbc_request_count > currentEntry.limits.max_pbc_requests) {
    result.ok = false;
    result.reason = `PBC request count ${facts.pbc_request_count} exceeds tier ${currentTier} maximum of ${currentEntry.limits.max_pbc_requests}. Recommended upgrade: ${recommended}.`;
  } else if (facts.auditor_user_count > currentEntry.limits.max_auditor_users) {
    result.ok = false;
    result.reason = `Auditor user count ${facts.auditor_user_count} exceeds tier ${currentTier} maximum of ${currentEntry.limits.max_auditor_users}. Recommended upgrade: ${recommended}.`;
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
