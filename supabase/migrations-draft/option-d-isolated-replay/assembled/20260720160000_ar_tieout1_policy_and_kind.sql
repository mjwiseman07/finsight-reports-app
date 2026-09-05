-- PBC-TIEOUT-1: tolerance policy per engagement + tie_out_kind classifier column.
-- ADDITIVE ONLY. No drops, no reorders. Idempotent.
BEGIN;
-- ─────────────────────────────────────────────────────────────
-- 1) audit_ready_tie_out_policies
-- One row per engagement. Set lazily when the customer initiates tie-out.
-- Aggressive default = tight $ and % tolerances. Customer can edit at any time.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_ready_tie_out_policies (
  engagement_id            uuid PRIMARY KEY REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  -- Tolerance mode: aggressive default, customer-configurable
  policy_mode              text NOT NULL DEFAULT 'aggressive'
                           CHECK (policy_mode IN ('aggressive','standard','conservative','custom')),
  -- Auto-reconcile threshold: variances at or below these tolerances auto-clear.
  -- BOTH dollar and percent are evaluated; whichever is TIGHTER wins.
  -- Setting either to NULL means "unbounded" for that dimension.
  auto_reconcile_max_dollar  numeric(18,2) NOT NULL DEFAULT 5.00,
  auto_reconcile_max_percent numeric(6,4)  NOT NULL DEFAULT 0.0010,   -- 0.10%
  -- Kickout threshold: variances above these tolerances go to the kickout inbox.
  -- Between auto and kickout = "review" bucket.
  kickout_min_dollar         numeric(18,2) NOT NULL DEFAULT 250.00,
  kickout_min_percent        numeric(6,4)  NOT NULL DEFAULT 0.0500,   -- 5.00%
  -- Which comparison is authoritative: dollar-only, percent-only, or the tighter of both
  authoritative_comparison   text NOT NULL DEFAULT 'tighter_of_both'
                             CHECK (authoritative_comparison IN ('dollar_only','percent_only','tighter_of_both')),
  -- Provenance
  set_by_user_id           uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  set_at                   timestamptz NOT NULL DEFAULT now(),
  updated_by_user_id       uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at               timestamptz NOT NULL DEFAULT now(),
  -- Guard rails
  CONSTRAINT tolerance_dollar_non_negative CHECK (
    auto_reconcile_max_dollar >= 0
    AND kickout_min_dollar >= 0
    AND kickout_min_dollar >= auto_reconcile_max_dollar
  ),
  CONSTRAINT tolerance_percent_bounded CHECK (
    auto_reconcile_max_percent >= 0 AND auto_reconcile_max_percent < 1
    AND kickout_min_percent >= 0 AND kickout_min_percent < 1
    AND kickout_min_percent >= auto_reconcile_max_percent
  )
);
CREATE INDEX IF NOT EXISTS idx_ar_tieout_policies_updated
  ON public.audit_ready_tie_out_policies(updated_at DESC);
ALTER TABLE public.audit_ready_tie_out_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ar_tieout_policies_service_role_all ON public.audit_ready_tie_out_policies;
CREATE POLICY ar_tieout_policies_service_role_all
  ON public.audit_ready_tie_out_policies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
-- Read: any user who can see the parent engagement can see its policy
DROP POLICY IF EXISTS ar_tieout_policies_engagement_read ON public.audit_ready_tie_out_policies;
CREATE POLICY ar_tieout_policies_engagement_read ON public.audit_ready_tie_out_policies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_tie_out_policies.engagement_id
        AND (
          -- company-scoped engagement
          (e.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'
          ))
          OR
          -- firm-scoped engagement
          (e.firm_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'
          ))
        )
    )
  );
