-- MAJOR #2.1 follow-up — sp_list_public_columns returns jsonb (single row).
--
-- The original MAJOR #2 function returned SETOF (table_name, column_name).
-- PostgREST applies its max-rows limit (default 1000) to set-returning RPCs,
-- so the scanner silently truncated the live column universe (~3000+ public
-- columns) and false-positived every table alphabetically past the cutoff
-- (e.g. close_packets only appeared as id + close_period_id).
--
-- Returning a single jsonb array escapes the row-limit trap: one response
-- row carries the full listing.

DROP FUNCTION IF EXISTS public.sp_list_public_columns();

CREATE FUNCTION public.sp_list_public_columns()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'table_name', c.table_name,
        'column_name', c.column_name
      )
      ORDER BY c.table_name, c.column_name
    ),
    '[]'::jsonb
  )
  FROM information_schema.columns c
  WHERE c.table_schema = 'public';
$$;

REVOKE ALL ON FUNCTION public.sp_list_public_columns() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sp_list_public_columns() TO service_role;

COMMENT ON FUNCTION public.sp_list_public_columns() IS
  'MAJOR #2.1: service_role-only listing of public.* columns as a single jsonb array (avoids PostgREST max-rows truncation of set-returning RPCs).';
