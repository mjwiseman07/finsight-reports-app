-- =============================================================================
-- EXECUTABLE SQUASH CANDIDATE — DRAFT / NON-DEPLOYABLE
-- Proposed version: 20260907010000
-- Proposed name: esc_platform_prerequisites_contract
-- Module: platform_prerequisite_contract
-- Provenance: Design contract; no application DDL. Platform-managed Auth/Storage/Realtime/Vault/_realtime.
-- NOT in active supabase/migrations/. Production mutation NOT authorized.
-- UTF-8 LF. statements[] must remain non-empty when eventually recorded.
-- =============================================================================
-- This module records required platform prerequisites. It must not CREATE auth/storage internals.
-- Mid-replay assertion (expected on host before application modules):
DO $esc_platform$
BEGIN
  IF to_regclass('auth.users') IS NULL THEN
    RAISE EXCEPTION 'ESC platform prerequisite missing: auth.users';
  END IF;
  IF to_regnamespace('storage') IS NULL THEN
    RAISE EXCEPTION 'ESC platform prerequisite missing: storage schema';
  END IF;
END
$esc_platform$;
