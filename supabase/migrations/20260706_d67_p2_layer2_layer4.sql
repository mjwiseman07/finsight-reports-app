-- ============================================================================
-- Phase D6.7 Part 2 — AR Cash Application Layer 2 (probabilistic + tiered LLM)
--                     + Layer 4 (human review queue) + cross-tenant patterns
-- Adds:
--   - ar_cash_app_match_scores      (Layer 2 scoring breakdown)
--   - ar_cash_app_review_items      (Layer 4 queue rows)
--   - cash_app_payer_patterns_global (anonymized cross-tenant patterns)
--   - firm_llm_config               (per-firm LLM tier + threshold knobs)
--   - 7 new cash_app ledger event types (enforced in lib/events/cash-app-catalog.ts)
--   - RLS on all new tenant-scoped tables
--   - service-role-write / authenticated-read-only RLS on the global table
--   - Default firm_llm_config row per existing firm_clients
-- ============================================================================

-- ---------- 1. firm_llm_config ----------
CREATE TABLE IF NOT EXISTS public.firm_llm_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  company_id uuid NOT NULL UNIQUE,
  layer2_escalation_threshold numeric(4,3) NOT NULL DEFAULT 0.750
    CHECK (layer2_escalation_threshold >= 0 AND layer2_escalation_threshold <= 1),
  layer2_llm_primary_tier text NOT NULL DEFAULT 'primary'
    CHECK (layer2_llm_primary_tier IN ('primary', 'toptier', 'haiku')),
  layer2_llm_escalation_tier text NOT NULL DEFAULT 'toptier'
    CHECK (layer2_llm_escalation_tier IN ('primary', 'toptier', 'haiku')),
  cross_tenant_pattern_contribution_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_firm_llm_config_company
  ON public.firm_llm_config (company_id);

COMMENT ON TABLE public.firm_llm_config IS
  'Per-firm knobs for Layer 2 tiered LLM reasoning. layer2_escalation_threshold governs the Sonnet 4.6 -> Sonnet 5 -> Layer 4 ladder (D6.7 Part 2 Q1/Q1a/Q1b). cross_tenant_pattern_contribution_enabled is a firm-level opt-out from contributing (not reading) to cash_app_payer_patterns_global; reads of the global table are controlled separately by the generic-payer classifier gate, not this flag.';

INSERT INTO public.firm_llm_config (firm_id, company_id)
SELECT firm_id, company_id
FROM public.firm_clients
ON CONFLICT (company_id) DO NOTHING;

-- ---------- 2. ar_cash_app_match_scores (Layer 2 scoring breakdown) ----------
CREATE TABLE IF NOT EXISTS public.ar_cash_app_match_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  company_id uuid NOT NULL,
  payment_id uuid NOT NULL REFERENCES public.ar_cash_app_payments(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL,
  fuzzy_payer_name_score numeric(5,4) NOT NULL,
  amount_tolerance_score numeric(5,4) NOT NULL,
  date_proximity_score numeric(5,4) NOT NULL,
  historical_payer_behavior_score numeric(5,4) NOT NULL,
  global_pattern_score numeric(5,4) NOT NULL DEFAULT 0,
  global_pattern_contribution_capped boolean NOT NULL DEFAULT false,
  aggregate_feature_score numeric(5,4) NOT NULL,
  llm_tier_used text CHECK (llm_tier_used IS NULL OR llm_tier_used IN ('primary', 'toptier', 'haiku')),
  llm_confidence numeric(5,4),
  llm_reasoning_excerpt text,
  llm_preferred_candidate boolean NOT NULL DEFAULT false,
  escalated_to_toptier boolean NOT NULL DEFAULT false,
  final_confidence numeric(5,4) NOT NULL,
  verdict text NOT NULL CHECK (verdict IN (
    'auto_match_candidate', 'route_to_review', 'no_plausible_candidate'
  )),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ar_cash_app_match_scores_payment
  ON public.ar_cash_app_match_scores (payment_id);
CREATE INDEX IF NOT EXISTS idx_ar_cash_app_match_scores_invoice
  ON public.ar_cash_app_match_scores (company_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_ar_cash_app_match_scores_verdict
  ON public.ar_cash_app_match_scores (company_id, verdict);

COMMENT ON TABLE public.ar_cash_app_match_scores IS
  'Layer 2 (D6.7 Part 2) feature-by-feature scoring breakdown for one payment x candidate-invoice pair, including which LLM tier was used and the resulting verdict. One row per (payment_id, invoice_id) candidate evaluated by Layer 2.';

-- ---------- 3. ar_cash_app_review_items (Layer 4 queue) ----------
CREATE TABLE IF NOT EXISTS public.ar_cash_app_review_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  company_id uuid NOT NULL,
  payment_id uuid NOT NULL REFERENCES public.ar_cash_app_payments(id) ON DELETE CASCADE,
  top_candidates jsonb NOT NULL DEFAULT '[]'::jsonb,
  llm_reasoning_excerpt text,
  llm_confidence numeric(5,4),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'resolved', 'dismissed'
  )),
  resolved_action text CHECK (resolved_action IS NULL OR resolved_action IN (
    'accept', 'reject', 'write_off', 'on_account', 'split'
  )),
  resolved_by uuid,
  resolved_at timestamptz,
  write_off_amount numeric(18,2),
  write_off_gl_account_id uuid,
  on_account_customer_id uuid,
  split_allocations jsonb,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_review_item_resolution_fields CHECK (
    (status = 'pending' AND resolved_action IS NULL AND resolved_by IS NULL AND resolved_at IS NULL)
    OR (status IN ('resolved', 'dismissed'))
  )
);

