-- PR C: one-time authority-preservation migration for the known Demo Xero
-- duplicate connected-grant group, then install the generic uniqueness invariant.
--
-- Product lesson encoded here:
--   Activity is not authority.
--   A duplicate grant becoming "newer" after accidental exercise must NOT
--   re-elect the canonical OAuth connection.
--
-- Previously accepted production authority for this Demo tenant/user:
--   connection: b718823a-0eb8-437d-beba-05c41f6482f9
--   sync:       95da07be-8e2c-4b84-9dcc-8a98fa841273 (schema v4)
--
-- This migration:
--   1) asserts the exact Demo connected-duplicate shape
--   2) asserts there are no other connected-duplicate groups
--   3) supersedes the four competing CONNECTED rows only
--   4) leaves disconnected rows untouched
--   5) does NOT move/delete accounting_syncs
--   6) does NOT clear token fields
--   7) installs partial UNIQUE for one connected grant per
--      (user_id, provider, tenant_or_realm_id)
--
-- connected + disconnected for the same key remains allowed.
-- Manual rollback: set the four superseded rows back to connected,
-- clear superseded_by_connection_id, then DROP the unique index.
-- Do not delete syncs.

DO $$
DECLARE
  demo_user constant uuid := 'a4ebf834-a698-4f79-a945-8498f2e6c45d';
  demo_tenant constant text := 'ceaea696-081f-491e-9daa-a9263a023ca9';
  canonical constant uuid := 'b718823a-0eb8-437d-beba-05c41f6482f9';
  canonical_sync constant uuid := '95da07be-8e2c-4b84-9dcc-8a98fa841273';
  expected_supersede constant uuid[] := ARRAY[
    'ce526f9b-5d2c-46fc-b6f3-46617ab375bf'::uuid,
    '671afdab-8f46-4862-a1f2-6ba09b0aec35'::uuid,
    '5550d2f4-a4c0-430e-a956-419cf20fb331'::uuid,
    '27da6a2f-d6f1-4621-b5f3-c0dae24ab2c7'::uuid
  ];
  connected_count int;
  disconnected_count int;
  connected_dup_groups int;
  matched_supersede int;
  extra_connected int;
  canonical_ok int;
  canonical_sync_ok int;
BEGIN
  -- Global: only this known connected-duplicate group may exist.
  SELECT count(*) INTO connected_dup_groups
  FROM (
    SELECT 1
    FROM public.accounting_connections
    WHERE status = 'connected'
      AND tenant_or_realm_id IS NOT NULL
    GROUP BY user_id, provider, tenant_or_realm_id
    HAVING count(*) > 1
  ) t;

  IF connected_dup_groups <> 1 THEN
    RAISE EXCEPTION
      'PR C precondition failed: expected exactly 1 connected-duplicate group, found %',
      connected_dup_groups;
  END IF;

  SELECT
    count(*) FILTER (WHERE status = 'connected'),
    count(*) FILTER (WHERE status = 'disconnected')
  INTO connected_count, disconnected_count
  FROM public.accounting_connections
  WHERE user_id = demo_user
    AND provider = 'xero'
    AND tenant_or_realm_id = demo_tenant;

  IF connected_count <> 5 THEN
    RAISE EXCEPTION
      'PR C precondition failed: Demo group expected 5 connected rows, found %',
      connected_count;
  END IF;

  IF disconnected_count <> 6 THEN
    RAISE EXCEPTION
      'PR C precondition failed: Demo group expected 6 disconnected rows, found %',
      disconnected_count;
  END IF;

  SELECT count(*) INTO canonical_ok
  FROM public.accounting_connections
  WHERE id = canonical
    AND user_id = demo_user
    AND provider = 'xero'
    AND tenant_or_realm_id = demo_tenant
    AND status = 'connected'
    AND coalesce(superseded_by_connection_id::text, '') = '';

  IF canonical_ok <> 1 THEN
    RAISE EXCEPTION
      'PR C precondition failed: canonical connection % is not an eligible connected grant',
      canonical;
  END IF;

  SELECT count(*) INTO canonical_sync_ok
  FROM public.accounting_syncs
  WHERE id = canonical_sync
    AND connection_id = canonical
    AND validation_status = 'SUCCESS';

  IF canonical_sync_ok <> 1 THEN
    RAISE EXCEPTION
      'PR C precondition failed: canonical sync % missing or not SUCCESS on %',
      canonical_sync, canonical;
  END IF;

  SELECT count(*) INTO matched_supersede
  FROM public.accounting_connections
  WHERE id = ANY (expected_supersede)
    AND user_id = demo_user
    AND provider = 'xero'
    AND tenant_or_realm_id = demo_tenant
    AND status = 'connected';

  IF matched_supersede <> 4 THEN
    RAISE EXCEPTION
      'PR C precondition failed: expected 4 connected competitors to supersede, found %',
      matched_supersede;
  END IF;

  SELECT count(*) INTO extra_connected
  FROM public.accounting_connections
  WHERE user_id = demo_user
    AND provider = 'xero'
    AND tenant_or_realm_id = demo_tenant
    AND status = 'connected'
    AND id <> canonical
    AND NOT (id = ANY (expected_supersede));

  IF extra_connected <> 0 THEN
    RAISE EXCEPTION
      'PR C precondition failed: unexpected extra connected Demo rows (%)',
      extra_connected;
  END IF;
