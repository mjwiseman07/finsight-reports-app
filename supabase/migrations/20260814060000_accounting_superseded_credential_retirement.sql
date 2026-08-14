-- PR F: retire live OAuth credentials on superseded accounting connections.
-- CODE HARDENING ships with this migration; do NOT apply to production until review.
--
-- Semantics:
--   superseded rows remain permanent historical identity + sync lineage evidence.
--   They must not retain reusable provider authorization secrets.
--   connected / disconnected rows are intentionally untouched here.
--
-- Does NOT call Xero/Intuit token revocation APIs — DB credential retirement only.

ALTER TABLE public.accounting_connections
  ADD COLUMN IF NOT EXISTS credentials_cleared_at timestamptz;

COMMENT ON COLUMN public.accounting_connections.credentials_cleared_at IS
  'Set when live OAuth secrets were intentionally cleared; accounting memory remains.';

-- Clear secrets on superseded only. Preserve id/status/superseded_by/sync lineage.
-- Do not bump updated_at (authority/recency signal stays undisturbed).
-- COALESCE preserves a prior credentials_cleared_at on idempotent re-runs.
UPDATE public.accounting_connections
SET
  access_token = NULL,
  refresh_token = NULL,
  token_expires_at = NULL,
  credentials_cleared_at = COALESCE(credentials_cleared_at, timezone('utc', now()))
WHERE status = 'superseded'
  AND (
    access_token IS NOT NULL
    OR refresh_token IS NOT NULL
    OR token_expires_at IS NOT NULL
    OR credentials_cleared_at IS NULL
  );
