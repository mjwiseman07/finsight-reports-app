-- ============================================================================
-- Phase D6.5 Part 1 — Universal Intake Bus
-- Adds:
--   - intake_messages                (raw inbound messages, all channels)
--   - intake_attachments             (per-attachment blobs + SHA256 hash)
--   - intake_dispatch_log            (which handler ran, outcome, timing)
--   - firm_intake_addresses          (per-firm/handler routable addresses w/ HMAC token)
--   - firm_intake_handlers           (per-firm handler enable/disable)
--   - firm_intake_settings           (per-firm LLM classifier knobs)
--   - intake_message ledger events   (enforced in lib/events/intake-catalog.ts)
--   - RLS on all tenant-scoped tables
-- Backward-compat:
--   - ar_cash_app_remittances gains intake_message_id (nullable FK) so the
--     existing cash-app ingestion path becomes a handler outcome, not the
--     primary insert.
-- ============================================================================

-- ---------- 1. intake_messages ----------
CREATE TABLE IF NOT EXISTS public.intake_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid,
  company_id uuid,
  firm_client_id uuid,
  source_channel text NOT NULL
    CHECK (source_channel IN ('postmark_inbound','manual_upload','api_forward')),
  source_message_id text NOT NULL,
  recipient_address text,
  recipient_prefix text,
  recipient_firm_slug text,
  recipient_token text,
  recipient_resolution text NOT NULL DEFAULT 'unresolved'
    CHECK (recipient_resolution IN ('unresolved','address_matched','sender_domain_matched','classifier_matched','manual')),
  sender_email text,
  sender_domain text,
  subject text,
  received_at timestamptz NOT NULL,
  raw_body_text text,
  raw_body_html text,
  raw_headers jsonb,
  raw_payload jsonb NOT NULL,
  content_hash text NOT NULL,
  dedup_key text NOT NULL,
  is_duplicate boolean NOT NULL DEFAULT false,
  duplicate_of uuid REFERENCES public.intake_messages(id),
  dispatch_status text NOT NULL DEFAULT 'pending'
    CHECK (dispatch_status IN ('pending','dispatched','handler_success','handler_failed','no_handler','duplicate')),
  dispatch_handler_key text,
  dispatch_reason text,
  dispatch_confidence numeric(4,3),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT intake_messages_dedup_unique UNIQUE (dedup_key)
);

CREATE INDEX IF NOT EXISTS idx_intake_messages_content_hash
  ON public.intake_messages(content_hash);
CREATE INDEX IF NOT EXISTS idx_intake_messages_firm_status
  ON public.intake_messages(firm_id, dispatch_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intake_messages_recipient
  ON public.intake_messages(recipient_prefix, recipient_firm_slug, recipient_token);

-- ---------- 2. intake_attachments ----------
CREATE TABLE IF NOT EXISTS public.intake_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_message_id uuid NOT NULL REFERENCES public.intake_messages(id) ON DELETE CASCADE,
  firm_id uuid,
  company_id uuid,
  filename text NOT NULL,
  content_type text NOT NULL,
  content_length integer NOT NULL,
  content_sha256 text NOT NULL,
  content_base64 text NOT NULL,
  is_duplicate_of uuid REFERENCES public.intake_attachments(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intake_attachments_sha256
  ON public.intake_attachments(firm_id, content_sha256);
CREATE INDEX IF NOT EXISTS idx_intake_attachments_message
  ON public.intake_attachments(intake_message_id);

-- ---------- 3. intake_dispatch_log ----------
CREATE TABLE IF NOT EXISTS public.intake_dispatch_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_message_id uuid NOT NULL REFERENCES public.intake_messages(id) ON DELETE CASCADE,
  firm_id uuid,
  company_id uuid,
  handler_key text NOT NULL,
  outcome text NOT NULL
    CHECK (outcome IN ('success','failed','skipped_no_entitlement','skipped_disabled','skipped_not_applicable')),
  outcome_detail jsonb,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intake_dispatch_log_message
  ON public.intake_dispatch_log(intake_message_id);
CREATE INDEX IF NOT EXISTS idx_intake_dispatch_log_firm_handler
  ON public.intake_dispatch_log(firm_id, handler_key, created_at DESC);

-- ---------- 4. firm_intake_addresses ----------
CREATE TABLE IF NOT EXISTS public.firm_intake_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  company_id uuid NOT NULL,
  handler_key text NOT NULL,
  firm_slug text NOT NULL,
  token text NOT NULL,
  full_address text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT firm_intake_addresses_unique UNIQUE (handler_key, firm_slug, token)
);

CREATE INDEX IF NOT EXISTS idx_firm_intake_addresses_firm_client
  ON public.firm_intake_addresses(firm_id, company_id, enabled);
CREATE INDEX IF NOT EXISTS idx_firm_intake_addresses_lookup
  ON public.firm_intake_addresses(handler_key, firm_slug, token)
  WHERE enabled = true;

-- ---------- 5. firm_intake_handlers ----------
CREATE TABLE IF NOT EXISTS public.firm_intake_handlers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  company_id uuid NOT NULL,
  handler_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  required_entitlement text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT firm_intake_handlers_unique UNIQUE (company_id, handler_key)
);

