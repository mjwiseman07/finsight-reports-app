/**
 * v1.5 additive tier registry — RA Pro flag inheritance + Audit Ready tiers.
 * Does not modify existing Doc D ADDON_REGISTRY entries.
 */

import { AUDIT_READY_SKU_CATALOG } from '../product-tiers.js';
import { getV15RaProDefaultFlags } from './v1_5-flags';
import type { AuditReadySize } from './types';

/** Extend an existing RA Pro flag bag with v1.5 defaults (additive merge). */
export function withV15RaProFlags(
  existingRaProFlags: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...existingRaProFlags,
    ...getV15RaProDefaultFlags(),
  };
}

function buildAuditReadyFlags(size: AuditReadySize) {
  const catalogKey = `ra_pro_audit_ready_${size}` as keyof typeof AUDIT_READY_SKU_CATALOG;
  const catalogEntry = AUDIT_READY_SKU_CATALOG[catalogKey];
  return {
    audit_ready_enabled: true,
    audit_ready_tier: size,
    pbc_ingest_ui: true,
    assertion_classification: true,
    four_canonical_reconciliations_live: true,
    six_category_variance_taxonomy: true,
    post_time_evidence_bundles: true,
    cross_engagement_evidence_corpus: true,
    engagement_scoped_auditor_portal: true,
    historical_inquiry_response_drafting: true,
    audit_ready_entities_max: catalogEntry.limits.max_entities,
    audit_ready_pbc_requests_max: catalogEntry.limits.max_pbc_requests,
    audit_ready_auditor_users_max: catalogEntry.limits.max_auditor_users,
    audit_ready_prep_window_days: catalogEntry.engagement_config.prep_window_days,
    audit_ready_hard_timeout_days: catalogEntry.engagement_config.hard_timeout_days,
    audit_ready_renewal_price_pct: catalogEntry.engagement_config.renewal_price_pct,
  };
}

export const AUDIT_READY_TIER_ENTRIES = {
  ra_pro_audit_ready_small: {
    ...AUDIT_READY_SKU_CATALOG.ra_pro_audit_ready_small,
    default_flags: buildAuditReadyFlags('small'),
  },
  ra_pro_audit_ready_standard: {
    ...AUDIT_READY_SKU_CATALOG.ra_pro_audit_ready_standard,
    default_flags: buildAuditReadyFlags('standard'),
  },
  ra_pro_audit_ready_complex: {
    ...AUDIT_READY_SKU_CATALOG.ra_pro_audit_ready_complex,
    default_flags: buildAuditReadyFlags('complex'),
  },
  ra_pro_audit_ready_multi_entity: {
    ...AUDIT_READY_SKU_CATALOG.ra_pro_audit_ready_multi_entity,
    default_flags: buildAuditReadyFlags('multi_entity'),
  },
} as const;
