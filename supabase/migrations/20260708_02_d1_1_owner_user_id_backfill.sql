-- ============================================================================
-- Advisacor Doc D — Block D1.1: owner_user_id backfill for seeded firm_clients
-- Idempotent. Links the 4 seeded firm_clients to the super_admin user so the
-- QBO read path (getQboForFirmClient -> resolveQBOTokenForFirmClient) can
-- complete end-to-end in tests.
--
-- NOTE: the actual seeded firm_client IDs all share the prefix
-- 71111111-1111-4111-8111-* (confirmed live), not the 72../73../74.. IDs from
-- the original spec draft. Using the real IDs here.
-- ============================================================================

DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'mwiseman@advisacor.com'
  LIMIT 1;

  IF admin_user_id IS NOT NULL THEN
    UPDATE firm_clients
    SET owner_user_id = admin_user_id
    WHERE owner_user_id IS NULL
      AND id IN (
        '71111111-1111-4111-8111-111111111111',
        '71111111-1111-4111-8111-222222222222',
        '71111111-1111-4111-8111-333333333333',
        '71111111-1111-4111-8111-444444444444'
      );
  END IF;
END $$;

-- Index for the frequent owner_user_id lookup in the resolver.
CREATE INDEX IF NOT EXISTS idx_firm_clients_owner_user_id
  ON firm_clients(owner_user_id) WHERE owner_user_id IS NOT NULL;
