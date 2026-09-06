-- PBC-TIEOUT-4B.3.2 sentinel amendment.
-- Enforces one system-managed rollup sentinel PBC row per (engagement, tie_out_kind).
-- Additive, idempotent, safe to re-run.
-- Partial UNIQUE index covering the SYS-ROLLUP-* namespace on request_number.
-- The predicate matches all current and future system sentinels while leaving
-- normal user-supplied request_number values unconstrained.
CREATE UNIQUE INDEX IF NOT EXISTS audit_ready_pbc_requests_sys_rollup_sentinel_key
  ON public.audit_ready_pbc_requests (engagement_id, tie_out_kind)
  WHERE request_number LIKE 'SYS-ROLLUP-%';
COMMENT ON INDEX public.audit_ready_pbc_requests_sys_rollup_sentinel_key IS
  'Ensures at most one system-managed sentinel PBC row per (engagement, tie_out_kind). System sentinels are identified by request_number LIKE ''SYS-ROLLUP-%''. Referenced by rollup resolvers (e.g. runBsSummaryResolver) that need to satisfy audit_ready_tie_out_runs.pbc_request_id NOT NULL without polluting the PBC inbox with one row per run.';
