-- ============================================================================
-- Phase D6.7 Part 1 — AR Cash Application Layer 0 + Layer 1
-- Adds:
--   - customers table (AR payer registry) + email_domain column
--   - 5 new tables (ar_cash_app_remittances, _remittance_lines, _payments,
--                    _match_candidates, _config)
--   - 9 new cash_app ledger event types (enforced in lib/events/publisher.ts)
--   - RLS on all new tables (firm_id scoped)
--   - Default config row per existing firm_clients
-- ============================================================================

-- ---------- 0. customers (AR payer registry — table did not exist pre-D6.7) ----------
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE RESTRICT,
  company_id uuid NOT NULL,
  name text,
  email_domain text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_company
  ON public.customers (company_id);

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS email_domain text;

CREATE INDEX IF NOT EXISTS idx_customers_email_domain
  ON public.customers (company_id, email_domain)
  WHERE email_domain IS NOT NULL;

COMMENT ON COLUMN public.customers.email_domain IS
  'Primary billing domain for cash-app payer resolution. Auto-populated on first unambiguous match. Future D6.8 customer_contacts table becomes source of truth for multi-contact scenarios; this column remains the fast-path lookup.';

-- ---------- 1. ar_cash_app_remittances (Layer 0 raw ingest) ----------
CREATE TABLE IF NOT EXISTS public.ar_cash_app_remittances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  company_id uuid NOT NULL,
  source_channel text NOT NULL CHECK (source_channel IN (
    'postmark_inbound',
    'bank_feed_memo',
    'edi_820',
    'iso20022_camt054',
    'iso20022_pacs008',
    'lockbox_file',
    'manual_upload',
    'portal_paste'
  )),
  source_message_id text,
  raw_payload jsonb NOT NULL,
  raw_body_text text,
  raw_attachments jsonb DEFAULT '[]'::jsonb,
  sender_email text,
  sender_domain text,
  subject text,
  received_at timestamptz NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  parse_status text NOT NULL DEFAULT 'pending' CHECK (parse_status IN (
    'pending', 'parsed', 'parse_failed', 'duplicate'
  )),
  parse_error text,
  dedup_hash text NOT NULL UNIQUE,
  assertions_addressed text[] DEFAULT ARRAY['completeness']::text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ar_cash_app_remittances_inbox
  ON public.ar_cash_app_remittances (firm_id, company_id, ingested_at DESC);

CREATE INDEX IF NOT EXISTS idx_ar_cash_app_remittances_worker
  ON public.ar_cash_app_remittances (company_id, parse_status)
  WHERE parse_status = 'pending';

-- ---------- 2. ar_cash_app_remittance_lines ----------
CREATE TABLE IF NOT EXISTS public.ar_cash_app_remittance_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  remittance_id uuid NOT NULL REFERENCES public.ar_cash_app_remittances(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL,
  company_id uuid NOT NULL,
  line_number int NOT NULL,
  invoice_reference text,
  invoice_reference_normalized text,
  amount_paid numeric(18,2),
  amount_discount numeric(18,2) DEFAULT 0,
  amount_deduction numeric(18,2) DEFAULT 0,
  deduction_reason_hint text,
  currency text NOT NULL DEFAULT 'USD',
  payment_date_hint date,
  raw_line_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (remittance_id, line_number)
);

CREATE INDEX IF NOT EXISTS idx_ar_cash_app_lines_matcher_lookup
  ON public.ar_cash_app_remittance_lines (company_id, invoice_reference_normalized)
  WHERE invoice_reference_normalized IS NOT NULL;

-- ---------- 3. ar_cash_app_payments (payment envelope) ----------
CREATE TABLE IF NOT EXISTS public.ar_cash_app_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  company_id uuid NOT NULL,
  payment_source text NOT NULL CHECK (payment_source IN (
    'bank_feed', 'stripe_payout', 'manual_entry',
    'ach_direct', 'wire', 'check_deposit', 'credit_card'
  )),
  external_payment_id text,
  payer_name_raw text,
  payer_name_normalized text,
  customer_id uuid,
  amount_received numeric(18,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  payment_date date NOT NULL,
  posted_to_gl_account_id uuid,
  memo_raw text,
  linked_remittance_id uuid REFERENCES public.ar_cash_app_remittances(id) ON DELETE SET NULL,
  pairing_confidence numeric(5,4),
  pairing_method text CHECK (pairing_method IN (
    'exact_ref', 'exact_amount_date', 'payer_email_domain',
    'manual', 'unpaired'
  )),
  match_status text NOT NULL DEFAULT 'unmatched' CHECK (match_status IN (
    'unmatched', 'matched', 'partial_match', 'in_review', 'applied', 'voided'
  )),
  assertions_addressed text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, payment_source, external_payment_id)
);

