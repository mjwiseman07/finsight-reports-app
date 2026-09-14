-- Free Review opaque lead sessions (revocable, hashed tokens).
-- Do NOT apply to production from this PR; commit-only.
-- Cookie carries only the opaque token; server stores SHA-256(token) hex.

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
  CONSTRAINT free_review_lead_sessions_expires_after_created CHECK (expires_at > created_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS free_review_lead_sessions_token_hash_uidx
  ON public.free_review_lead_sessions (token_hash);

CREATE INDEX IF NOT EXISTS free_review_lead_sessions_lead_active_idx
  ON public.free_review_lead_sessions (lead_id, expires_at desc)
  WHERE revoked_at IS NULL;

ALTER TABLE public.free_review_lead_sessions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.free_review_lead_sessions FROM PUBLIC;
REVOKE ALL ON TABLE public.free_review_lead_sessions FROM anon;
REVOKE ALL ON TABLE public.free_review_lead_sessions FROM authenticated;

-- Service role / postgres retain access for API session lifecycle.
GRANT SELECT, INSERT, UPDATE ON TABLE public.free_review_lead_sessions TO service_role;

COMMIT;
