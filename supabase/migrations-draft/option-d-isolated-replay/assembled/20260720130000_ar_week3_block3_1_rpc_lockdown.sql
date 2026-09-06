-- Week 3 Block 3.1 — Lock down increment_pbc_request_count RPC
-- ADDITIVE ONLY. Corrective patch for security lints 0028 and 0029.
--
-- Root cause: PostgreSQL default schema grants re-expose EXECUTE on new
-- functions to `anon` and `authenticated` via Supabase's authenticator role,
-- even after `REVOKE ALL ... FROM public`. Explicit per-role revoke required.

BEGIN;

REVOKE EXECUTE ON FUNCTION public.increment_pbc_request_count(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_pbc_request_count(uuid, integer) FROM authenticated;

-- Re-affirm service_role has EXECUTE (idempotent).
GRANT EXECUTE ON FUNCTION public.increment_pbc_request_count(uuid, integer) TO service_role;

COMMIT;
