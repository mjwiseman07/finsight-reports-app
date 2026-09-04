-- Q8e: Lock down 5 service-role-only tables.
-- All runtime access is via getSupabaseAdmin/createServiceClient which bypasses RLS.
-- 1. Revoke raw grants from anon+authenticated so no client-facing surface exists.
-- 2. Add explicit service_role_all_* policy for defense-in-depth and to satisfy
--    the rls_enabled_no_policy linter.

-- je_line_attachments
REVOKE ALL ON public.je_line_attachments FROM anon, authenticated;
DROP POLICY IF EXISTS "je_line_attachments_service_role_all" ON public.je_line_attachments;
CREATE POLICY "je_line_attachments_service_role_all"
  ON public.je_line_attachments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- je_line_evidence
REVOKE ALL ON public.je_line_evidence FROM anon, authenticated;
DROP POLICY IF EXISTS "je_line_evidence_service_role_all" ON public.je_line_evidence;
CREATE POLICY "je_line_evidence_service_role_all"
  ON public.je_line_evidence
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- je_post_attempts
REVOKE ALL ON public.je_post_attempts FROM anon, authenticated;
DROP POLICY IF EXISTS "je_post_attempts_service_role_all" ON public.je_post_attempts;
CREATE POLICY "je_post_attempts_service_role_all"
  ON public.je_post_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- je_posting_audit
REVOKE ALL ON public.je_posting_audit FROM anon, authenticated;
DROP POLICY IF EXISTS "je_posting_audit_service_role_all" ON public.je_posting_audit;
CREATE POLICY "je_posting_audit_service_role_all"
  ON public.je_posting_audit
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- stripe_webhook_events_legacy
REVOKE ALL ON public.stripe_webhook_events_legacy FROM anon, authenticated;
DROP POLICY IF EXISTS "stripe_webhook_events_legacy_service_role_all" ON public.stripe_webhook_events_legacy;
CREATE POLICY "stripe_webhook_events_legacy_service_role_all"
  ON public.stripe_webhook_events_legacy
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Post-migration assertion: every table has exactly one service_role_all policy.
DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(t, ', ') INTO missing
  FROM (
    SELECT unnest(ARRAY[
      'je_line_attachments',
      'je_line_evidence',
      'je_post_attempts',
      'je_posting_audit',
      'stripe_webhook_events_legacy'
    ]) AS t
  ) tables
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = tables.t
      AND policyname = tables.t || '_service_role_all'
  );
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'q8e: missing service_role_all policy on: %', missing;
  END IF;
END $$;

-- Post-migration assertion: no anon/authenticated grants linger on the 5 tables.
DO $$
DECLARE
  leaked text;
BEGIN
  SELECT string_agg(table_name || '/' || grantee || '/' || privilege_type, ', ') INTO leaked
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public'
    AND table_name IN (
      'je_line_attachments', 'je_line_evidence',
      'je_post_attempts', 'je_posting_audit',
      'stripe_webhook_events_legacy'
    )
    AND grantee IN ('anon', 'authenticated');
  IF leaked IS NOT NULL THEN
    RAISE EXCEPTION 'q8e: anon/authenticated still have grants on: %', leaked;
  END IF;
END $$;
