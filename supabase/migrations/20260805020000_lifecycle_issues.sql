-- Phase MEM_LIFECYCLE Block 6 — lifecycle_issues (Sentry-shape structured issues)
-- + widen pilot_lifecycle_events event_kind for transition.rejected
-- + sp_write_pilot_slot_and_event event_only op (rejection audit without slot mutate)
--
-- Isolation: RLS by (company_id, firm_id) partition membership.
-- Authoritative issues live in Postgres; Sentry SaaS forwarding is best-effort.

BEGIN;

-- 1) Widen event_kind CHECK — preserve Block 1–3.5 kinds, add rejected.
ALTER TABLE public.pilot_lifecycle_events
  DROP CONSTRAINT IF EXISTS pilot_lifecycle_events_event_kind_chk;

ALTER TABLE public.pilot_lifecycle_events
  ADD CONSTRAINT pilot_lifecycle_events_event_kind_chk
  CHECK (event_kind IN (
    'pilot.lifecycle.transition',
    'pilot.lifecycle.drift-detected',
    'pilot.lifecycle.auto-reconciled',
    'pilot.lifecycle.escalated',
    'pilot.lifecycle.recurred',
    'pilot.lifecycle.created',
    'pilot.lifecycle.assertion.evidence-attached',
    'pilot.lifecycle.transition.rejected'
  ));

-- Rejected transitions use to_status='__rejected__' (non-null sentinel).
-- Evidence-attached may still use NULL to_status.
ALTER TABLE public.pilot_lifecycle_events
  DROP CONSTRAINT IF EXISTS pilot_lifecycle_events_to_status_null_scope_chk;
ALTER TABLE public.pilot_lifecycle_events
  DROP CONSTRAINT IF EXISTS pilot_lifecycle_events_to_status_scope_chk;

ALTER TABLE public.pilot_lifecycle_events
  ADD CONSTRAINT pilot_lifecycle_events_to_status_scope_chk
  CHECK (
    (to_status IS NOT NULL)
    OR (event_kind = 'pilot.lifecycle.assertion.evidence-attached')
  );

COMMENT ON CONSTRAINT pilot_lifecycle_events_event_kind_chk
  ON public.pilot_lifecycle_events IS
  'Block 6: adds pilot.lifecycle.transition.rejected. Rejected rows use to_status=__rejected__ with attempted target in payload.attempted_to_status.';

-- 2) lifecycle_issues
CREATE TABLE IF NOT EXISTS public.lifecycle_issues (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  detected_at timestamptz NOT NULL DEFAULT NOW(),
  fingerprint text NOT NULL,
  level text NOT NULL,
  issue_kind text NOT NULL,
  pilot_slot_id uuid NULL,
  company_id uuid NULL,
  firm_id uuid NULL,
  tags jsonb NOT NULL DEFAULT '{}'::jsonb,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_at timestamptz NULL,
  resolved_by uuid NULL,
  resolution_note text NULL,
  sentry_event_id text NULL,
  CONSTRAINT lifecycle_issues_level_chk
    CHECK (level IN ('info','warning','error','fatal')),
  CONSTRAINT lifecycle_issues_issue_kind_chk
    CHECK (issue_kind IN (
      'pilot.lifecycle.drift.detected',
      'pilot.lifecycle.transition.rejected',
      'pilot.lifecycle.chain.integrity.broken',
      'pilot.lifecycle.monitor.error'
    )),
  CONSTRAINT lifecycle_issues_partition_chk
    CHECK (company_id IS NOT NULL OR firm_id IS NOT NULL)
);

-- IMMUTABLE expression: timezone() then date_trunc (timestamptz date_trunc alone is STABLE).
CREATE UNIQUE INDEX IF NOT EXISTS lifecycle_issues_fingerprint_hour_uidx
  ON public.lifecycle_issues (
    fingerprint,
    (date_trunc('hour', timezone('UTC', detected_at)))
  );

CREATE INDEX IF NOT EXISTS lifecycle_issues_detected_at_idx
  ON public.lifecycle_issues (detected_at DESC);