END $$;

-- Supersede only the four known competing CONNECTED grants.
-- Preserve tokens, sync FKs, and all historical sync rows (including 774e6be2 on ce526f9b).
UPDATE public.accounting_connections AS c
SET
  status = 'superseded',
  superseded_by_connection_id = 'b718823a-0eb8-437d-beba-05c41f6482f9'::uuid,
  updated_at = now()
WHERE c.id IN (
  'ce526f9b-5d2c-46fc-b6f3-46617ab375bf'::uuid,
  '671afdab-8f46-4862-a1f2-6ba09b0aec35'::uuid,
  '5550d2f4-a4c0-430e-a956-419cf20fb331'::uuid,
  '27da6a2f-d6f1-4621-b5f3-c0dae24ab2c7'::uuid
)
AND c.status = 'connected'
AND c.user_id = 'a4ebf834-a698-4f79-a945-8498f2e6c45d'::uuid
AND c.provider = 'xero'
AND c.tenant_or_realm_id = 'ceaea696-081f-491e-9daa-a9263a023ca9';

DO $$
DECLARE
  updated_count int;
  remaining_connected int;
  disconnected_count int;
  connected_dup_groups int;
BEGIN
  SELECT count(*) INTO updated_count
  FROM public.accounting_connections
  WHERE status = 'superseded'
    AND superseded_by_connection_id = 'b718823a-0eb8-437d-beba-05c41f6482f9'::uuid
    AND id IN (
      'ce526f9b-5d2c-46fc-b6f3-46617ab375bf'::uuid,
      '671afdab-8f46-4862-a1f2-6ba09b0aec35'::uuid,
      '5550d2f4-a4c0-430e-a956-419cf20fb331'::uuid,
      '27da6a2f-d6f1-4621-b5f3-c0dae24ab2c7'::uuid
    );

  IF updated_count <> 4 THEN
    RAISE EXCEPTION
      'PR C postcondition failed: expected 4 superseded competitors, found %',
      updated_count;
  END IF;

  SELECT count(*) INTO remaining_connected
  FROM public.accounting_connections
  WHERE user_id = 'a4ebf834-a698-4f79-a945-8498f2e6c45d'::uuid
    AND provider = 'xero'
    AND tenant_or_realm_id = 'ceaea696-081f-491e-9daa-a9263a023ca9'
    AND status = 'connected';

  IF remaining_connected <> 1 THEN
    RAISE EXCEPTION
      'PR C postcondition failed: expected exactly 1 connected Demo grant, found %',
      remaining_connected;
  END IF;

  SELECT count(*) INTO disconnected_count
  FROM public.accounting_connections
  WHERE user_id = 'a4ebf834-a698-4f79-a945-8498f2e6c45d'::uuid
    AND provider = 'xero'
    AND tenant_or_realm_id = 'ceaea696-081f-491e-9daa-a9263a023ca9'
    AND status = 'disconnected';

  IF disconnected_count <> 6 THEN
    RAISE EXCEPTION
      'PR C postcondition failed: disconnected rows were altered (expected 6, found %)',
      disconnected_count;
  END IF;

  -- Historical syncs must remain on original connection ids.
  IF NOT EXISTS (
    SELECT 1 FROM public.accounting_syncs
    WHERE id = '774e6be2-ad1b-41fa-859d-163b0805c3ca'::uuid
      AND connection_id = 'ce526f9b-5d2c-46fc-b6f3-46617ab375bf'::uuid
  ) THEN
    RAISE EXCEPTION 'PR C postcondition failed: ce526 sync 774e6be2 was moved or deleted';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.accounting_syncs
    WHERE id = '95da07be-8e2c-4b84-9dcc-8a98fa841273'::uuid
      AND connection_id = 'b718823a-0eb8-437d-beba-05c41f6482f9'::uuid
  ) THEN
    RAISE EXCEPTION 'PR C postcondition failed: canonical sync 95da07be was moved or deleted';
  END IF;

  SELECT count(*) INTO connected_dup_groups
  FROM (
    SELECT 1
    FROM public.accounting_connections
    WHERE status = 'connected'
      AND tenant_or_realm_id IS NOT NULL
    GROUP BY user_id, provider, tenant_or_realm_id
    HAVING count(*) > 1
  ) t;

  IF connected_dup_groups <> 0 THEN
    RAISE EXCEPTION
      'PR C postcondition failed: connected-duplicate groups remain (%)',
      connected_dup_groups;
  END IF;
END $$;

-- Generic invariant: one authoritative connected grant per user+provider+tenant.
-- Disconnected / expired / failed / superseded / needs_entity_selection rows may share the key.
CREATE UNIQUE INDEX IF NOT EXISTS accounting_connections_one_connected_grant_uidx
  ON public.accounting_connections (user_id, provider, tenant_or_realm_id)
  WHERE status = 'connected'
    AND tenant_or_realm_id IS NOT NULL;
