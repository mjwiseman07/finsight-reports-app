-- Disposable, data-less fixture for Stage-1 credential containment rehearsal.
-- Creates minimal roles/schema only. Fake credentials only. No production data.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

CREATE TABLE IF NOT EXISTS public.accounting_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL,
  provider_family text,
  provider_product text,
  external_entity_id text,
  external_entity_name text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  tenant_or_realm_id text,
  scopes text[],
  status text NOT NULL,
  metadata_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  home_currency text,
  qbo_edition text,
  qbo_subscription_status text,
  superseded_by_connection_id uuid,
  credentials_cleared_at timestamptz,
  provider_environment text
);

CREATE TABLE IF NOT EXISTS public.quickbooks_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  realm_id text NOT NULL,
  access_token text,
  refresh_token text,
  token_expiry timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accounting_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quickbooks_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_all_accounting_connections ON public.accounting_connections;
CREATE POLICY service_role_all_accounting_connections
  ON public.accounting_connections FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "users can read their accounting connection metadata" ON public.accounting_connections;
CREATE POLICY "users can read their accounting connection metadata"
  ON public.accounting_connections FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users can update their accounting connections" ON public.accounting_connections;
CREATE POLICY "users can update their accounting connections"
  ON public.accounting_connections FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can access own QB connection" ON public.quickbooks_connections;
CREATE POLICY "Users can access own QB connection"
  ON public.quickbooks_connections FOR ALL
  USING (auth.uid() = user_id);

DROP VIEW IF EXISTS public.qbo_connections_unified;
CREATE VIEW public.qbo_connections_unified
WITH (security_invoker = true)
AS
SELECT
  'accounting_connections'::text AS source_table,
  id AS connection_id,
  user_id,
  access_token,
  refresh_token,
  tenant_or_realm_id AS realm_id,
  token_expires_at AS token_expiry,
  scopes AS granted_scopes,
  status,
  created_at,
  updated_at
FROM public.accounting_connections ac
WHERE provider = 'quickbooks'::text AND status = 'connected'::text;

GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON TABLE public.quickbooks_connections TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON TABLE public.accounting_connections TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON TABLE public.qbo_connections_unified TO anon, authenticated, service_role;

-- Fake rows only (never production)
INSERT INTO public.accounting_connections (
  id, user_id, provider, access_token, refresh_token, token_expires_at,
  tenant_or_realm_id, scopes, status
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'quickbooks',
  'FAKE_ACCESS_TOKEN_LOCAL_ONLY',
  'FAKE_REFRESH_TOKEN_LOCAL_ONLY',
  now() + interval '1 hour',
  'fake-realm-local',
  ARRAY['com.intuit.quickbooks.accounting'],
  'connected'
);

INSERT INTO public.quickbooks_connections (
  id, user_id, realm_id, access_token, refresh_token, token_expiry
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  'fake-realm-local',
  'FAKE_ACCESS_TOKEN_LOCAL_ONLY',
  'FAKE_REFRESH_TOKEN_LOCAL_ONLY',
  now() + interval '1 hour'
);
