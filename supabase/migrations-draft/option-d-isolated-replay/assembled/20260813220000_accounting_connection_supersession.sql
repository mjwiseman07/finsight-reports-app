-- Additive connection supersession lifecycle (PR B).
-- EXPAND ONLY: no status backfill, no unique connected index, no data updates.
--
-- Semantics:
--   connected   = eligible authoritative OAuth grant
--   superseded  = historical connection retained for attribution; never eligible
--                 for new accounting reads/writes
--   expired     = token/grant needs reconnect
--   disconnected= intentionally disconnected
--   failed      = unusable connection state
--
-- Do NOT add a restrictive status CHECK here: live DB has free-form text status
-- and historical values must remain compatible.

ALTER TABLE public.accounting_connections
  ADD COLUMN IF NOT EXISTS superseded_by_connection_id uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'accounting_connections_superseded_by_fkey'
      AND conrelid = 'public.accounting_connections'::regclass
  ) THEN
    ALTER TABLE public.accounting_connections
      ADD CONSTRAINT accounting_connections_superseded_by_fkey
      FOREIGN KEY (superseded_by_connection_id)
      REFERENCES public.accounting_connections(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'accounting_connections_superseded_by_not_self'
      AND conrelid = 'public.accounting_connections'::regclass
  ) THEN
    ALTER TABLE public.accounting_connections
      ADD CONSTRAINT accounting_connections_superseded_by_not_self
      CHECK (
        superseded_by_connection_id IS NULL
        OR superseded_by_connection_id <> id
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS accounting_connections_superseded_by_idx
  ON public.accounting_connections (superseded_by_connection_id)
  WHERE superseded_by_connection_id IS NOT NULL;

COMMENT ON COLUMN public.accounting_connections.superseded_by_connection_id IS
  'When status=superseded, points at the canonical successor connection for the same user/provider/tenant grant. ON DELETE SET NULL preserves predecessor attribution.';
