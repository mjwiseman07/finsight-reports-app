import { describe, it, expect } from 'vitest';
import { assignAuditReadyTier, AUDIT_READY_SKU_CATALOG } from '../../product-tiers.js';
import {
  checkAuditReadyLimits,
  validateAuditReadyAttachment,
} from '../audit-ready-limits';
import { V1_5_FLAGS } from '../v1_5-flags';
import { withV15RaProFlags, AUDIT_READY_TIER_ENTRIES } from '../tier-registry';

describe('V1.5 — assignAuditReadyTier (Track 4 Option C)', () => {
  it('returns null when RA Pro base scope covers the engagement', () => {
    expect(assignAuditReadyTier({ entity_count: 1, pbc_request_count: 30 })).toBe(
      null,
    );
    expect(assignAuditReadyTier({ entity_count: 2, pbc_request_count: 150 })).toBe(
      null,
    );
  });
  it('returns complex when base entity or PBC caps are exceeded (but not multi_entity)', () => {
    expect(assignAuditReadyTier({ entity_count: 3, pbc_request_count: 100 })).toBe(
      'complex',
    );
    expect(assignAuditReadyTier({ entity_count: 2, pbc_request_count: 151 })).toBe(
      'complex',
    );
    expect(assignAuditReadyTier({ entity_count: 4, pbc_request_count: 350 })).toBe(
      'complex',
    );
  });
  it('returns multi_entity for 5+ entities OR >400 PBC', () => {
    expect(assignAuditReadyTier({ entity_count: 5, pbc_request_count: 350 })).toBe(
      'multi_entity',
    );
    expect(assignAuditReadyTier({ entity_count: 5, pbc_request_count: 401 })).toBe(
      'multi_entity',
    );
    expect(assignAuditReadyTier({ entity_count: 6, pbc_request_count: 100 })).toBe(
      'multi_entity',
    );
    expect(assignAuditReadyTier({ entity_count: 10, pbc_request_count: 500 })).toBe(
      'multi_entity',
    );
  });
});

describe('V1.5 — checkAuditReadyLimits', () => {
  it('passes when within RA Pro base limits (null current tier)', () => {
    const result = checkAuditReadyLimits(null, {
      entity_count: 2,
      pbc_request_count: 100,
      auditor_user_count: 3,
    });
    expect(result.ok).toBe(true);
    expect(result.current_tier).toBe('review_assist_pro_base');
    expect(result.recommended_tier).toBe('review_assist_pro_base');
  });
  it('fails when PBC exceeds RA Pro base max', () => {
    const result = checkAuditReadyLimits(null, {
      entity_count: 1,
      pbc_request_count: 160,
      auditor_user_count: 2,
    });
    expect(result.ok).toBe(false);
    expect(result.recommended_tier).toBe('complex');
    expect(result.reason).toContain('exceeds tier review_assist_pro_base');
  });
  it('fails when entity count exceeds complex tier max', () => {
    const result = checkAuditReadyLimits('complex', {
      entity_count: 6,
      pbc_request_count: 100,
      auditor_user_count: 2,
    });
    expect(result.ok).toBe(false);
    expect(result.recommended_tier).toBe('multi_entity');
  });
});

describe('V1.5 — validateAuditReadyAttachment', () => {
  it('passes for active RA Pro company subscription, no concurrent engagements', () => {
    const result = validateAuditReadyAttachment({
      parent_tier_key: 'review_assist_pro',
      parent_subscription_status: 'active',
      is_firm_subscription: false,
      concurrent_open_engagements: 0,
    });
    expect(result.ok).toBe(true);
  });
  it('rejects attachment to RA base', () => {
    const result = validateAuditReadyAttachment({
      parent_tier_key: 'review_assist',
      parent_subscription_status: 'active',
      is_firm_subscription: false,
      concurrent_open_engagements: 0,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('requires Review Assist Pro');
  });
  it('rejects concurrent engagements on company variant', () => {
    const result = validateAuditReadyAttachment({
      parent_tier_key: 'review_assist_pro',
      parent_subscription_status: 'active',
      is_firm_subscription: false,
      concurrent_open_engagements: 1,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('one Audit Ready engagement at a time');
  });
  it('allows concurrent engagements on firm variant', () => {
    const result = validateAuditReadyAttachment({
      parent_tier_key: 'review_assist_pro',
      parent_subscription_status: 'active',
      is_firm_subscription: true,
      concurrent_open_engagements: 5,
    });
    expect(result.ok).toBe(true);
  });
  it('rejects attachment when parent is past_due', () => {
    const result = validateAuditReadyAttachment({
      parent_tier_key: 'review_assist_pro',
      parent_subscription_status: 'past_due',
      is_firm_subscription: false,
      concurrent_open_engagements: 0,
    });
    expect(result.ok).toBe(false);
  });
});

describe('V1.5 — RA Pro flag defaults', () => {
  it('review_assist_evidence_bundles_visible defaults ON at RA Pro tier', () => {
    expect(
      V1_5_FLAGS.review_assist_evidence_bundles_visible.tier_defaults.review_assist_pro,
    ).toBe(true);
  });
  it('ask_pulse_command_center defaults ON at RA Pro tier', () => {
    expect(V1_5_FLAGS.ask_pulse_command_center.tier_defaults.review_assist_pro).toBe(
      true,
    );
  });
  it('ai_workforce_enabled defaults OFF at all tiers (reserved)', () => {
    expect(V1_5_FLAGS.ai_workforce_enabled.tier_defaults.review_assist_pro).toBe(
      false,
    );
    expect(V1_5_FLAGS.ai_workforce_enabled.tier_defaults.review_assist).toBe(false);
  });
  it('withV15RaProFlags merges without dropping existing keys', () => {
    const merged = withV15RaProFlags({ review_assist_write_qbo: true });
    expect(merged.review_assist_write_qbo).toBe(true);
    expect(merged.review_assist_evidence_bundles_visible).toBe(true);
    expect(merged.ai_workforce_enabled).toBe(false);
  });
  it('AUDIT_READY_TIER_ENTRIES enables audit_ready for complex + multi_entity only', () => {
    expect(Object.keys(AUDIT_READY_SKU_CATALOG)).toHaveLength(2);
    expect(
      AUDIT_READY_TIER_ENTRIES.ra_pro_audit_ready_complex.default_flags.audit_ready_enabled,
    ).toBe(true);
    expect(
      AUDIT_READY_TIER_ENTRIES.ra_pro_audit_ready_multi_entity.default_flags
        .audit_ready_entities_max,
    ).toBe(Number.MAX_SAFE_INTEGER);
  });
});