CREATE INDEX IF NOT EXISTS idx_ar_cash_app_payments_queue
  ON public.ar_cash_app_payments (company_id, match_status, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_ar_cash_app_payments_payer
  ON public.ar_cash_app_payments (company_id, payer_name_normalized)
  WHERE payer_name_normalized IS NOT NULL;

-- ---------- 4. ar_cash_app_match_candidates ----------
CREATE TABLE IF NOT EXISTS public.ar_cash_app_match_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.ar_cash_app_payments(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL,
  company_id uuid NOT NULL,
  invoice_id uuid NOT NULL,
  matched_amount numeric(18,2) NOT NULL,
  match_strategy text NOT NULL CHECK (match_strategy IN (
    'exact_ref_exact_amt',
    'exact_ref_tolerance',
    'exact_amt_open_invoice',
    'remittance_line_ref',
    'single_open_invoice_exact_amt',
    'payer_domain_scoped_ref_amt'
  )),
  confidence numeric(5,4) NOT NULL,
  tolerance_used_cents int DEFAULT 0,
  tolerance_used_days int DEFAULT 0,
  rationale text NOT NULL,
  posted_je_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ar_cash_app_candidates_payment
  ON public.ar_cash_app_match_candidates (payment_id);

CREATE INDEX IF NOT EXISTS idx_ar_cash_app_candidates_invoice
  ON public.ar_cash_app_match_candidates (company_id, invoice_id);

-- ---------- 5. ar_cash_app_config ----------
CREATE TABLE IF NOT EXISTS public.ar_cash_app_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  company_id uuid NOT NULL UNIQUE,
  exact_amount_tolerance_cents int NOT NULL DEFAULT 0,
  date_window_days_backward int NOT NULL DEFAULT 150,
  date_window_days_forward int NOT NULL DEFAULT 7,
  enable_single_open_invoice_shortcut boolean NOT NULL DEFAULT true,
  undeposited_funds_gl_account_id uuid,
  require_reviewer_approval boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.ar_cash_app_config (firm_id, company_id)
SELECT firm_id, company_id
FROM public.firm_clients
ON CONFLICT (company_id) DO NOTHING;

-- ---------- 6. ledger_events event types ----------
-- No event_type CHECK exists on ledger_events; cash_app event types are enforced
-- in lib/events/publisher.ts (CASH_APP_EVENT_TYPES allowlist). New types:
--   remittance_ingested, remittance_parsed, payment_ingested,
--   match_candidate_proposed, match_candidate_approved, match_candidate_rejected,
--   cash_applied_to_invoice, cash_app_config_updated, customer_email_domain_learned

-- ---------- 7. RLS enable + policies ----------
ALTER TABLE public.customers                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_cash_app_remittances       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_cash_app_remittance_lines  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_cash_app_payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_cash_app_match_candidates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_cash_app_config            ENABLE ROW LEVEL SECURITY;

-- customers
DROP POLICY IF EXISTS tbl_customers_select ON public.customers;
DROP POLICY IF EXISTS tbl_customers_insert ON public.customers;
DROP POLICY IF EXISTS tbl_customers_update ON public.customers;
DROP POLICY IF EXISTS tbl_customers_service_role ON public.customers;
CREATE POLICY tbl_customers_select ON public.customers FOR SELECT
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_customers_insert ON public.customers FOR INSERT
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_customers_update ON public.customers FOR UPDATE
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid)
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_customers_service_role ON public.customers FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ar_cash_app_remittances
DROP POLICY IF EXISTS tbl_ar_cash_app_remittances_select ON public.ar_cash_app_remittances;
DROP POLICY IF EXISTS tbl_ar_cash_app_remittances_insert ON public.ar_cash_app_remittances;
DROP POLICY IF EXISTS tbl_ar_cash_app_remittances_update ON public.ar_cash_app_remittances;
DROP POLICY IF EXISTS tbl_ar_cash_app_remittances_service_role ON public.ar_cash_app_remittances;
CREATE POLICY tbl_ar_cash_app_remittances_select ON public.ar_cash_app_remittances FOR SELECT
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_remittances_insert ON public.ar_cash_app_remittances FOR INSERT
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_remittances_update ON public.ar_cash_app_remittances FOR UPDATE
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid)
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_remittances_service_role ON public.ar_cash_app_remittances FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ar_cash_app_remittance_lines
DROP POLICY IF EXISTS tbl_ar_cash_app_remittance_lines_select ON public.ar_cash_app_remittance_lines;
DROP POLICY IF EXISTS tbl_ar_cash_app_remittance_lines_insert ON public.ar_cash_app_remittance_lines;
DROP POLICY IF EXISTS tbl_ar_cash_app_remittance_lines_update ON public.ar_cash_app_remittance_lines;
DROP POLICY IF EXISTS tbl_ar_cash_app_remittance_lines_service_role ON public.ar_cash_app_remittance_lines;
CREATE POLICY tbl_ar_cash_app_remittance_lines_select ON public.ar_cash_app_remittance_lines FOR SELECT
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_remittance_lines_insert ON public.ar_cash_app_remittance_lines FOR INSERT
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_remittance_lines_update ON public.ar_cash_app_remittance_lines FOR UPDATE
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid)
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_remittance_lines_service_role ON public.ar_cash_app_remittance_lines FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ar_cash_app_payments
DROP POLICY IF EXISTS tbl_ar_cash_app_payments_select ON public.ar_cash_app_payments;
DROP POLICY IF EXISTS tbl_ar_cash_app_payments_insert ON public.ar_cash_app_payments;
DROP POLICY IF EXISTS tbl_ar_cash_app_payments_update ON public.ar_cash_app_payments;
DROP POLICY IF EXISTS tbl_ar_cash_app_payments_service_role ON public.ar_cash_app_payments;
CREATE POLICY tbl_ar_cash_app_payments_select ON public.ar_cash_app_payments FOR SELECT
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_payments_insert ON public.ar_cash_app_payments FOR INSERT
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_payments_update ON public.ar_cash_app_payments FOR UPDATE
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid)
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_payments_service_role ON public.ar_cash_app_payments FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ar_cash_app_match_candidates
DROP POLICY IF EXISTS tbl_ar_cash_app_match_candidates_select ON public.ar_cash_app_match_candidates;
DROP POLICY IF EXISTS tbl_ar_cash_app_match_candidates_insert ON public.ar_cash_app_match_candidates;
DROP POLICY IF EXISTS tbl_ar_cash_app_match_candidates_update ON public.ar_cash_app_match_candidates;
DROP POLICY IF EXISTS tbl_ar_cash_app_match_candidates_service_role ON public.ar_cash_app_match_candidates;
CREATE POLICY tbl_ar_cash_app_match_candidates_select ON public.ar_cash_app_match_candidates FOR SELECT
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_match_candidates_insert ON public.ar_cash_app_match_candidates FOR INSERT
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_match_candidates_update ON public.ar_cash_app_match_candidates FOR UPDATE
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid)
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_match_candidates_service_role ON public.ar_cash_app_match_candidates FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ar_cash_app_config
DROP POLICY IF EXISTS tbl_ar_cash_app_config_select ON public.ar_cash_app_config;
DROP POLICY IF EXISTS tbl_ar_cash_app_config_insert ON public.ar_cash_app_config;
DROP POLICY IF EXISTS tbl_ar_cash_app_config_update ON public.ar_cash_app_config;
DROP POLICY IF EXISTS tbl_ar_cash_app_config_service_role ON public.ar_cash_app_config;
CREATE POLICY tbl_ar_cash_app_config_select ON public.ar_cash_app_config FOR SELECT
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_config_insert ON public.ar_cash_app_config FOR INSERT
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_config_update ON public.ar_cash_app_config FOR UPDATE
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid)
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_config_service_role ON public.ar_cash_app_config FOR ALL TO service_role
  USING (true) WITH CHECK (true);
