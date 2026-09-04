-- =============================================================================
-- DERIVED BASELINE (NOT recovered original SQL)
-- Subject: public.users
-- Mechanism: schema-and-security-only catalog reconstruction for Option D
--            clean replay. Original CREATE is absent from git and from
--            production schema_migrations.statements[].
-- Project:  jzmdgwwiestcmmeuhhkr (read-only catalog capture)
-- contains_data_rows: false
-- Do NOT deploy via supabase/migrations/. Option D draft path only.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL,
  email text NOT NULL,
  first_name text,
  business_name text,
  ip_address_signup text,
  trial_used boolean DEFAULT false,
  reports_generated integer DEFAULT 0,
  subscription_status text DEFAULT 'trial'::text,
  stripe_customer_id text,
  created_at timestamp with time zone DEFAULT now(),
  last_name text,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_email_key UNIQUE (email),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own record" ON public.users;
CREATE POLICY "Users can read own record"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own record" ON public.users;
CREATE POLICY "Users can update own record"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

GRANT ALL ON TABLE public.users TO anon;
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;

ALTER TABLE public.users OWNER TO postgres;
