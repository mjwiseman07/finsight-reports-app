-- Free Review opaque lead sessions (revocable, hashed tokens).
-- Do NOT apply to production from this PR; commit-only.
-- Cookie carries only the opaque token; server stores SHA-256(token) hex.
--
-- Active lead statuses (explicit allowlist; unknown/empty fail closed):
--   lead_captured | onboarding_started | quickbooks_connected | xero_connected
-- Retention: expired/revoked hashed rows kept 30 days after becoming non-authorizing,
-- then removable via cleanup_free_review_lead_sessions (no production cron in this PR).
-- Invariant: at most one unrevoked session per lead (partial unique index).
-- Active sessions cannot be DELETE'd (BEFORE DELETE trigger); cleanup deletes only
-- non-authorizing rows. service_role DELETE retained solely for INVOKER cleanup.

BEGIN;

CREATE TABLE IF NOT EXISTS public.free_review_lead_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.free_review_leads(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_used_at timestamptz,
  replaced_by_session_id uuid REFERENCES public.free_review_lead_sessions(id),
  CONSTRAINT free_review_lead_sessions_token_hash_nonempty CHECK (char_length(token_hash) = 64),
  CONSTRAINT free_review_lead_sessions_token_hash_hex CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT free_review_lead_sessions_expires_after_created CHECK (expires_at > created_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS free_review_lead_sessions_token_hash_uidx
  ON public.free_review_lead_sessions (token_hash);

-- At most one unrevoked session per lead (includes expired-but-unrevoked).
CREATE UNIQUE INDEX IF NOT EXISTS free_review_lead_sessions_one_unrevoked_per_lead_uidx
  ON public.free_review_lead_sessions (lead_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS free_review_lead_sessions_lead_active_idx
  ON public.free_review_lead_sessions (lead_id, expires_at desc)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS free_review_lead_sessions_cleanup_idx
  ON public.free_review_lead_sessions (expires_at, revoked_at);

ALTER TABLE public.free_review_lead_sessions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.free_review_lead_sessions FROM PUBLIC;
REVOKE ALL ON TABLE public.free_review_lead_sessions FROM anon;
REVOKE ALL ON TABLE public.free_review_lead_sessions FROM authenticated;

-- service_role: lifecycle DML + cleanup DELETE (minimum required for INVOKER cleanup).
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.free_review_lead_sessions TO service_role;

-- ---------------------------------------------------------------------------
-- Reject DELETE of authorizing sessions (unrevoked AND unexpired).
-- Mixed multi-row DELETE aborts when any active row is included.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_active_free_review_lead_session_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF OLD.revoked_at IS NULL AND OLD.expires_at > clock_timestamp() THEN
    RAISE EXCEPTION 'cannot_delete_active_lead_session' USING ERRCODE = 'P0001';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_active_free_review_lead_session_delete
  ON public.free_review_lead_sessions;

CREATE TRIGGER trg_prevent_active_free_review_lead_session_delete
  BEFORE DELETE ON public.free_review_lead_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_active_free_review_lead_session_delete();

REVOKE ALL ON FUNCTION public.prevent_active_free_review_lead_session_delete() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_active_free_review_lead_session_delete() FROM anon;
REVOKE ALL ON FUNCTION public.prevent_active_free_review_lead_session_delete() FROM authenticated;
-- Trigger fires as the deleting role; service_role needs EXECUTE to run DELETE.
GRANT EXECUTE ON FUNCTION public.prevent_active_free_review_lead_session_delete() TO service_role;

-- ---------------------------------------------------------------------------
-- Atomic rotate: lock lead row, verify allowlist status, revoke all unrevoked
-- (including expired-but-unrevoked), insert exactly one new hashed session.
-- Plaintext token never enters SQL.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rotate_free_review_lead_session(
  p_lead_id uuid,
  p_token_hash text,
  p_expires_at timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_status text;
  v_new_id uuid;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF p_lead_id IS NULL THEN
    RAISE EXCEPTION 'lead_id_required' USING ERRCODE = '22023';
  END IF;

  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'invalid_token_hash' USING ERRCODE = '22023';
  END IF;

  IF p_expires_at IS NULL OR p_expires_at <= v_now THEN
    RAISE EXCEPTION 'invalid_expires_at' USING ERRCODE = '22023';
  END IF;

  SELECT lower(trim(status))
    INTO v_status
  FROM public.free_review_leads
  WHERE id = p_lead_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'lead_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_status IS NULL OR v_status NOT IN (
    'lead_captured',
    'onboarding_started',
    'quickbooks_connected',
    'xero_connected'
  ) THEN
    RAISE EXCEPTION 'lead_status_not_active' USING ERRCODE = 'P0001';
  END IF;

  -- Revoke every unrevoked session for this lead (expired-but-unrevoked included)
  -- before insert so the partial unique index is satisfied.
  UPDATE public.free_review_lead_sessions
  SET revoked_at = v_now
  WHERE lead_id = p_lead_id
    AND revoked_at IS NULL;

  INSERT INTO public.free_review_lead_sessions (
    lead_id,
    token_hash,
    expires_at
  ) VALUES (
    p_lead_id,
    p_token_hash,
    p_expires_at
  )
  RETURNING id INTO v_new_id;

  UPDATE public.free_review_lead_sessions
  SET replaced_by_session_id = v_new_id
  WHERE lead_id = p_lead_id
    AND id <> v_new_id
    AND revoked_at = v_now
    AND replaced_by_session_id IS NULL;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rotate_free_review_lead_session(uuid, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rotate_free_review_lead_session(uuid, text, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.rotate_free_review_lead_session(uuid, text, timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_free_review_lead_session(uuid, text, timestamptz) TO service_role;

-- ---------------------------------------------------------------------------
-- Bounded cleanup: delete only non-authorizing rows older than retention.
-- Active (unrevoked AND unexpired) rows are never deleted (SQL filter + trigger).
-- Default retention: 30 days after becoming non-authorizing.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_free_review_lead_sessions(
  p_retention_days integer DEFAULT 30
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_deleted integer := 0;
BEGIN
  IF p_retention_days IS NULL OR p_retention_days < 1 THEN
    RAISE EXCEPTION 'invalid_retention_days' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.free_review_lead_sessions AS s
  WHERE
    NOT (s.revoked_at IS NULL AND s.expires_at > clock_timestamp())
    AND COALESCE(s.revoked_at, s.expires_at)
        < (clock_timestamp() - make_interval(days => p_retention_days));

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_free_review_lead_sessions(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_free_review_lead_sessions(integer) FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_free_review_lead_sessions(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_free_review_lead_sessions(integer) TO service_role;

COMMIT;
