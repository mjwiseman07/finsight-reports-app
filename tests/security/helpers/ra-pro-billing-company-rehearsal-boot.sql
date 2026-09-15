CREATE EXTENSION IF NOT EXISTS "pgcrypto";
DO $$ BEGIN
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE service_role NOLOGIN BYPASSRLS;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
CREATE TABLE companies (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL);
CREATE TABLE company_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  status text NOT NULL DEFAULT 'active',
  UNIQUE(company_id, user_id)
);
CREATE TABLE firms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_user_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
CREATE TABLE firm_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES firms(id),
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'active',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(firm_id, user_id)
);
CREATE TABLE firm_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES firms(id),
  company_id uuid REFERENCES companies(id),
  name text,
  subscription_status text DEFAULT 'active'
);
CREATE TABLE pilot_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_number int,
  pilot_slot_number int,
  entity_type text,
  entity_id uuid,
  company_id uuid,
  firm_id uuid,
  tier_key text,
  stripe_subscription_id text,
  stripe_customer_id text,
  pilot_status text,
  pricing_structure text,
  pricing_cadence text,
  complimentary_client_cap int,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT pilot_slots_entity_xor_check CHECK (
    (company_id IS NOT NULL AND firm_id IS NULL) OR
    (company_id IS NULL AND firm_id IS NOT NULL) OR
    (company_id IS NULL AND firm_id IS NULL)
  )
);
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, anon, service_role;
