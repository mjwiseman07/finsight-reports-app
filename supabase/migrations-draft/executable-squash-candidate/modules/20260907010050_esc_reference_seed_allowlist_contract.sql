-- =============================================================================
-- EXECUTABLE SQUASH CANDIDATE — DRAFT / NON-DEPLOYABLE
-- Proposed version: 20260907010050
-- Proposed name: esc_reference_seed_allowlist_contract
-- Module: allowlisted_immutable_reference_seeds
-- Provenance: Allowlist contract; company_roles seed lives inside foundations module (deterministic reference)
-- NOT in active supabase/migrations/. Production mutation NOT authorized.
-- UTF-8 LF. statements[] must remain non-empty when eventually recorded.
-- =============================================================================
-- Allowlisted reference seeds (already applied in foundations module):
--   public.company_roles — immutable role catalog (see foundations baseline allowlist)
-- No additional INSERT/UPDATE/DELETE in this module.
DO $esc_ref$
BEGIN
  IF to_regclass('public.company_roles') IS NULL THEN
    RAISE EXCEPTION 'ESC reference seed prerequisite missing: public.company_roles';
  END IF;
END
$esc_ref$;
