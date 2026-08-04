-- Phase MEM-LIFECYCLE Block 4 — atomic pilot_slots + pilot_lifecycle_events write.
--
-- Wraps a pilot_slots UPSERT (or UPDATE for status transitions) together with a
-- pilot_lifecycle_events INSERT in a single Postgres transaction. If the event
-- INSERT fails (CHECK violation, chain_seq contention, RLS deny), the slot
-- mutation rolls back — no half-writes.
--
-- row_hash/prev_hash are text ('sha256:' || hex), not bytea — return them as-is.

CREATE OR REPLACE FUNCTION public.sp_write_pilot_slot_and_event(
  p_slot_op text, -- 'upsert' or 'update_status'
  p_slot_payload jsonb, -- full pilot_slots row for upsert, or {id, pilot_status} for update
  p_event jsonb -- full pilot_lifecycle_events insert row (event_kind, actor_via, etc.)
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
    -- NULL jsonb → SQL NULL (Block 3.5 evidence-attached); empty string also → NULL
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

REVOKE ALL ON FUNCTION public.sp_write_pilot_slot_and_event(text, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sp_write_pilot_slot_and_event(text, jsonb, jsonb) TO service_role;

COMMENT ON FUNCTION public.sp_write_pilot_slot_and_event(text, jsonb, jsonb) IS
  'Block 4: atomic pilot_slots write + pilot_lifecycle_events emit. Service-role only.';
