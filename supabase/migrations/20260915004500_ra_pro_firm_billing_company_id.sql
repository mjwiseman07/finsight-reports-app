-- Review Assist Pro Phase B — canonical company → firm billing link.
-- Product decisions 1A + 2A + 3A.
--
-- Adds nullable firms.billing_company_id (UNIQUE, FK companies ON DELETE RESTRICT).
-- Protects the column as server-controlled entitlement metadata.
-- Provides atomic activation RPC for company-owned RA Pro subscriptions.
-- Does NOT relax pilot_slots_entity_xor_check.
--
-- CUTOVER: This migration performs NO company↔firm backfill.
-- Operator decision (docs/security/ra-pro-cutover-operator-decision.json):
--   NO_CUTOVER × 4 (internal smoke/demo entitlements excluded).
-- All existing firms.billing_company_id values remain NULL after apply.
-- Unlinked firms remain denied from /reviewer. Future customers must use
-- the canonical activation RPC path after commerce gate reopening.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Column + constraints
-- ---------------------------------------------------------------------------
ALTER TABLE public.firms
  ADD COLUMN IF NOT EXISTS billing_company_id uuid;

-- Fail closed if any non-null billing link already exists at schema apply.
-- Production at authorized cutover: column absent → all NULL after ADD.
-- Explicitly forbids embedding legacy backfill in this release.
DO $$
DECLARE
  v_linked int;
