-- Disposable fixture for Free Review lead-session applicator rehearsal.
-- Minimal free_review_leads parent + supabase_migrations schema only.

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

CREATE TABLE IF NOT EXISTS public.free_review_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  business_name text NOT NULL,
  email text NOT NULL,
  phone text,
  source_page text,
  referral_information text,
  utm_tracking_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  legal_company_name text,
  industry text,
  revenue_range text,
  fiscal_year text,
  additional_business_information jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'lead_captured',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.free_review_leads ENABLE ROW LEVEL SECURITY;

CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version text PRIMARY KEY,
  name text,
  statements text[]
);
