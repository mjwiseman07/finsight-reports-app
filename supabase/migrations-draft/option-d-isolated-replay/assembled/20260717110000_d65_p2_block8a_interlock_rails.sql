-- Phase D6.5 Part 2 Block 8a — L9 Interlock + L10 Banking Rail Fan-Out
-- Depends on: Block 3 (vendor_bank_history), Block 6a (requisitions), Block 6b (gl_account_budgets),
--             Block 7a (vendor_credits, vendor_prepayment_balances, engagement_addons,
--                       pilot_feature_allowlist, ap_intake_ledger_event_types, firm_memberships)
BEGIN;

-- 1a. Widen engagement_addons.addon_code CHECK
ALTER TABLE public.engagement_addons DROP CONSTRAINT IF EXISTS engagement_addons_addon_code_check;
ALTER TABLE public.engagement_addons
  ADD CONSTRAINT engagement_addons_addon_code_check
  CHECK (addon_code IN (
    'ap_intake','ap_pay','ar_invoicing','ar_cash_app','ar_collections',
    'voice_collections','quarantine_review','ap_requisitions',
    'ap_baseline_harvest','ap_three_way_match','ap_budget_controls',
    'ap_credit_prepayment','ap_multimodal_inbox',
    'ap_payment_interlock','ap_banking_fanout'
  ));

-- 1b. Widen pilot_feature_allowlist.feature_code CHECK
ALTER TABLE public.pilot_feature_allowlist DROP CONSTRAINT IF EXISTS pilot_feature_allowlist_feature_code_check;
ALTER TABLE public.pilot_feature_allowlist
  ADD CONSTRAINT pilot_feature_allowlist_feature_code_check
  CHECK (feature_code IN (
    'ap_requisitions','ap_baseline_harvest','ap_three_way_match',
    'ap_approval_matrix','ap_budget_controls','ap_credit_prepayment',
    'ap_multimodal_inbox','ap_payment_interlock','ap_banking_fanout'
  ));

-- 2. Table: payment_batches (parent — every rail attempt must attach to a batch)
CREATE TABLE IF NOT EXISTS public.payment_batches (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                  UUID NOT NULL,
  firm_client_id           UUID NOT NULL,
  engagement_id            UUID NOT NULL,
  batch_number             TEXT NOT NULL,
  currency                 TEXT NOT NULL DEFAULT 'USD',
  status                   TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','interlock_pending','interlock_passed','interlock_failed','interlock_reviewer_approved','interlock_reviewer_rejected','executed','cancelled')),
  requested_by_user_id     UUID NOT NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (firm_client_id, batch_number)
);
CREATE INDEX IF NOT EXISTS pb_firm_status_idx
  ON public.payment_batches (firm_id, status);
CREATE INDEX IF NOT EXISTS pb_firm_client_status_idx
  ON public.payment_batches (firm_client_id, status);
ALTER TABLE public.payment_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pb_service_all ON public.payment_batches;
CREATE POLICY pb_service_all ON public.payment_batches
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS pb_firm_member_select ON public.payment_batches;
CREATE POLICY pb_firm_member_select ON public.payment_batches
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.firm_memberships fm
                 WHERE fm.firm_id = payment_batches.firm_id AND fm.user_id = auth.uid()));

