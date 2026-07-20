/**
 * V1.5 entitlement flag definitions
 *
 * Flags follow the pattern:
 *   review_assist_* → capability inside RA / RA Pro
 *   audit_ready_*  → capability behind Audit Ready add-on
 */

export const V1_5_FLAGS = {
  // ============================================================
  // RA Pro capabilities (default ON at RA Pro tier)
  // ============================================================
  review_assist_evidence_bundles_visible: {
    id: 'review_assist_evidence_bundles_visible',
    default: false,
    description: 'Reviewer sees "Evidence attached (SHA256: ...)" on every JE proposal/posted JE',
    tier_defaults: {
      review_assist: false,
      review_assist_pro: true,
    },
  },
  review_assist_evidence_bundle_download: {
    id: 'review_assist_evidence_bundle_download',
    default: false,
    description: 'Reviewer can export a JE evidence bundle as ZIP with manifest + integrity hash',
    tier_defaults: {
      review_assist: false,
      review_assist_pro: true,
    },
  },
  review_assist_reconciliation_view: {
    id: 'review_assist_reconciliation_view',
    default: false,
    description: 'Read-only reconciliation view: schedule → subledger → recon → GL tie-out',
    tier_defaults: {
      review_assist: false,
      review_assist_pro: true,
    },
  },
  review_assist_variance_narratives: {
    id: 'review_assist_variance_narratives',
    default: false,
    description: 'LLM-authored variance narratives on close-packet variance panel',
    tier_defaults: {
      review_assist: false,
      review_assist_pro: true,
    },
  },
  review_assist_prior_period_lookup: {
    id: 'review_assist_prior_period_lookup',
    default: false,
    description: 'From any JE, retrieve prior-period JEs touching same account(s) with evidence bundles',
    tier_defaults: {
      review_assist: false,
      review_assist_pro: true,
    },
  },
  ask_pulse_command_center: {
    id: 'ask_pulse_command_center',
    default: false,
    description: 'Access to Ask Pulse Command Center advisory intelligence panel',
    tier_defaults: {
      review_assist: false,
      review_assist_pro: true,
    },
  },
  ra_pro_pulse_journal_entry: {
    id: 'ra_pro_pulse_journal_entry',
    default: false,
    description: 'Conversational journal-entry preview in Pulse (PULSE-JE-1)',
    tier_defaults: {
      review_assist: false,
      review_assist_pro: true,
    },
  },

  // ============================================================
  // RESERVED — advertised, not shipped in v1.5
  // ============================================================
  ai_workforce_enabled: {
    id: 'ai_workforce_enabled',
    default: false,
    description: 'AI Workforce (9 AI worker personas + COSO controls) — not yet shipped',
    tier_defaults: {
      review_assist: false,
      review_assist_pro: false,
    },
  },

  // ============================================================
  // Audit Ready add-on (default OFF; requires add-on attach)
  // ============================================================
  audit_ready_enabled: {
    id: 'audit_ready_enabled',
    default: false,
    description: 'Master switch for Audit Ready add-on',
  },
  pbc_ingest_ui: {
    id: 'pbc_ingest_ui',
    default: false,
    description: 'PBC list upload + parse UI (Patent #6 Component B)',
  },
  assertion_classification: {
    id: 'assertion_classification',
    default: false,
    description: 'Auto-classify PBC requests by assertion (Patent #6 Component C)',
  },
  four_canonical_reconciliations_live: {
    id: 'four_canonical_reconciliations_live',
    default: false,
    description: 'Live schedule/subledger/recon/rollforward tie-outs (Patent #6 Component D)',
  },
  six_category_variance_taxonomy: {
    id: 'six_category_variance_taxonomy',
    default: false,
    description: 'Volume/Rate/Mix/Timing/One-Time/Reclass variance classification',
  },
  post_time_evidence_bundles: {
    id: 'post_time_evidence_bundles',
    default: false,
    description: 'Content-hashed evidence bundle on every JE (Patent #6 Component A)',
  },
  cross_engagement_evidence_corpus: {
    id: 'cross_engagement_evidence_corpus',
    default: false,
    description: 'Evidence bundles persist across engagements (§7.2)',
  },
  engagement_scoped_auditor_portal: {
    id: 'engagement_scoped_auditor_portal',
    default: false,
    description: 'MFA + RLS engagement-scoped auditor portal (Patent #6 Component E)',
  },
  historical_inquiry_response_drafting: {
    id: 'historical_inquiry_response_drafting',
    default: false,
    description: 'LLM drafts response to auditor inquiry from prior-engagement corpus (Claim 19)',
  },
} as const;

export type V15FlagKey = keyof typeof V1_5_FLAGS;

/** Flatten RA Pro v1.5 defaults for merging into entitlement bags. */
export function getV15RaProDefaultFlags(): Record<string, boolean> {
  return {
    review_assist_evidence_bundles_visible: true,
    review_assist_evidence_bundle_download: true,
    review_assist_reconciliation_view: true,
    review_assist_variance_narratives: true,
    review_assist_prior_period_lookup: true,
    ask_pulse_command_center: true,
    ra_pro_pulse_journal_entry: true,
    ai_workforce_enabled: false,
  };
}
