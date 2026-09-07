-- =============================================================================
-- EXECUTABLE SQUASH CANDIDATE — DRAFT / NON-DEPLOYABLE
-- Proposed version: 20260907010060
-- Proposed name: esc_forward_tail_main_unapplied
-- Module: post_baseline_forward_migrations
-- Provenance: Merged main migrations not in production baseline; sole home of publish_ledger_event extensions.digest qualify
-- NOT in active supabase/migrations/. Production mutation NOT authorized.
-- UTF-8 LF. statements[] must remain non-empty when eventually recorded.
-- =============================================================================

-- >>> forward 20260906184500_publish_ledger_event_extensions_digest_qualify.sql
-- Forward remediation: qualify pgcrypto digest for Patent #6 publish_ledger_event.
--
-- Root cause (Option D / local Supabase CLI 2.116.0; also latent wherever pgcrypto
-- lives in schema `extensions`):
--   1) 20260717050000 defined SECURITY DEFINER publish_ledger_event with
--      unqualified digest(v_hash_input::bytea, 'sha256')  -- 2nd arg type unknown
--   2) 20260718190000 Q8b locked search_path = public, pg_temp (excludes extensions)
--   3) Platform pgcrypto is installed in schema extensions → digest not visible
--      → ERROR: function digest(bytea, unknown) does not exist
--
-- This migration does NOT rewrite 20260717050000 lineage. It CREATE OR REPLACE
-- the live function with:
--   - extensions.digest(..., 'sha256'::text) explicit schema + typed algorithm
--   - identical hash input expression (v_hash_input::bytea) for chain continuity
--   - search_path remains public, pg_temp (Q8b lockdown preserved; not weakened)
--
-- Fail-closed: if extensions.digest is absent, publish still errors (no public
-- wrapper / duplicate digest).

CREATE OR REPLACE FUNCTION public.publish_ledger_event(
  p_event_type              TEXT,
  p_event_category          TEXT,
  p_event_version           INTEGER,
  p_firm_id                 UUID,
  p_firm_client_id          UUID,
  p_engagement_id           UUID,
  p_portco_id               UUID,
  p_close_period_id         TEXT,
  p_aggregate_type          TEXT,
  p_aggregate_id            TEXT,
  p_actor_type              TEXT,
  p_actor_id                TEXT,
  p_event_payload           JSONB,
  p_event_metadata          JSONB,
  p_causation_event_id      UUID,
  p_event_payload_canonical TEXT
)
RETURNS TABLE(event_id UUID, event_hash TEXT, chain_index BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_head             public.ledger_chain_head%ROWTYPE;
  v_new_chain_index  BIGINT;
  v_new_event_id     UUID := gen_random_uuid();
  v_prev_hash        TEXT;
  v_hash_input       TEXT;
  v_new_hash         TEXT;
BEGIN
  SELECT * INTO v_head FROM public.ledger_chain_head WHERE id = 1 FOR UPDATE;
  v_new_chain_index := v_head.current_chain_index + 1;
  v_prev_hash := v_head.current_event_hash;

  v_hash_input := COALESCE(v_prev_hash, '') || v_new_event_id::TEXT || p_event_type || p_event_payload_canonical;
  -- Preserve bytea cast used by 20260717050000 (hash continuity). Qualify pgcrypto.
  v_new_hash := encode(
    extensions.digest(v_hash_input::bytea, 'sha256'::text),
    'hex'
  );

  INSERT INTO public.ledger_events (
    event_id, event_type, event_category, event_version,
    firm_id, firm_client_id, engagement_id, portco_id, close_period_id,
    aggregate_type, aggregate_id,
    actor_type, actor_id,
    event_payload, event_metadata, causation_event_id,
    event_hash, previous_event_hash, chain_index
  ) VALUES (
    v_new_event_id, p_event_type, p_event_category, p_event_version,
    p_firm_id, p_firm_client_id, p_engagement_id, p_portco_id, p_close_period_id,
    p_aggregate_type, p_aggregate_id,
    p_actor_type, p_actor_id,
    p_event_payload, p_event_metadata, p_causation_event_id,
    v_new_hash, v_prev_hash, v_new_chain_index
  );

  UPDATE public.ledger_chain_head
     SET current_chain_index = v_new_chain_index,
         current_event_hash  = v_new_hash,
         updated_at          = NOW()
   WHERE id = 1;

  event_id := v_new_event_id;
  event_hash := v_new_hash;
  chain_index := v_new_chain_index;
  RETURN NEXT;
END;
$fn$;

-- Re-assert Q8b lockdown (CREATE OR REPLACE preserves proconfig, but pin explicitly).
ALTER FUNCTION public.publish_ledger_event(
  text, text, integer, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb, jsonb, uuid, text
) SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.publish_ledger_event(
  text, text, integer, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb, jsonb, uuid, text
) IS
  'Patent #6 Merkle ledger publisher. Hash uses extensions.digest(bytea, text) under locked search_path=public, pg_temp.';
-- <<< end 20260906184500_publish_ledger_event_extensions_digest_qualify.sql