CREATE INDEX IF NOT EXISTS idx_firm_intake_handlers_firm
  ON public.firm_intake_handlers(firm_id, enabled);

-- ---------- 6. firm_intake_settings ----------
CREATE TABLE IF NOT EXISTS public.firm_intake_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  company_id uuid NOT NULL UNIQUE,
  classifier_enabled boolean NOT NULL DEFAULT true,
  classifier_tier text NOT NULL DEFAULT 'primary'
    CHECK (classifier_tier IN ('primary','toptier','haiku')),
  classifier_confidence_floor numeric(4,3) NOT NULL DEFAULT 0.700
    CHECK (classifier_confidence_floor >= 0 AND classifier_confidence_floor <= 1),
  fallback_handler_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- 7. ar_cash_app_remittances backfill link ----------
ALTER TABLE public.ar_cash_app_remittances
  ADD COLUMN IF NOT EXISTS intake_message_id uuid REFERENCES public.intake_messages(id);

CREATE INDEX IF NOT EXISTS idx_ar_cash_app_remittances_intake_message
  ON public.ar_cash_app_remittances(intake_message_id);

-- ---------- 8. RLS ----------
ALTER TABLE public.intake_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_dispatch_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firm_intake_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firm_intake_handlers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firm_intake_settings ENABLE ROW LEVEL SECURITY;

-- Tenant-scoped SELECT/INSERT/UPDATE by firm (firm_memberships, not firm_members)
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'intake_messages',
    'intake_attachments',
    'intake_dispatch_log',
    'firm_intake_addresses',
    'firm_intake_handlers',
    'firm_intake_settings'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant_select ON public.%I', t, t);
    EXECUTE format($p$
      CREATE POLICY %I_tenant_select ON public.%I
      FOR SELECT TO authenticated
      USING (
        firm_id IN (
          SELECT firm_id FROM public.firm_memberships
          WHERE user_id = auth.uid()
        )
      )
    $p$, t, t);

    EXECUTE format('DROP POLICY IF EXISTS %I_tenant_insert ON public.%I', t, t);
    EXECUTE format($p$
      CREATE POLICY %I_tenant_insert ON public.%I
      FOR INSERT TO authenticated
      WITH CHECK (
        firm_id IN (
          SELECT firm_id FROM public.firm_memberships
          WHERE user_id = auth.uid()
        )
      )
    $p$, t, t);

    EXECUTE format('DROP POLICY IF EXISTS %I_tenant_update ON public.%I', t, t);
    EXECUTE format($p$
      CREATE POLICY %I_tenant_update ON public.%I
      FOR UPDATE TO authenticated
      USING (
        firm_id IN (
          SELECT firm_id FROM public.firm_memberships
          WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        firm_id IN (
          SELECT firm_id FROM public.firm_memberships
          WHERE user_id = auth.uid()
        )
      )
    $p$, t, t);

    EXECUTE format('DROP POLICY IF EXISTS %I_service_role ON public.%I', t, t);
    EXECUTE format($p$
      CREATE POLICY %I_service_role ON public.%I
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true)
    $p$, t, t);
  END LOOP;
END $$;

-- ---------- 9. Default settings + handler rows for existing firm_clients ----------
-- required_entitlement uses real Doc D addon codes (engagement_addons.addon_code):
-- ar_cash_app / ap_intake — not the paste-block placeholders ar_cash_application / ap_bill_pay.
INSERT INTO public.firm_intake_settings (firm_id, company_id)
SELECT firm_id, company_id
FROM public.firm_clients
WHERE company_id IS NOT NULL
ON CONFLICT (company_id) DO NOTHING;

INSERT INTO public.firm_intake_handlers (firm_id, company_id, handler_key, enabled, required_entitlement)
SELECT firm_id, company_id, 'cash_app_remit', true, 'ar_cash_app'
FROM public.firm_clients
WHERE company_id IS NOT NULL
ON CONFLICT (company_id, handler_key) DO NOTHING;

INSERT INTO public.firm_intake_handlers (firm_id, company_id, handler_key, enabled, required_entitlement)
SELECT firm_id, company_id, 'bills', false, 'ap_intake'
FROM public.firm_clients
WHERE company_id IS NOT NULL
ON CONFLICT (company_id, handler_key) DO NOTHING;

INSERT INTO public.firm_intake_handlers (firm_id, company_id, handler_key, enabled, required_entitlement)
SELECT firm_id, company_id, 'docs', true, NULL
FROM public.firm_clients
WHERE company_id IS NOT NULL
ON CONFLICT (company_id, handler_key) DO NOTHING;

-- ---------- 10. updated_at triggers ----------
CREATE OR REPLACE FUNCTION public._intake_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'intake_messages','firm_intake_handlers','firm_intake_settings'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_touch_updated_at ON public.%I', t, t);
    EXECUTE format($p$
      CREATE TRIGGER %I_touch_updated_at
      BEFORE UPDATE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public._intake_touch_updated_at()
    $p$, t, t);
  END LOOP;
END $$;

-- ============================================================================
-- END Phase D6.5 Part 1
-- ============================================================================
