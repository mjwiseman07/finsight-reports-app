-- Gap 1b.1 micro-fix: replace auth.uid() with (SELECT auth.uid()) on 4 policies
-- plus add explicit deny policy on mfa_webauthn_challenges to silence rls_enabled_no_policy INFO lint.
-- Service role bypasses RLS entirely, so the deny policy has no functional effect on server-managed challenges.

-- ================================================
-- 1. user_webauthn_credentials policies
-- ================================================
DROP POLICY IF EXISTS "users_select_own_webauthn" ON public.user_webauthn_credentials;
CREATE POLICY "users_select_own_webauthn"
  ON public.user_webauthn_credentials FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_update_own_webauthn_friendly_name" ON public.user_webauthn_credentials;
CREATE POLICY "users_update_own_webauthn_friendly_name"
  ON public.user_webauthn_credentials FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ================================================
-- 2. mfa_trusted_devices policies
-- ================================================
DROP POLICY IF EXISTS "users_select_own_trusted_devices" ON public.mfa_trusted_devices;
CREATE POLICY "users_select_own_trusted_devices"
  ON public.mfa_trusted_devices FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_revoke_own_trusted_devices" ON public.mfa_trusted_devices;
CREATE POLICY "users_revoke_own_trusted_devices"
  ON public.mfa_trusted_devices FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()) AND revoked_at IS NOT NULL);

-- ================================================
-- 3. mfa_webauthn_challenges: explicit deny-all for authenticated + anon
-- Service role bypasses RLS, so server-managed challenge lifecycle is unaffected.
-- ================================================
DROP POLICY IF EXISTS "deny_all_client_access_challenges" ON public.mfa_webauthn_challenges;
CREATE POLICY "deny_all_client_access_challenges"
  ON public.mfa_webauthn_challenges
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);