-- ─────────────────────────────────────────────────────────────
-- 2) audit_ready_pbc_requests.tie_out_kind
-- Additive column. Nullable until classified.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.audit_ready_pbc_requests
  ADD COLUMN IF NOT EXISTS tie_out_kind text NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'audit_ready_pbc_requests_tie_out_kind_check'
      AND conrelid = 'public.audit_ready_pbc_requests'::regclass
  ) THEN
    ALTER TABLE public.audit_ready_pbc_requests
      ADD CONSTRAINT audit_ready_pbc_requests_tie_out_kind_check
      CHECK (
        tie_out_kind IS NULL
        OR tie_out_kind IN (
          'ar_aging',
          'ap_aging',
          'inventory',
          'grni',
          'bank_recon',
          'fixed_assets',
          'cash_recon',
          'debt_schedule',
          'equity_rollforward',
          'revenue_cutoff',
          'expense_cutoff',
          'unclassified'
        )
      );
  END IF;
END$$;
ALTER TABLE public.audit_ready_pbc_requests
  ADD COLUMN IF NOT EXISTS tie_out_kind_confidence numeric(4,3) NULL;
ALTER TABLE public.audit_ready_pbc_requests
  ADD COLUMN IF NOT EXISTS tie_out_kind_classified_at timestamptz NULL;
ALTER TABLE public.audit_ready_pbc_requests
  ADD COLUMN IF NOT EXISTS tie_out_kind_classifier text NULL;
  -- 'deterministic' | 'bedrock_sonnet' | 'manual'
CREATE INDEX IF NOT EXISTS idx_ar_pbc_tie_out_kind
  ON public.audit_ready_pbc_requests(engagement_id, tie_out_kind);
-- ─────────────────────────────────────────────────────────────
-- 3) audit_ready_tie_out_summary (VIEW)
-- Read-only view aggregating tie-out state per PBC request for the summary page.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.audit_ready_tie_out_summary AS
SELECT
  r.id                     AS pbc_request_id,
  r.engagement_id,
  r.request_number,
  r.request_description,
  r.assertion_tags,
  r.tie_out_kind,
  r.tie_out_kind_confidence,
  r.tie_out_kind_classifier,
  r.tie_out_kind_classified_at,
  r.status                 AS pbc_status,
  CASE
    WHEN p.engagement_id IS NULL           THEN 'no_tolerance_policy'
    WHEN r.tie_out_kind IS NULL            THEN 'not_yet_classified'
    WHEN r.tie_out_kind = 'unclassified'   THEN 'requires_manual_review'
    ELSE 'classified'
  END                      AS tie_out_state,
  p.policy_mode,
  p.auto_reconcile_max_dollar,
  p.auto_reconcile_max_percent,
  p.kickout_min_dollar,
  p.kickout_min_percent,
  p.authoritative_comparison
FROM public.audit_ready_pbc_requests r
LEFT JOIN public.audit_ready_tie_out_policies p ON p.engagement_id = r.engagement_id;
COMMENT ON VIEW public.audit_ready_tie_out_summary IS
  'PBC-TIEOUT-1 read-only summary of tie-out state per PBC request. Read via RLS on parent tables.';
-- Views inherit RLS from their base tables when created with default security_invoker.
-- Explicitly ensure invoker semantics (matches Phase Q8a pattern).
ALTER VIEW public.audit_ready_tie_out_summary SET (security_invoker = true);

-- PBC-TIEOUT-1 adaptation: allow tie_out_kind_classify on audit_ready_llm_usage.operation
-- (paste classifier logs this op; week-3 CHECK did not include it).
DO $$
DECLARE
  conname text;
BEGIN
  SELECT c.conname INTO conname
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'audit_ready_llm_usage'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%operation%';
  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.audit_ready_llm_usage DROP CONSTRAINT %I', conname);
  END IF;
END$$;
ALTER TABLE public.audit_ready_llm_usage
  ADD CONSTRAINT audit_ready_llm_usage_operation_check
  CHECK (operation IN (
    'pbc_parse','assertion_classify','pii_redaction_ner',
    'response_draft','evidence_bundle_summary','tieout_explain',
    'tie_out_kind_classify'
  ));

COMMIT;