-- 3. Table: payment_batch_lines
CREATE TABLE IF NOT EXISTS public.payment_batch_lines (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id                 UUID NOT NULL REFERENCES public.payment_batches(id) ON DELETE CASCADE,
  firm_id                  UUID NOT NULL,
  firm_client_id           UUID NOT NULL,
  vendor_id                UUID NOT NULL,
  bill_id                  UUID,
  requisition_id           UUID,
  gross_amount_cents       BIGINT NOT NULL CHECK (gross_amount_cents > 0),
  applied_credit_cents     BIGINT NOT NULL DEFAULT 0 CHECK (applied_credit_cents >= 0),
  applied_prepayment_cents BIGINT NOT NULL DEFAULT 0 CHECK (applied_prepayment_cents >= 0),
  net_amount_cents         BIGINT NOT NULL CHECK (net_amount_cents >= 0),
  gl_account_code          TEXT,
  memo                     TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pbl_net_within_gross CHECK (net_amount_cents <= gross_amount_cents)
);
CREATE INDEX IF NOT EXISTS pbl_batch_idx ON public.payment_batch_lines (batch_id);
CREATE INDEX IF NOT EXISTS pbl_firm_vendor_idx ON public.payment_batch_lines (firm_id, vendor_id);
ALTER TABLE public.payment_batch_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pbl_service_all ON public.payment_batch_lines;
CREATE POLICY pbl_service_all ON public.payment_batch_lines
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS pbl_firm_member_select ON public.payment_batch_lines;
CREATE POLICY pbl_firm_member_select ON public.payment_batch_lines
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.firm_memberships fm
                 WHERE fm.firm_id = payment_batch_lines.firm_id AND fm.user_id = auth.uid()));

-- 4. Table: payment_batch_interlock_events (L9 append-only)
CREATE TABLE IF NOT EXISTS public.payment_batch_interlock_events (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id                  UUID NOT NULL REFERENCES public.payment_batches(id) ON DELETE CASCADE,
  firm_id                   UUID NOT NULL,
  firm_client_id            UUID NOT NULL,
  computed_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  result                    TEXT NOT NULL CHECK (result IN ('passed','failed','reviewer_approved','reviewer_rejected')),
  reviewer_role_slug        TEXT NOT NULL DEFAULT 'firm_admin',
  reviewer_user_id          UUID,
  reviewer_decided_at       TIMESTAMPTZ,
  reason_codes              JSONB NOT NULL DEFAULT '[]'::jsonb,
  per_vendor_net_positions  JSONB NOT NULL DEFAULT '[]'::jsonb,
  gl_budget_snapshot        JSONB NOT NULL DEFAULT '[]'::jsonb,
  vendor_commitment_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pbie_batch_idx ON public.payment_batch_interlock_events (batch_id, computed_at DESC);
CREATE INDEX IF NOT EXISTS pbie_firm_result_idx ON public.payment_batch_interlock_events (firm_id, result);
ALTER TABLE public.payment_batch_interlock_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pbie_service_all ON public.payment_batch_interlock_events;
CREATE POLICY pbie_service_all ON public.payment_batch_interlock_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS pbie_firm_member_select ON public.payment_batch_interlock_events;
CREATE POLICY pbie_firm_member_select ON public.payment_batch_interlock_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.firm_memberships fm
                 WHERE fm.firm_id = payment_batch_interlock_events.firm_id AND fm.user_id = auth.uid()));

-- 5. Table: vendor_bank_accounts (canonical, firm-managed; per-vendor rail preferences)
CREATE TABLE IF NOT EXISTS public.vendor_bank_accounts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id               UUID NOT NULL,
  firm_client_id        UUID NOT NULL,
  vendor_id             UUID NOT NULL,
  nickname              TEXT,
  routing_number_last4  TEXT NOT NULL,
  account_number_last4  TEXT NOT NULL,
  account_hash_sha256   TEXT NOT NULL,
  preferred_rail        TEXT NOT NULL CHECK (preferred_rail IN ('ach','wire','rtp','check','virtual_card')),
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  registered_by_user_id UUID NOT NULL,
  deactivated_at        TIMESTAMPTZ,
  deactivated_by_user_id UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (firm_client_id, vendor_id, account_hash_sha256)
);
CREATE INDEX IF NOT EXISTS vba_firm_vendor_active_idx
  ON public.vendor_bank_accounts (firm_id, vendor_id, is_active);
CREATE INDEX IF NOT EXISTS vba_firm_client_vendor_idx
  ON public.vendor_bank_accounts (firm_client_id, vendor_id);
ALTER TABLE public.vendor_bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vba_service_all ON public.vendor_bank_accounts;
CREATE POLICY vba_service_all ON public.vendor_bank_accounts
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS vba_firm_member_select ON public.vendor_bank_accounts;
CREATE POLICY vba_firm_member_select ON public.vendor_bank_accounts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.firm_memberships fm
                 WHERE fm.firm_id = vendor_bank_accounts.firm_id AND fm.user_id = auth.uid()));