CREATE INDEX IF NOT EXISTS lifecycle_issues_company_detected_idx
  ON public.lifecycle_issues (company_id, detected_at DESC)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS lifecycle_issues_firm_detected_idx
  ON public.lifecycle_issues (firm_id, detected_at DESC)
  WHERE firm_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS lifecycle_issues_unresolved_idx
  ON public.lifecycle_issues (level, detected_at DESC)
  WHERE resolved_at IS NULL;

ALTER TABLE public.lifecycle_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lifecycle_issues_partition_read ON public.lifecycle_issues;
CREATE POLICY lifecycle_issues_partition_read ON public.lifecycle_issues
  FOR SELECT
  TO authenticated
  USING (
    (company_id IS NOT NULL AND company_id IN (
      SELECT company_id FROM public.company_users
      WHERE user_id = auth.uid() AND status = 'active'
    ))
    OR
    (firm_id IS NOT NULL AND firm_id IN (
      SELECT firm_id FROM public.firm_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    ))
  );

REVOKE ALL ON public.lifecycle_issues FROM anon;
GRANT SELECT ON public.lifecycle_issues TO authenticated;
GRANT ALL ON public.lifecycle_issues TO service_role;

COMMENT ON TABLE public.lifecycle_issues IS
  'Block 6: Sentry-shape structured issues for pilot lifecycle drift, rejected transitions, chain-integrity breaks. Authoritative in Postgres; Sentry SaaS forwarding is best-effort via SENTRY_DSN env.';
COMMENT ON COLUMN public.lifecycle_issues.fingerprint IS
  'Deduplication key. Same fingerprint within same UTC hour bucket = single row (unique index enforces).';
COMMENT ON COLUMN public.lifecycle_issues.sentry_event_id IS
  'If forwarded to Sentry SaaS, the event_id returned by Sentry.captureMessage. NULL if not forwarded.';