CREATE INDEX IF NOT EXISTS idx_ar_cash_app_review_items_queue
  ON public.ar_cash_app_review_items (company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ar_cash_app_review_items_payment
  ON public.ar_cash_app_review_items (payment_id);
CREATE INDEX IF NOT EXISTS idx_ar_cash_app_review_items_pending
  ON public.ar_cash_app_review_items (company_id, created_at)
  WHERE status = 'pending';

COMMENT ON TABLE public.ar_cash_app_review_items IS
  'Layer 4 (D6.7 Part 2) human review queue. top_candidates is a JSON array of {invoice_id, matched_amount, confidence, feature_breakdown, llm_reasoning} objects surfaced to the reviewer. split_allocations is only populated when resolved_action=split: [{invoice_id, amount}, ...].';

-- ---------- 4. cash_app_payer_patterns_global (cross-tenant, anonymized) ----------
CREATE TABLE IF NOT EXISTS public.cash_app_payer_patterns_global (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_fingerprint text NOT NULL UNIQUE,
  normalized_entity_name text NOT NULL,
  sample_count int NOT NULL DEFAULT 1,
  contributing_tenant_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  weight numeric(5,4) NOT NULL DEFAULT 0.1000
    CHECK (weight >= 0 AND weight <= 0.3),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_app_payer_patterns_global_fingerprint
  ON public.cash_app_payer_patterns_global (pattern_fingerprint);
CREATE INDEX IF NOT EXISTS idx_cash_app_payer_patterns_global_entity
  ON public.cash_app_payer_patterns_global (normalized_entity_name);

COMMENT ON TABLE public.cash_app_payer_patterns_global IS
  'D6.7 Part 2 Q3=B: cross-tenant learning restricted to generic-payer patterns only (public companies, national banks, major utilities -- gated by lib/cash-app/payer-pattern-classifier.ts::isGenericEnoughToPool). No firm-specific or personally-identifying payer data is stored here; pattern_fingerprint is a hash of the normalized generic entity name, never raw payer text tied to a specific customer relationship. contributing_tenant_ids records which firm_ids contributed samples for audit purposes only, never surfaced to other tenants. weight is capped at 0.3 and is the MAXIMUM contribution this pattern can make to a single Layer 2 aggregate confidence score (lib/cash-app/layer2-features.ts::globalPatternScore). This table is NOT the full cross-tenant learning system (Q3=C) -- that requires the ToS data-pooling amendment and is out of scope for Part 2.';

-- ---------- 5. ledger_events event types ----------
-- No event_type CHECK exists on ledger_events; cash_app event types are enforced
-- in lib/events/cash-app-catalog.ts (CASH_APP_EVENT_TYPES allowlist).
-- Part 1 types (flat snake_case):
--   remittance_ingested, remittance_parsed, payment_ingested,
--   match_candidate_proposed, match_candidate_approved, match_candidate_rejected,
--   cash_applied_to_invoice, cash_app_config_updated, customer_email_domain_learned
-- Part 2 additions (cash_app.* dotted prefix):
--   cash_app.layer2_scored, cash_app.layer2_escalated_to_toptier,
--   cash_app.layer2_dropped_to_review, cash_app.review_item_created,
--   cash_app.review_item_resolved, cash_app.pattern_learned, cash_app.pattern_matched

-- ---------- 6. RLS enable + policies ----------
ALTER TABLE public.firm_llm_config                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_cash_app_match_scores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_cash_app_review_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_app_payer_patterns_global    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tbl_firm_llm_config_select ON public.firm_llm_config;
DROP POLICY IF EXISTS tbl_firm_llm_config_insert ON public.firm_llm_config;
DROP POLICY IF EXISTS tbl_firm_llm_config_update ON public.firm_llm_config;
DROP POLICY IF EXISTS tbl_firm_llm_config_service_role ON public.firm_llm_config;
CREATE POLICY tbl_firm_llm_config_select
  ON public.firm_llm_config FOR SELECT
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_firm_llm_config_insert
  ON public.firm_llm_config FOR INSERT
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_firm_llm_config_update
  ON public.firm_llm_config FOR UPDATE
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid)
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_firm_llm_config_service_role ON public.firm_llm_config FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS tbl_ar_cash_app_match_scores_select ON public.ar_cash_app_match_scores;
DROP POLICY IF EXISTS tbl_ar_cash_app_match_scores_insert ON public.ar_cash_app_match_scores;
DROP POLICY IF EXISTS tbl_ar_cash_app_match_scores_update ON public.ar_cash_app_match_scores;
DROP POLICY IF EXISTS tbl_ar_cash_app_match_scores_service_role ON public.ar_cash_app_match_scores;
CREATE POLICY tbl_ar_cash_app_match_scores_select
  ON public.ar_cash_app_match_scores FOR SELECT
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_match_scores_insert
  ON public.ar_cash_app_match_scores FOR INSERT
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_match_scores_update
  ON public.ar_cash_app_match_scores FOR UPDATE
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid)
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_match_scores_service_role ON public.ar_cash_app_match_scores FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS tbl_ar_cash_app_review_items_select ON public.ar_cash_app_review_items;
DROP POLICY IF EXISTS tbl_ar_cash_app_review_items_insert ON public.ar_cash_app_review_items;
DROP POLICY IF EXISTS tbl_ar_cash_app_review_items_update ON public.ar_cash_app_review_items;
DROP POLICY IF EXISTS tbl_ar_cash_app_review_items_service_role ON public.ar_cash_app_review_items;
CREATE POLICY tbl_ar_cash_app_review_items_select
  ON public.ar_cash_app_review_items FOR SELECT
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_review_items_insert
  ON public.ar_cash_app_review_items FOR INSERT
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_review_items_update
  ON public.ar_cash_app_review_items FOR UPDATE
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid)
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_review_items_service_role ON public.ar_cash_app_review_items FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS tbl_cash_app_payer_patterns_global_select_authenticated ON public.cash_app_payer_patterns_global;
DROP POLICY IF EXISTS tbl_cash_app_payer_patterns_global_write_service_role ON public.cash_app_payer_patterns_global;
DROP POLICY IF EXISTS tbl_cash_app_payer_patterns_global_update_service_role ON public.cash_app_payer_patterns_global;
CREATE POLICY tbl_cash_app_payer_patterns_global_select_authenticated
  ON public.cash_app_payer_patterns_global FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY tbl_cash_app_payer_patterns_global_write_service_role
  ON public.cash_app_payer_patterns_global FOR INSERT
  TO service_role
  WITH CHECK (true);
CREATE POLICY tbl_cash_app_payer_patterns_global_update_service_role
  ON public.cash_app_payer_patterns_global FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
