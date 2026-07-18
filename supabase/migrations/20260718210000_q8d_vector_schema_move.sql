-- Phase Q8d D1: Move vector extension from public → extensions schema
--
-- Root cause: Extensions in `public` are a footgun. They add many
-- functions/operators/types to a schema on every role's default search_path,
-- creating shadowing risk and privilege bleed. Supabase's standard is a
-- dedicated `extensions` schema (already present, already on default
-- search_path for postgres/authenticator/service_role).
--
-- Advisor rule: extension_in_public (WARN) on vector 0.8.0.
--
-- Live-verified state at authoring:
--   - Extension: vector 0.8.0 in public
--   - `extensions` schema exists (no CREATE SCHEMA needed)
--   - 1 vector column: public.vector_index.embedding VECTOR(1536)
--   - 0 rows in vector_index
--   - 0 ivfflat/hnsw indexes
--
-- Type OIDs are stable across ALTER EXTENSION SET SCHEMA, so
-- vector_index.embedding continues to work without table rewrite.
--
-- Rollback: ALTER EXTENSION vector SET SCHEMA public;

ALTER EXTENSION vector SET SCHEMA extensions;

-- Assertion: extension is now in the extensions schema
DO $$
DECLARE
  ext_schema text;
BEGIN
  SELECT n.nspname INTO ext_schema
  FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'vector';
  IF ext_schema <> 'extensions' THEN
    RAISE EXCEPTION 'q8d D1: vector extension in schema % (expected extensions)', ext_schema;
  END IF;
END $$;

-- Sanity: dependent column still queryable post-move
DO $$
BEGIN
  PERFORM 1 FROM public.vector_index LIMIT 1;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'q8d D1: vector_index unreadable post-move: %', SQLERRM;
END $$;
