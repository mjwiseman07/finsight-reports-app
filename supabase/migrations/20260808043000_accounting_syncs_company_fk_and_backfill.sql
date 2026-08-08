-- Phase L2: backfill accounting_syncs.company_id from user's company + pilot slot
-- and enforce FK so this class of drift cannot recur silently.
-- Join uses company_users (pilot_slot_members does not exist in this schema).

BEGIN;

-- Step 1: backfill accounting_syncs rows where company_id was wrongly set to user_id
UPDATE accounting_syncs AS s
SET company_id = sub.company_id
FROM (
  SELECT DISTINCT ON (c.id)
    c.id AS connection_id,
    ps.company_id
  FROM accounting_connections AS c
  JOIN company_users AS cu
    ON cu.user_id = c.user_id
   AND cu.status = 'active'
  JOIN pilot_slots AS ps
    ON ps.company_id = cu.company_id
   AND ps.pilot_status IN ('active', 'trial', 'converted')
  WHERE ps.company_id IS NOT NULL
    AND ps.company_id <> c.user_id
  ORDER BY c.id, ps.updated_at DESC NULLS LAST
) AS sub
WHERE s.connection_id = sub.connection_id
  AND s.company_id = (SELECT user_id FROM accounting_connections WHERE id = s.connection_id);

-- Step 2: any remaining rows where company_id doesn't point to a real company → NULL them
UPDATE accounting_syncs
SET company_id = NULL
WHERE company_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM companies WHERE id = accounting_syncs.company_id);

-- Step 3: same treatment for accounting_connections.metadata_json.company_id
UPDATE accounting_connections AS c
SET metadata_json = jsonb_set(
  COALESCE(c.metadata_json, '{}'::jsonb),
  '{company_id}',
  to_jsonb(sub.company_id::text)
)
FROM (
  SELECT DISTINCT ON (cu.user_id)
    cu.user_id,
    ps.company_id
  FROM company_users AS cu
  JOIN pilot_slots AS ps
    ON ps.company_id = cu.company_id
   AND ps.pilot_status IN ('active', 'trial', 'converted')
  WHERE cu.status = 'active'
    AND ps.company_id IS NOT NULL
  ORDER BY cu.user_id, ps.updated_at DESC NULLS LAST
) AS sub
WHERE c.user_id = sub.user_id
  AND (c.metadata_json->>'company_id') IS NOT NULL
  AND (c.metadata_json->>'company_id')::uuid = c.user_id
  AND sub.company_id IS NOT NULL;

-- Step 4: add FK so future writes with a stale company_id fail loud
ALTER TABLE accounting_syncs
  DROP CONSTRAINT IF EXISTS accounting_syncs_company_fk;

ALTER TABLE accounting_syncs
  ADD CONSTRAINT accounting_syncs_company_fk
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;

-- Step 5: index for scorecard query performance
CREATE INDEX IF NOT EXISTS accounting_syncs_company_last_synced_idx
  ON accounting_syncs (company_id, last_synced_at DESC)
  WHERE company_id IS NOT NULL;

COMMIT;
