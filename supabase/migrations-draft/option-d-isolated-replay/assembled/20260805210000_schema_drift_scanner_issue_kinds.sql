-- MAJOR #2.1 — Register scanner-limitation issue kinds.
--
-- The AST-based scanner in lib/schema-drift/repo-scanner.ts emits these kinds
-- to lifecycle_issues when it can't classify a query with full confidence:
--
--   * schema_drift_scanner_unable_to_classify
--       Dynamic table binding (variable resolved to non-string-literal)
--       or cross-function passthrough (table name is a function parameter
--       with no call-site narrowing). NOT a runtime error — just a signal
--       that this query can't be statically verified against the live schema.
--
--   * schema_drift_scanner_ambiguous_column
--       Table binding is a union of literals (e.g. ternary of two string
--       literals) and the referenced column exists on some but not all of
--       the possible tables. Runtime path may or may not hit the drifted branch.
--
-- issue_kind is a free-text column on lifecycle_issues today (verified via
-- information_schema.columns: data_type='text', is_nullable='NO'), so no DDL
-- is strictly required. This migration exists to (a) leave a searchable audit
-- trail of when the new kinds were introduced and (b) create a lookup table
-- future assertion-coverage rollups can join against.

CREATE TABLE IF NOT EXISTS public.lifecycle_issue_kinds_registry (
  issue_kind text PRIMARY KEY,
  category text NOT NULL,
  description text NOT NULL,
  introduced_at timestamptz NOT NULL DEFAULT now(),
  introduced_by_migration text NOT NULL
);

COMMENT ON TABLE public.lifecycle_issue_kinds_registry IS
  'MAJOR #2.1: canonical registry of lifecycle_issues.issue_kind values. Not a FK constraint — audit surface only.';

INSERT INTO public.lifecycle_issue_kinds_registry (issue_kind, category, description, introduced_by_migration)
VALUES
  ('schema_drift',
   'schema_drift',
   'Runtime postgres error matched a schema-drift signature (column_missing, relation_missing, function_missing, type_mismatch, search_path_missing).',
   '20260805054000_schema_drift_issue_policies'),
  ('schema_drift_detector_degraded',
   'schema_drift',
   'The schema-drift detector cron could not fetch postgres logs (missing management API token or transient failure). Self-degradation signal.',
   '20260805054000_schema_drift_issue_policies'),
  ('schema_drift_scanner_unable_to_classify',
   'schema_drift',
   'Static repo scanner encountered a query whose table binding is a dynamic value (variable, function parameter). No column check performed. Runtime code may still be correct.',
   '20260805210000_schema_drift_scanner_issue_kinds'),
  ('schema_drift_scanner_ambiguous_column',
   'schema_drift',
   'Static repo scanner encountered a query whose table binding is a union of literals (e.g. ternary of string literals). Column exists on some but not all possible tables. Runtime branch coverage undetermined.',
   '20260805210000_schema_drift_scanner_issue_kinds'),
  ('schema_drift_accepted_baseline',
   'schema_drift',
   'Pre-existing schema drift accepted in .schema-drift-baseline.json with a debt ticket. Each entry must be resolved and removed from the baseline; scanner records these on every run for audit trail.',
   '20260805210000_schema_drift_scanner_issue_kinds')
ON CONFLICT (issue_kind) DO NOTHING;

-- Read policy so super-admin can see the registry (RLS enabled to match
-- lifecycle_issues pattern; service role bypasses regardless).
ALTER TABLE public.lifecycle_issue_kinds_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lifecycle_issue_kinds_registry_read
  ON public.lifecycle_issue_kinds_registry;

CREATE POLICY lifecycle_issue_kinds_registry_read
  ON public.lifecycle_issue_kinds_registry
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
  );
