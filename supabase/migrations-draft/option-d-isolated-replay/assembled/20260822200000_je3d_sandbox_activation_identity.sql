-- JE-3D — Durable sandbox activation identity (schema only).
-- DO NOT APPLY without direct review. No backfill in this migration.
--
-- Activation allowlist requires BOTH:
--   accounting_connections.provider_environment = 'sandbox'
--   companies.je_activation_demo_role = 'DEMO_A_GENERAL_ACCOUNTING'
--
-- Proposed backfill (review separately; never infer from company name):
--   UPDATE accounting_connections SET provider_environment = 'sandbox'
--     WHERE id = '<independently-verified-sandbox-grant-id>';
--   UPDATE companies SET je_activation_demo_role = 'DEMO_A_GENERAL_ACCOUNTING'
--     WHERE id = '<canonical-demo-a-company-id>';

DO $$
BEGIN
  IF to_regclass('public.accounting_connections') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'accounting_connections'
        AND column_name = 'provider_environment'
    ) THEN
      ALTER TABLE public.accounting_connections
        ADD COLUMN provider_environment text;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'accounting_connections_provider_environment_check'
      AND conrelid = 'public.accounting_connections'::regclass
  ) THEN
    ALTER TABLE public.accounting_connections
      ADD CONSTRAINT accounting_connections_provider_environment_check
      CHECK (
        provider_environment IS NULL
        OR provider_environment IN ('sandbox', 'production')
      );
  END IF;
END $$;

COMMENT ON COLUMN public.accounting_connections.provider_environment IS
  'Durable Intuit OAuth grant environment (sandbox|production). Written at canonical OAuth persist from deployment QB_ENVIRONMENT. JE-3D activation requires provider_environment = sandbox.';

DO $$
BEGIN
  IF to_regclass('public.companies') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'companies'
        AND column_name = 'je_activation_demo_role'
    ) THEN
      ALTER TABLE public.companies
        ADD COLUMN je_activation_demo_role text;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'companies_je_activation_demo_role_check'
      AND conrelid = 'public.companies'::regclass
  ) THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT companies_je_activation_demo_role_check
      CHECK (
        je_activation_demo_role IS NULL
        OR je_activation_demo_role IN (
          'DEMO_A_GENERAL_ACCOUNTING',
          'DEMO_B_SPECIALTY'
        )
      );
  END IF;
END $$;

COMMENT ON COLUMN public.companies.je_activation_demo_role IS
  'Controlled JE-3D activation demo identity. Allowlist requires DEMO_A_GENERAL_ACCOUNTING. Never derived from company name.';
