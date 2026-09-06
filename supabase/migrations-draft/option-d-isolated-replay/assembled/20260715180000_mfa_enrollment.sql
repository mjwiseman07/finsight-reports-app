-- Phase TCP1 W2.5 Block 10 — MFA enrollment tables (additive-only)

-- MFA recovery codes: 10 one-time codes per user, hashed with SHA-256
CREATE TABLE IF NOT EXISTS public.mfa_recovery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mfa_recovery_codes_user
  ON public.mfa_recovery_codes(user_id) WHERE used_at IS NULL;

ALTER TABLE public.mfa_recovery_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_recovery_codes"
  ON public.mfa_recovery_codes FOR SELECT
  USING (user_id = auth.uid());

-- Users cannot INSERT/UPDATE/DELETE directly — server actions with service role only

-- MFA audit log
CREATE TABLE IF NOT EXISTS public.mfa_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'enroll_started','enroll_completed','enroll_failed','verify_success',
    'verify_failed','disable','recovery_code_used','recovery_codes_regenerated',
    'admin_enforcement_prompted'
  )),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mfa_audit_log_user
  ON public.mfa_audit_log(user_id, created_at DESC);

ALTER TABLE public.mfa_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_mfa_audit"
  ON public.mfa_audit_log FOR SELECT
  USING (user_id = auth.uid());

-- Immutability: audit log is append-only, never updated or deleted
CREATE OR REPLACE FUNCTION public.mfa_audit_log_prevent_mutation()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
    RAISE EXCEPTION 'mfa_audit_log is append-only';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mfa_audit_log_immutable ON public.mfa_audit_log;
CREATE TRIGGER mfa_audit_log_immutable
  BEFORE UPDATE OR DELETE ON public.mfa_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.mfa_audit_log_prevent_mutation();