-- 3) Extend RPC with event_only (rejection audit; no pilot_slots mutation).
CREATE OR REPLACE FUNCTION public.sp_write_pilot_slot_and_event(
  p_slot_op text, -- 'upsert' | 'update_status' | 'event_only'
  p_slot_payload jsonb,
  p_event jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_slot_id uuid;
  v_event_row public.pilot_lifecycle_events%ROWTYPE;
  v_result jsonb;
BEGIN
  IF p_slot_op = 'upsert' THEN
    IF p_slot_payload->>'_on_conflict' = 'tier_key,firm_id' THEN
      INSERT INTO public.pilot_slots (
        tier_key, firm_id, company_id, pilot_slot_number, pilot_status,
        pricing_structure, pricing_cadence, stripe_subscription_id,
        stripe_customer_id
      )
      VALUES (
        p_slot_payload->>'tier_key',
        (p_slot_payload->>'firm_id')::uuid,
        NULL,
        NULLIF(p_slot_payload->>'pilot_slot_number', '')::int,
        p_slot_payload->>'pilot_status',
        p_slot_payload->>'pricing_structure',
        p_slot_payload->>'pricing_cadence',
        NULLIF(p_slot_payload->>'stripe_subscription_id', ''),
        NULLIF(p_slot_payload->>'stripe_customer_id', '')
      )
      ON CONFLICT (tier_key, firm_id) DO UPDATE
        SET pilot_status = EXCLUDED.pilot_status,
            pricing_structure = EXCLUDED.pricing_structure,
            pricing_cadence = EXCLUDED.pricing_cadence,
            stripe_subscription_id = EXCLUDED.stripe_subscription_id,
            stripe_customer_id = EXCLUDED.stripe_customer_id,
            pilot_slot_number = COALESCE(EXCLUDED.pilot_slot_number, public.pilot_slots.pilot_slot_number)
      RETURNING id INTO v_slot_id;
    ELSIF p_slot_payload->>'_on_conflict' = 'tier_key,company_id' THEN
      INSERT INTO public.pilot_slots (
        tier_key, firm_id, company_id, pilot_slot_number, pilot_status,
        pricing_structure, pricing_cadence, stripe_subscription_id,
        stripe_customer_id
      )
      VALUES (
        p_slot_payload->>'tier_key',
        NULL,
        (p_slot_payload->>'company_id')::uuid,
        NULLIF(p_slot_payload->>'pilot_slot_number', '')::int,
        p_slot_payload->>'pilot_status',
        p_slot_payload->>'pricing_structure',
        p_slot_payload->>'pricing_cadence',
        NULLIF(p_slot_payload->>'stripe_subscription_id', ''),
        NULLIF(p_slot_payload->>'stripe_customer_id', '')
      )
      ON CONFLICT (tier_key, company_id) DO UPDATE
        SET pilot_status = EXCLUDED.pilot_status,
            pricing_structure = EXCLUDED.pricing_structure,
            pricing_cadence = EXCLUDED.pricing_cadence,
            stripe_subscription_id = EXCLUDED.stripe_subscription_id,
            stripe_customer_id = EXCLUDED.stripe_customer_id,
            pilot_slot_number = COALESCE(EXCLUDED.pilot_slot_number, public.pilot_slots.pilot_slot_number)
      RETURNING id INTO v_slot_id;
    ELSE
      RAISE EXCEPTION 'sp_write_pilot_slot_and_event: unknown _on_conflict %', p_slot_payload->>'_on_conflict';
    END IF;
  ELSIF p_slot_op = 'update_status' THEN
    UPDATE public.pilot_slots
      SET pilot_status = p_slot_payload->>'pilot_status'
      WHERE id = (p_slot_payload->>'id')::uuid
      RETURNING id INTO v_slot_id;
    IF v_slot_id IS NULL THEN
      RAISE EXCEPTION 'sp_write_pilot_slot_and_event: pilot_slot % not found', p_slot_payload->>'id';
    END IF;
  ELSIF p_slot_op = 'event_only' THEN
    -- Block 6: audit-only event (e.g. transition.rejected). Does not mutate pilot_slots.
    v_slot_id := (p_slot_payload->>'id')::uuid;
    IF v_slot_id IS NULL THEN
      RAISE EXCEPTION 'sp_write_pilot_slot_and_event: event_only requires slot id';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.pilot_slots WHERE id = v_slot_id) THEN
      RAISE EXCEPTION 'sp_write_pilot_slot_and_event: pilot_slot % not found', v_slot_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'sp_write_pilot_slot_and_event: unknown p_slot_op %', p_slot_op;
  END IF;

  p_event := p_event || jsonb_build_object('pilot_slot_id', v_slot_id);

  INSERT INTO public.pilot_lifecycle_events (
    event_kind, event_at, schema_version,
    pilot_slot_id, company_id, firm_id,
    from_status, to_status,
    classification_hint,
    actor_kind, actor_user_id, actor_via,
    assertions_covered, evidence_refs,
    reason_code, reason_text, payload
  )
  VALUES (
    p_event->>'event_kind',
    COALESCE((p_event->>'event_at')::timestamptz, NOW()),
    COALESCE(p_event->>'schema_version', '42.7E.1'),
    v_slot_id,
    NULLIF(p_event->>'company_id', '')::uuid,
    NULLIF(p_event->>'firm_id', '')::uuid,
    NULLIF(p_event->>'from_status', ''),
    CASE
      WHEN p_event->'to_status' IS NULL OR jsonb_typeof(p_event->'to_status') = 'null'
        THEN NULL
      ELSE NULLIF(p_event->>'to_status', '')
    END,
    NULLIF(p_event->>'classification_hint', ''),
    p_event->>'actor_kind',
    NULLIF(p_event->>'actor_user_id', '')::uuid,
    p_event->>'actor_via',
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_event->'assertions_covered', '[]'::jsonb))),
      ARRAY[]::text[]
    ),
    COALESCE(p_event->'evidence_refs', '[]'::jsonb),
    p_event->>'reason_code',
    NULLIF(p_event->>'reason_text', ''),
    COALESCE(p_event->'payload', '{}'::jsonb)
  )
  RETURNING * INTO v_event_row;

  v_result := jsonb_build_object(
    'pilot_slot_id', v_slot_id,
    'event_id', v_event_row.id,
    'chain_seq', v_event_row.chain_seq,
    'row_hash', v_event_row.row_hash,
    'prev_hash', v_event_row.prev_hash
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.sp_write_pilot_slot_and_event(text, jsonb, jsonb) IS
  'Block 4+6: atomic slot+event write, or event_only audit insert (rejection). Service-role only.';

COMMIT;
