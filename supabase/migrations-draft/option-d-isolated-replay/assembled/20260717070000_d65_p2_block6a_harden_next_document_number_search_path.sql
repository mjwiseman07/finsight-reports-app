-- Phase D6.5 Part 2 — Block 6a hardening
-- Fix Supabase security advisor WARN: function_search_path_mutable on next_document_number
-- Applied to live Supabase in Block 6a audit pass; this file backfills the repo so
-- migration history matches DB state.

BEGIN;

ALTER FUNCTION public.next_document_number(UUID, TEXT) SET search_path = public, pg_temp;

COMMIT;
