-- Rollback for WBP W1a accounts cache tables.
-- WARNING: destructive. Drops both tables and all cached account snapshots.
-- Safe to run only if xeroProvider.writeJournalEntry / qboProvider.writeJournalEntry
-- have NEVER been called against a live tenant (W1c not yet shipped).

BEGIN;

DROP TABLE IF EXISTS public.qbo_accounts_cache;
DROP TABLE IF EXISTS public.xero_accounts_cache;

COMMIT;
