-- Gap 1b — WebAuthn credentials + trusted devices + audit event extension

-- ============================================================
-- 1. Extend mfa_audit_log event_type CHECK
-- ============================================================
ALTER TABLE public.mfa_audit_log
  DROP CONSTRAINT IF EXISTS mfa_audit_log_event_type_check;

ALTER TABLE public.mfa_audit_log
  ADD CONSTRAINT mfa_audit_log_event_type_check CHECK (event_type IN (
    'enroll_started','enroll_completed','enroll_failed','verify_success',
    'verify_failed','disable','recovery_code_used','recovery_codes_regenerated',
    'admin_enforcement_prompted',
    'trusted_device_added','trusted_device_revoked','trusted_device_expired',
    'webauthn_register_started','webauthn_register_completed','webauthn_register_failed',
    'webauthn_verify_success','webauthn_verify_failed','webauthn_credential_removed',
    'webauthn_credential_renamed'
  ));

-- ============================================================
-- 2. user_webauthn_credentials
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id BYTEA NOT NULL UNIQUE,
  public_key BYTEA NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  transports TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  friendly_name TEXT NOT NULL DEFAULT 'Security key',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_user_webauthn_credentials_user
  ON public.user_webauthn_credentials(user_id);

CREATE INDEX IF NOT EXISTS idx_user_webauthn_credentials_credential_id
  ON public.user_webauthn_credentials(credential_id);

ALTER TABLE public.user_webauthn_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_webauthn" ON public.user_webauthn_credentials;
CREATE POLICY "users_select_own_webauthn"
  ON public.user_webauthn_credentials FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_update_own_webauthn_friendly_name" ON public.user_webauthn_credentials;
CREATE POLICY "users_update_own_webauthn_friendly_name"
  ON public.user_webauthn_credentials FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Immutability trigger: block updates to credential_id, public_key, user_id
CREATE OR REPLACE FUNCTION public.user_webauthn_credentials_prevent_column_mutation()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.credential_id IS DISTINCT FROM OLD.credential_id THEN
    RAISE EXCEPTION 'credential_id is immutable';
  END IF;
  IF NEW.public_key IS DISTINCT FROM OLD.public_key THEN
    RAISE EXCEPTION 'public_key is immutable';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'user_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_webauthn_credentials_immutable_cols ON public.user_webauthn_credentials;
CREATE TRIGGER user_webauthn_credentials_immutable_cols
  BEFORE UPDATE ON public.user_webauthn_credentials
  FOR EACH ROW EXECUTE FUNCTION public.user_webauthn_credentials_prevent_column_mutation();

-- ============================================================
-- 3. mfa_webauthn_challenges (transient, 60s TTL)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mfa_webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('register','authenticate')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '60 seconds')
);

CREATE INDEX IF NOT EXISTS idx_mfa_webauthn_challenges_user_purpose
  ON public.mfa_webauthn_challenges(user_id, purpose, expires_at DESC);

ALTER TABLE public.mfa_webauthn_challenges ENABLE ROW LEVEL SECURITY;
-- Service-role only; no policies for authenticated users (challenges are server-managed)

-- ============================================================
-- 4. mfa_trusted_devices
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mfa_trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id_hash TEXT NOT NULL,
  user_agent TEXT NULL,
  ip_first_seen INET NULL,
  ip_last_seen INET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  revoked_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_mfa_trusted_devices_user_active
  ON public.mfa_trusted_devices(user_id, expires_at)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_mfa_trusted_devices_hash
  ON public.mfa_trusted_devices(device_id_hash)
  WHERE revoked_at IS NULL;

ALTER TABLE public.mfa_trusted_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_trusted_devices" ON public.mfa_trusted_devices;
CREATE POLICY "users_select_own_trusted_devices"
  ON public.mfa_trusted_devices FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_revoke_own_trusted_devices" ON public.mfa_trusted_devices;
CREATE POLICY "users_revoke_own_trusted_devices"
  ON public.mfa_trusted_devices FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND revoked_at IS NOT NULL);
