-- D6.5 Part 1.1: Add firm_clients.slug with validator + per-firm uniqueness.
-- Backfills from firm_clients.name using the same slugify recipe as
-- scripts/provision-intake-addresses.ts and lib/intake/address.ts.

BEGIN;

-- §1. Add column (nullable while we backfill).
ALTER TABLE public.firm_clients
  ADD COLUMN IF NOT EXISTS slug text;

-- §2. Deterministic slugify helper — mirrors the TS slugFromClientName recipe.
--     lowercase → replace non-[a-z0-9] with '-' → strip leading/trailing '-'
--     → slice(0, 32). Result is intentionally NULL if the derived string
--     is empty; the backfill loop below handles that with a co-{companyId}
--     fallback exactly like the TS code.
CREATE OR REPLACE FUNCTION public._d651_slugify_name(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    substring(
      regexp_replace(
        regexp_replace(
          lower(coalesce(p_name, '')),
          '[^a-z0-9]+', '-', 'g'
        ),
        '^-+|-+$', '', 'g'
      ),
      1, 32
    ),
    ''
  );
$$;

-- §3. Backfill in a single DO block so we can handle collisions deterministically.
--     Ordering: (firm_id, created_at, id) — the oldest row in a firm wins the
--     base slug; later collisions get -2, -3, ... suffixes. This is stable
--     across re-runs (idempotent) because we only touch rows where slug IS NULL.
DO $backfill$
DECLARE
  r RECORD;
  base_slug text;
  candidate text;
  suffix int;
  fallback text;
BEGIN
  FOR r IN
    SELECT id, firm_id, company_id, name
      FROM public.firm_clients
     WHERE slug IS NULL
     ORDER BY firm_id, created_at, id
  LOOP
    base_slug := public._d651_slugify_name(r.name);

    -- If name doesn't yield a valid base, use the same co-{companyId} fallback
    -- as scripts/provision-intake-addresses.ts.
    IF base_slug IS NULL OR length(base_slug) < 3 THEN
      fallback := 'co-' || substring(replace(r.company_id::text, '-', ''), 1, 8);
      base_slug := fallback;
    END IF;

    -- Enforce validator length bounds. isValidFirmSlug requires 3-32 chars
    -- with alphanumeric anchors. If base is <3 chars after fallback, skip.
    IF length(base_slug) < 3 THEN
      RAISE WARNING 'skip firm_client %: cannot derive valid slug (name=%, company_id=%)',
        r.id, r.name, r.company_id;
      CONTINUE;
    END IF;

    -- Ensure alphanumeric anchors — validator regex requires first & last char
    -- to be [a-z0-9]. Our slugify already strips leading/trailing dashes,
    -- and 'co-' fallback starts with 'c' + ends with [a-z0-9], so both paths
    -- are already anchor-safe. Defensive check:
    IF base_slug !~ '^[a-z0-9]' OR base_slug !~ '[a-z0-9]$' THEN
      RAISE WARNING 'skip firm_client %: derived slug fails anchor check (slug=%)',
        r.id, base_slug;
      CONTINUE;
    END IF;

    -- Collision resolution: try base, then base-2, base-3, ... until unique
    -- within firm_id. Cap the base at 30 chars if we need a -N suffix, so the
    -- final slug still fits in 32 chars for suffixes up to -99.
    candidate := base_slug;
    suffix := 2;
    WHILE EXISTS (
      SELECT 1 FROM public.firm_clients
       WHERE firm_id = r.firm_id
         AND slug = candidate
         AND id <> r.id
    ) LOOP
      candidate := substring(base_slug, 1, 30) || '-' || suffix::text;
      suffix := suffix + 1;
      IF suffix > 100 THEN
        RAISE EXCEPTION 'collision suffix overflow for firm % base %', r.firm_id, base_slug;
      END IF;
    END LOOP;

    UPDATE public.firm_clients SET slug = candidate WHERE id = r.id;
  END LOOP;
END
$backfill$;

-- §4. Validator CHECK constraint — matches lib/intake/address.ts isValidFirmSlug.
--     Applied only to non-null values so new rows can be inserted without a
--     slug and get one via an application-layer default, but any non-null
--     value must be valid.
ALTER TABLE public.firm_clients
  ADD CONSTRAINT firm_clients_slug_valid_ck
  CHECK (slug IS NULL OR slug ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$');

-- §5. Uniqueness — one slug per firm. Partial index so NULLs don't conflict
--     (Postgres treats NULLs as distinct by default, but partial makes intent
--     explicit and slightly faster).
CREATE UNIQUE INDEX IF NOT EXISTS firm_clients_firm_id_slug_uidx
  ON public.firm_clients (firm_id, slug)
  WHERE slug IS NOT NULL;

-- §6. Clean up the helper — it was single-use and shouldn't linger in the
--     schema. New rows should get slugs from the application layer, not this
--     helper (which won't be re-executed).
DROP FUNCTION public._d651_slugify_name(text);

COMMIT;