-- 6. Table: vendor_bank_fanout_events (L10 append-only rail execution attempts)
CREATE TABLE IF NOT EXISTS public.vendor_bank_fanout_events (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id               UUID NOT NULL REFERENCES public.payment_batches(id) ON DELETE CASCADE,
  batch_line_id          UUID NOT NULL REFERENCES public.payment_batch_lines(id) ON DELETE CASCADE,
  firm_id                UUID NOT NULL,
  firm_client_id         UUID NOT NULL,
  vendor_id              UUID NOT NULL,
  vendor_bank_account_id UUID NOT NULL REFERENCES public.vendor_bank_accounts(id),
  rail                   TEXT NOT NULL CHECK (rail IN ('ach','wire','rtp','check','virtual_card')),
  adapter_version        TEXT NOT NULL,
  attempt_type           TEXT NOT NULL CHECK (attempt_type IN ('attempt','record')),
  outcome                TEXT NOT NULL CHECK (outcome IN ('pending','submitted','confirmed','failed','cancelled')),
  amount_cents           BIGINT NOT NULL CHECK (amount_cents > 0),
  external_reference     TEXT,
  raw_adapter_payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempted_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vbfe_batch_idx ON public.vendor_bank_fanout_events (batch_id);
CREATE INDEX IF NOT EXISTS vbfe_firm_vendor_rail_idx ON public.vendor_bank_fanout_events (firm_id, vendor_id, rail);
CREATE INDEX IF NOT EXISTS vbfe_line_attempted_idx ON public.vendor_bank_fanout_events (batch_line_id, attempted_at DESC);
ALTER TABLE public.vendor_bank_fanout_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vbfe_service_all ON public.vendor_bank_fanout_events;
CREATE POLICY vbfe_service_all ON public.vendor_bank_fanout_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS vbfe_firm_member_select ON public.vendor_bank_fanout_events;
CREATE POLICY vbfe_firm_member_select ON public.vendor_bank_fanout_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.firm_memberships fm
                 WHERE fm.firm_id = vendor_bank_fanout_events.firm_id AND fm.user_id = auth.uid()));

-- 7. Register 12 new Merkle-chained events in ap_intake_ledger_event_types
INSERT INTO public.ap_intake_ledger_event_types (event_type, actor_type, is_merkle_chained) VALUES
  ('ap_batch.created',                        'user',   TRUE),
  ('ap_batch.line_added',                     'user',   TRUE),
  ('ap_batch.interlock_computed',             'system', TRUE),
  ('ap_batch.interlock_passed',               'system', TRUE),
  ('ap_batch.interlock_failed',               'system', TRUE),
  ('ap_batch.interlock_reviewer_approved',    'user',   TRUE),
  ('ap_batch.interlock_reviewer_rejected',    'user',   TRUE),
  ('ap_rail.vendor_account_registered',       'user',   TRUE),
  ('ap_rail.vendor_account_updated',          'user',   TRUE),
  ('ap_rail.vendor_account_deactivated',      'user',   TRUE),
  ('ap_rail.fanout_attempted',                'system', TRUE),
  ('ap_rail.fanout_recorded',                 'system', TRUE)
ON CONFLICT (event_type) DO NOTHING;

COMMENT ON COLUMN public.payment_batch_lines.vendor_id IS
  'Logical vendor UUID. Unconstrained per codebase convention: vendor_master_mirror is an ERP-owned mirror, not a canonical registry.';
COMMENT ON COLUMN public.vendor_bank_accounts.vendor_id IS
  'Logical vendor UUID. Unconstrained per codebase convention.';
COMMENT ON COLUMN public.payment_batch_interlock_events.reviewer_role_slug IS
  'Stub for Block 8b L12 preset packs — currently defaults to firm_admin; L12 will drive per-pack overrides.';

COMMIT;