BEGIN
  SELECT count(*)::int INTO v_linked
  FROM public.firms
  WHERE billing_company_id IS NOT NULL;
  IF v_linked <> 0 THEN
    RAISE EXCEPTION
      'ra_pro_no_backfill_expected_zero_linked_firms got %', v_linked;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'firms_billing_company_id_fkey'
      AND conrelid = 'public.firms'::regclass
  ) THEN
    ALTER TABLE public.firms
      ADD CONSTRAINT firms_billing_company_id_fkey
      FOREIGN KEY (billing_company_id)
      REFERENCES public.companies(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS firms_billing_company_id_uidx
  ON public.firms (billing_company_id)
  WHERE billing_company_id IS NOT NULL;

COMMENT ON COLUMN public.firms.billing_company_id IS
  'RA Pro: canonical billing company that owns this firm workspace. Server-controlled. Nullable only until linked; unlinked firms never authorize /reviewer.';

-- service_role write path (PostgREST bypasses RLS in hosted Supabase; policy is defense-in-depth).
DROP POLICY IF EXISTS firms_service_role_all ON public.firms;
CREATE POLICY firms_service_role_all ON public.firms
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS firm_memberships_service_role_all ON public.firm_memberships;
CREATE POLICY firm_memberships_service_role_all ON public.firm_memberships
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS firm_clients_service_role_all ON public.firm_clients;
CREATE POLICY firm_clients_service_role_all ON public.firm_clients
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS pilot_slots_service_role_all ON public.pilot_slots;
CREATE POLICY pilot_slots_service_role_all ON public.pilot_slots
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.firms TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.firm_memberships TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.firm_clients TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pilot_slots TO service_role;
GRANT SELECT, UPDATE ON public.companies TO service_role;
GRANT SELECT ON public.company_users TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stripe_webhook_events TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Server-controlled field protection (SECURITY INVOKER trigger)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.firms_protect_billing_company_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  allowed boolean := false;
BEGIN
  -- Trusted database roles only. Never trust JWT claims, GUCs, headers, or parameters.
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    allowed := true;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.billing_company_id IS NOT NULL AND NOT allowed THEN
      RAISE EXCEPTION 'billing_company_id_forbidden'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.billing_company_id IS DISTINCT FROM OLD.billing_company_id THEN
    IF NOT allowed THEN
      RAISE EXCEPTION 'billing_company_id_immutable'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_firms_protect_billing_company_id ON public.firms;
CREATE TRIGGER trg_firms_protect_billing_company_id
  BEFORE INSERT OR UPDATE ON public.firms
  FOR EACH ROW
  EXECUTE FUNCTION public.firms_protect_billing_company_id();

REVOKE ALL ON FUNCTION public.firms_protect_billing_company_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.firms_protect_billing_company_id() FROM anon, authenticated;

-- Defense in depth: no Data API column update for browser roles.
REVOKE UPDATE (billing_company_id) ON public.firms FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Capacity guards for RA Pro–linked firms (2 clients, 5 seats)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.firms_enforce_ra_pro_client_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_billing uuid;
  v_cap int;
  v_count int;
  v_comp_cap int;
  v_status text;
BEGIN
  SELECT f.billing_company_id INTO v_billing
  FROM public.firms f
  WHERE f.id = NEW.firm_id;

  IF v_billing IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only constrain rows that are (or become) active clients.
  IF TG_OP = 'UPDATE'
     AND OLD.subscription_status = 'active'
     AND NEW.subscription_status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;
  IF NEW.subscription_status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  SELECT ps.pilot_status, ps.complimentary_client_cap
    INTO v_status, v_comp_cap
  FROM public.pilot_slots ps
  WHERE ps.company_id = v_billing
    AND ps.tier_key = 'review_assist_pro'
  LIMIT 1;

  IF v_status IS NULL THEN
    -- Linked firm without RA Pro slot: fail closed on new active clients.
    RAISE EXCEPTION 'ra_pro_client_cap_no_subscription'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_status = 'complimentary' THEN
    v_cap := coalesce(v_comp_cap, 2);
  ELSE
    v_cap := 2; -- RA_PRO_INCLUDED_CLIENT_COMPANIES
  END IF;

  SELECT count(*)::int INTO v_count
  FROM public.firm_clients fc
  WHERE fc.firm_id = NEW.firm_id
    AND fc.subscription_status = 'active'
    AND (TG_OP = 'INSERT' OR fc.id IS DISTINCT FROM NEW.id);

  IF v_count >= v_cap THEN
    RAISE EXCEPTION 'ra_pro_client_cap_reached'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_firms_enforce_ra_pro_client_cap ON public.firm_clients;
CREATE TRIGGER trg_firms_enforce_ra_pro_client_cap
  BEFORE INSERT OR UPDATE OF subscription_status, firm_id ON public.firm_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.firms_enforce_ra_pro_client_cap();

REVOKE ALL ON FUNCTION public.firms_enforce_ra_pro_client_cap() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.firms_enforce_ra_pro_client_cap() FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.firms_enforce_ra_pro_seat_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_billing uuid;
  v_count int;
BEGIN
  SELECT f.billing_company_id INTO v_billing
  FROM public.firms f
  WHERE f.id = NEW.firm_id;

  IF v_billing IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.status = 'active'
     AND NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  SELECT count(*)::int INTO v_count
  FROM public.firm_memberships fm
  WHERE fm.firm_id = NEW.firm_id
    AND fm.status = 'active'
    AND (TG_OP = 'INSERT' OR fm.id IS DISTINCT FROM NEW.id);

  IF v_count >= 5 THEN -- RA_PRO_FIRM_SEATS
    RAISE EXCEPTION 'ra_pro_seat_cap_reached'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_firms_enforce_ra_pro_seat_cap ON public.firm_memberships;
CREATE TRIGGER trg_firms_enforce_ra_pro_seat_cap
  BEFORE INSERT OR UPDATE OF status, firm_id ON public.firm_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.firms_enforce_ra_pro_seat_cap();

REVOKE ALL ON FUNCTION public.firms_enforce_ra_pro_seat_cap() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.firms_enforce_ra_pro_seat_cap() FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Atomic RA Pro activation RPC (service_role only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.activate_review_assist_pro_subscription(
  p_company_id uuid,
  p_buyer_user_id uuid,
  p_firm_name text,
  p_stripe_subscription_id text,
  p_stripe_customer_id text,
  p_pricing_structure text,
  p_pricing_cadence text,
  p_track text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_firm_id uuid;
  v_slot_id uuid;
  v_slot_number int;
  v_existing_sub text;
  v_existing_cust text;
  v_existing_status text;
  v_membership_id uuid;
  v_taken int[];
  v_n int;
  v_seat_count int;
  v_created_firm boolean := false;
  v_buyer_ok boolean := false;
BEGIN
  -- Trusted database roles only. Never trust JWT claims or GUC impersonation.
  IF current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    RAISE EXCEPTION 'activate_ra_pro_forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_company_id IS NULL OR p_buyer_user_id IS NULL THEN
    RAISE EXCEPTION 'activate_ra_pro_missing_identity' USING ERRCODE = '22023';
  END IF;

  IF p_track IS NULL OR p_track NOT IN ('pilot', 'standard') THEN
    RAISE EXCEPTION 'activate_ra_pro_invalid_track' USING ERRCODE = '22023';
  END IF;

  IF p_stripe_subscription_id IS NULL OR length(trim(p_stripe_subscription_id)) = 0 THEN
    RAISE EXCEPTION 'activate_ra_pro_missing_subscription' USING ERRCODE = '22023';
  END IF;

  -- Serialize per-company + global pilot cohort.
  PERFORM pg_advisory_xact_lock(hashtext('ra_pro_activate'), hashtext(p_company_id::text));
  IF p_track = 'pilot' THEN
    PERFORM pg_advisory_xact_lock(hashtext('ra_pro_pilot_cohort'), 0);
  END IF;

  -- Lock billing company row.
  PERFORM 1 FROM public.companies c WHERE c.id = p_company_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'activate_ra_pro_company_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Buyer must own/belong to the billing company (canonical company_users).
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.company_id = p_company_id
      AND cu.user_id = p_buyer_user_id
      AND cu.status = 'active'
  ) INTO v_buyer_ok;

  IF NOT v_buyer_ok THEN
    RAISE EXCEPTION 'activate_ra_pro_buyer_not_company_member' USING ERRCODE = '42501';
  END IF;

  -- Existing slot for this company + tier.
  SELECT ps.id, ps.stripe_subscription_id, ps.stripe_customer_id, ps.pilot_status, ps.pilot_slot_number
    INTO v_slot_id, v_existing_sub, v_existing_cust, v_existing_status, v_slot_number
  FROM public.pilot_slots ps
  WHERE ps.company_id = p_company_id
    AND ps.tier_key = 'review_assist_pro'
  FOR UPDATE;

  IF v_slot_id IS NOT NULL THEN
    IF v_existing_sub IS NOT NULL
       AND v_existing_sub IS DISTINCT FROM p_stripe_subscription_id THEN
      RAISE EXCEPTION 'activate_ra_pro_subscription_conflict' USING ERRCODE = 'P0001';
    END IF;
    IF v_existing_cust IS NOT NULL
       AND p_stripe_customer_id IS NOT NULL
       AND v_existing_cust IS DISTINCT FROM p_stripe_customer_id THEN
      RAISE EXCEPTION 'activate_ra_pro_customer_conflict' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Resolve or create the one linked firm.
  SELECT f.id INTO v_firm_id
  FROM public.firms f
  WHERE f.billing_company_id = p_company_id
  FOR UPDATE;

  IF v_firm_id IS NULL THEN
    INSERT INTO public.firms (name, owner_user_id, billing_company_id)
    VALUES (
      coalesce(nullif(trim(p_firm_name), ''), 'Review Assist Pro Firm'),
      p_buyer_user_id,
      p_company_id
    )
    RETURNING id INTO v_firm_id;
    v_created_firm := true;
  END IF;

  -- Buyer membership (idempotent); seat cap enforced by trigger.
  SELECT fm.id INTO v_membership_id
  FROM public.firm_memberships fm
  WHERE fm.firm_id = v_firm_id
    AND fm.user_id = p_buyer_user_id
  FOR UPDATE;

  IF v_membership_id IS NULL THEN
    SELECT count(*)::int INTO v_seat_count
    FROM public.firm_memberships fm
    WHERE fm.firm_id = v_firm_id
      AND fm.status = 'active';
    IF v_seat_count >= 5 THEN
      RAISE EXCEPTION 'ra_pro_seat_cap_reached' USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.firm_memberships (firm_id, user_id, role, status)
    VALUES (v_firm_id, p_buyer_user_id, 'firm_admin', 'active')
    RETURNING id INTO v_membership_id;
  ELSE
    UPDATE public.firm_memberships
    SET role = 'firm_admin',
        status = 'active',
        updated_at = now()
    WHERE id = v_membership_id;
  END IF;

  -- Pilot cohort allocation (1–10 only).
  IF p_track = 'pilot' THEN
    IF v_slot_id IS NOT NULL AND v_slot_number IS NOT NULL AND v_slot_number BETWEEN 1 AND 10 THEN
      NULL; -- keep existing number on replay
    ELSE
      SELECT array_agg(ps.pilot_slot_number ORDER BY ps.pilot_slot_number)
        INTO v_taken
      FROM public.pilot_slots ps
      WHERE ps.tier_key = 'review_assist_pro'
        AND ps.pilot_slot_number IS NOT NULL
        AND ps.pilot_slot_number > 0
        AND (v_slot_id IS NULL OR ps.id IS DISTINCT FROM v_slot_id);

      v_slot_number := NULL;
      FOR v_n IN 1..10 LOOP
        IF v_taken IS NULL OR NOT (v_n = ANY (v_taken)) THEN
          v_slot_number := v_n;
          EXIT;
        END IF;
      END LOOP;

      IF v_slot_number IS NULL THEN
        RAISE EXCEPTION 'pilot_cap_reached' USING ERRCODE = 'P0001';
      END IF;
    END IF;
  ELSE
    v_slot_number := NULL;
  END IF;

  IF v_slot_id IS NULL THEN
    INSERT INTO public.pilot_slots (
      company_id,
      firm_id,
      tier_key,
      pilot_slot_number,
      pilot_status,
      pricing_structure,
      pricing_cadence,
      stripe_subscription_id,
      stripe_customer_id
    ) VALUES (
      p_company_id,
      NULL,
      'review_assist_pro',
      v_slot_number,
      'active',
      coalesce(p_pricing_structure, 'flat'),
      coalesce(p_pricing_cadence, 'monthly'),
      p_stripe_subscription_id,
      p_stripe_customer_id
    )
    RETURNING id INTO v_slot_id;
  ELSE
    UPDATE public.pilot_slots
    SET pilot_status = 'active',
        pilot_slot_number = CASE
          WHEN p_track = 'pilot' THEN coalesce(pilot_slot_number, v_slot_number)
          ELSE NULL
        END,
        pricing_structure = coalesce(p_pricing_structure, pricing_structure, 'flat'),
        pricing_cadence = coalesce(p_pricing_cadence, pricing_cadence, 'monthly'),
        stripe_subscription_id = p_stripe_subscription_id,
        stripe_customer_id = coalesce(p_stripe_customer_id, stripe_customer_id),
        updated_at = now()
    WHERE id = v_slot_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'company_id', p_company_id,
    'firm_id', v_firm_id,
    'membership_id', v_membership_id,
    'pilot_slot_id', v_slot_id,
    'pilot_slot_number', v_slot_number,
    'created_firm', v_created_firm,
    'track', p_track
  );
END;
$$;

REVOKE ALL ON FUNCTION public.activate_review_assist_pro_subscription(
  uuid, uuid, text, text, text, text, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.activate_review_assist_pro_subscription(
  uuid, uuid, text, text, text, text, text, text
) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_review_assist_pro_subscription(
  uuid, uuid, text, text, text, text, text, text
) TO service_role;

COMMENT ON FUNCTION public.activate_review_assist_pro_subscription(
  uuid, uuid, text, text, text, text, text, text
) IS
  'RA Pro 1A activation: company billing + linked firm + buyer membership + pilot slot 1-10. service_role only.';

-- ---------------------------------------------------------------------------
-- 5. Durable Stripe webhook event leasing (no DELETE-on-retry)
-- ---------------------------------------------------------------------------
-- Widen processing_status; add lease ownership columns.
ALTER TABLE public.stripe_webhook_events
  DROP CONSTRAINT IF EXISTS stripe_webhook_events_processing_status_check;

ALTER TABLE public.stripe_webhook_events
  ADD CONSTRAINT stripe_webhook_events_processing_status_check
  CHECK (processing_status IN (
    'received',
    'processing',
    'processed',
    'skipped',
    'retryable',
    'failed_conflict',
    'failed'
  ));

ALTER TABLE public.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS lease_token uuid,
  ADD COLUMN IF NOT EXISTS lease_acquired_at timestamptz,
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failure_code text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN public.stripe_webhook_events.lease_token IS
  'Cryptographically random lease owner for in-flight processing. Finalizers must match this token.';
COMMENT ON COLUMN public.stripe_webhook_events.failure_code IS
  'Sanitized fixed failure/conflict code only. Never store payloads, PII, or secrets.';

CREATE OR REPLACE FUNCTION public.claim_stripe_webhook_event(
  p_stripe_event_id text,
  p_event_type text,
  p_livemode boolean,
  p_lease_ttl_seconds integer DEFAULT 120
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_token uuid := gen_random_uuid();
  v_ttl int := greatest(coalesce(p_lease_ttl_seconds, 120), 30);
  v_now timestamptz := now();
  v_expires timestamptz := v_now + make_interval(secs => v_ttl);
  v_row public.stripe_webhook_events%ROWTYPE;
BEGIN
  IF current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    RAISE EXCEPTION 'claim_stripe_webhook_forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_stripe_event_id IS NULL OR length(trim(p_stripe_event_id)) = 0 THEN
    RAISE EXCEPTION 'claim_stripe_webhook_missing_event' USING ERRCODE = '22023';
  END IF;

  -- First delivery
  BEGIN
    INSERT INTO public.stripe_webhook_events (
      stripe_event_id,
      event_type,
      processing_status,
      raw_payload,
      livemode,
      lease_token,
      lease_acquired_at,
      lease_expires_at,
      attempt_count,
      failure_code,
      updated_at
    ) VALUES (
      p_stripe_event_id,
      coalesce(p_event_type, 'unknown'),
      'processing',
      jsonb_build_object('stripe_event_id', p_stripe_event_id, 'event_type', coalesce(p_event_type, 'unknown')),
      coalesce(p_livemode, false),
      v_token,
      v_now,
      v_expires,
      1,
      NULL,
      v_now
    )
    RETURNING * INTO v_row;

    RETURN jsonb_build_object(
      'outcome', 'claimed',
      'lease_token', v_row.lease_token,
      'attempt_count', v_row.attempt_count,
      'processing_status', v_row.processing_status
    );
  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;

  -- Reclaim retryable OR expired processing lease only.
  UPDATE public.stripe_webhook_events e
  SET processing_status = 'processing',
      lease_token = v_token,
      lease_acquired_at = v_now,
      lease_expires_at = v_expires,
      attempt_count = e.attempt_count + 1,
      failure_code = NULL,
      processed_at = NULL,
      processing_error = NULL,
      updated_at = v_now
  WHERE e.stripe_event_id = p_stripe_event_id
    AND (
      e.processing_status = 'retryable'
      OR (
        e.processing_status = 'processing'
        AND e.lease_expires_at IS NOT NULL
        AND e.lease_expires_at < v_now
      )
    )
  RETURNING * INTO v_row;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'outcome', 'reclaimed',
      'lease_token', v_row.lease_token,
      'attempt_count', v_row.attempt_count,
      'processing_status', v_row.processing_status
    );
  END IF;

  SELECT * INTO v_row
  FROM public.stripe_webhook_events e
  WHERE e.stripe_event_id = p_stripe_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'claim_stripe_webhook_missing_row' USING ERRCODE = 'P0002';
  END IF;

  IF v_row.processing_status IN ('processed', 'skipped', 'failed_conflict', 'failed') THEN
    RETURN jsonb_build_object(
      'outcome', 'duplicate_terminal',
      'processing_status', v_row.processing_status,
      'failure_code', v_row.failure_code
    );
  END IF;

  -- Active unexpired lease held by another worker.
  RETURN jsonb_build_object(
    'outcome', 'lease_held',
    'processing_status', v_row.processing_status,
    'lease_expires_at', v_row.lease_expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_stripe_webhook_event(
  p_stripe_event_id text,
  p_lease_token uuid,
  p_status text,
  p_failure_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_n int;
  v_now timestamptz := now();
BEGIN
  IF current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    RAISE EXCEPTION 'finalize_stripe_webhook_forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_status IS NULL OR p_status NOT IN ('processed', 'skipped', 'retryable', 'failed_conflict') THEN
    RAISE EXCEPTION 'finalize_stripe_webhook_invalid_status' USING ERRCODE = '22023';
  END IF;

  IF p_lease_token IS NULL THEN
    RAISE EXCEPTION 'finalize_stripe_webhook_missing_lease' USING ERRCODE = '22023';
  END IF;

  UPDATE public.stripe_webhook_events e
  SET processing_status = p_status,
      processed_at = CASE
        WHEN p_status IN ('processed', 'skipped', 'failed_conflict') THEN v_now
        ELSE NULL
      END,
      failure_code = CASE
        WHEN p_status IN ('retryable', 'failed_conflict') THEN left(coalesce(p_failure_code, 'unknown'), 64)
        ELSE NULL
      END,
      processing_error = CASE
        WHEN p_status IN ('retryable', 'failed_conflict') THEN left(coalesce(p_failure_code, 'unknown'), 64)
        ELSE NULL
      END,
      lease_token = CASE WHEN p_status = 'retryable' THEN NULL ELSE e.lease_token END,
      lease_expires_at = CASE WHEN p_status = 'retryable' THEN NULL ELSE e.lease_expires_at END,
      updated_at = v_now
  WHERE e.stripe_event_id = p_stripe_event_id
    AND e.lease_token = p_lease_token
    AND e.processing_status = 'processing';

  GET DIAGNOSTICS v_n = ROW_COUNT;

  IF v_n <> 1 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'outcome', 'stale_lease',
      'rows_affected', v_n
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'outcome', 'finalized',
    'processing_status', p_status,
    'rows_affected', 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_stripe_webhook_event(text, text, boolean, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_stripe_webhook_event(text, text, boolean, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_stripe_webhook_event(text, text, boolean, integer) TO service_role;

REVOKE ALL ON FUNCTION public.finalize_stripe_webhook_event(text, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_stripe_webhook_event(text, uuid, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_stripe_webhook_event(text, uuid, text, text) TO service_role;

COMMENT ON FUNCTION public.claim_stripe_webhook_event(text, text, boolean, integer) IS
  'Atomically claim or reclaim a Stripe webhook event lease. Never reclaims terminal or unexpired processing leases.';
COMMENT ON FUNCTION public.finalize_stripe_webhook_event(text, uuid, text, text) IS
  'Finalize a webhook event only when stripe_event_id + lease_token match an active processing lease.';

-- Final no-backfill seal (still inside the migration transaction).
DO $$
DECLARE
  v_linked int;
BEGIN
  SELECT count(*)::int INTO v_linked
  FROM public.firms
  WHERE billing_company_id IS NOT NULL;
  IF v_linked <> 0 THEN
    RAISE EXCEPTION
      'ra_pro_no_backfill_postcondition_failed linked=%', v_linked;
  END IF;
END $$;

COMMIT;
