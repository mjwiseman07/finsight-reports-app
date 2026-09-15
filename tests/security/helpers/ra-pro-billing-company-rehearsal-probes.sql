-- Disposable rehearsal probes for 20260915004500_ra_pro_firm_billing_company_id
-- Applied after bootstrap + migration in local docker only.
-- Requires company_users table + trusted DB roles (no JWT claim shortcuts).

INSERT INTO public.companies (id, name) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BillCo'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'OtherCo')
ON CONFLICT DO NOTHING;

INSERT INTO public.company_users (company_id, user_id, role, status) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'admin', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO public.firms (id, name) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'UnlinkedFirm')
ON CONFLICT DO NOTHING;

-- Existing row remains null
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.firms
    WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
      AND billing_company_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'unlinked_firm_not_null';
  END IF;
END $$;

-- Authenticated cannot set billing_company_id even with forged JWT service_role claim
SET ROLE postgres;
DROP POLICY IF EXISTS firms_auth_update_rehearsal ON public.firms;
DROP POLICY IF EXISTS firms_auth_select_rehearsal ON public.firms;
CREATE POLICY firms_auth_select_rehearsal ON public.firms
  FOR SELECT TO authenticated USING (true);
CREATE POLICY firms_auth_update_rehearsal ON public.firms
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

SET SESSION AUTHORIZATION authenticated;
SELECT set_config('request.jwt.claim.role', 'service_role', true);
DO $$
DECLARE
  v_who text := current_user;
  v_n int;
  v_link uuid;
BEGIN
  IF v_who IS DISTINCT FROM 'authenticated' THEN
    RAISE EXCEPTION 'expected_authenticated_got_%', v_who;
  END IF;
  UPDATE public.firms
  SET billing_company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n > 0 THEN
    RAISE EXCEPTION 'forged_jwt_update_should_fail';
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN NULL;
  WHEN OTHERS THEN
    IF SQLERRM = 'forged_jwt_update_should_fail' THEN RAISE; END IF;
    IF SQLERRM LIKE 'expected_authenticated_got_%' THEN RAISE; END IF;
    IF SQLERRM NOT LIKE '%billing_company_id%' THEN
      RAISE EXCEPTION 'unexpected_auth_deny: %', SQLERRM;
    END IF;
END $$;

-- Confirm link still null under authenticated
DO $$
DECLARE
  v_link uuid;
BEGIN
  SELECT billing_company_id INTO v_link
  FROM public.firms
  WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  IF v_link IS NOT NULL THEN
    RAISE EXCEPTION 'billing_company_id_mutated_by_authenticated';
  END IF;
END $$;

-- Authenticated cannot invoke activation even with forged JWT claim
DO $$
BEGIN
  PERFORM public.activate_review_assist_pro_subscription(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'RA Pro Firm',
    'sub_forged',
    'cus_forged',
    'flat',
    'monthly',
    'pilot'
  );
  RAISE EXCEPTION 'forged_jwt_activate_should_fail';
EXCEPTION
  WHEN insufficient_privilege THEN NULL;
  WHEN OTHERS THEN
    IF SQLERRM = 'forged_jwt_activate_should_fail' THEN RAISE; END IF;
    IF SQLERRM NOT LIKE '%activate_ra_pro_forbidden%'
       AND SQLERRM NOT LIKE '%permission denied%' THEN
      RAISE EXCEPTION 'unexpected_activate_deny: %', SQLERRM;
    END IF;
END $$;

RESET SESSION AUTHORIZATION;
SET ROLE postgres;
DROP POLICY IF EXISTS firms_auth_update_rehearsal ON public.firms;
DROP POLICY IF EXISTS firms_auth_select_rehearsal ON public.firms;

-- Buyer without company_users membership fails closed (postgres is a trusted role)
DO $$
BEGIN
  PERFORM public.activate_review_assist_pro_subscription(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'RA Pro Firm',
    'sub_no_owner',
    'cus_no_owner',
    'flat',
    'monthly',
    'pilot'
  );
  RAISE EXCEPTION 'buyer_mismatch_should_fail';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM = 'buyer_mismatch_should_fail' THEN RAISE; END IF;
    IF SQLERRM NOT LIKE '%activate_ra_pro_buyer_not_company_member%' THEN
      RAISE EXCEPTION 'unexpected_buyer_error: %', SQLERRM;
    END IF;
END $$;

-- Prove no firm/slot leaked from failed ownership activation
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.firms WHERE billing_company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  ) THEN
    RAISE EXCEPTION 'orphaned_firm_after_buyer_mismatch';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.pilot_slots
    WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      AND tier_key = 'review_assist_pro'
  ) THEN
    RAISE EXCEPTION 'orphaned_slot_after_buyer_mismatch';
  END IF;
END $$;

-- Trusted DB role (postgres) activation + replay — no JWT claim required
SELECT public.activate_review_assist_pro_subscription(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'RA Pro Firm',
  'sub_test_1',
  'cus_test_1',
  'flat',
  'monthly',
  'pilot'
) AS first_activation;

SELECT public.activate_review_assist_pro_subscription(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'RA Pro Firm',
  'sub_test_1',
  'cus_test_1',
  'flat',
  'monthly',
  'pilot'
) AS replay_activation;

-- service_role path also works without JWT claim
SET ROLE service_role;
SELECT public.activate_review_assist_pro_subscription(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'RA Pro Firm',
  'sub_test_1',
  'cus_test_1',
  'flat',
  'monthly',
  'pilot'
) AS service_role_replay;
RESET ROLE;

-- Conflicting subscription fails closed
DO $$
BEGIN
  PERFORM public.activate_review_assist_pro_subscription(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'RA Pro Firm',
    'sub_OTHER',
    'cus_test_1',
    'flat',
    'monthly',
    'pilot'
  );
  RAISE EXCEPTION 'conflict_should_fail';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM = 'conflict_should_fail' THEN RAISE; END IF;
    IF SQLERRM NOT LIKE '%activate_ra_pro_subscription_conflict%' THEN
      RAISE EXCEPTION 'unexpected_conflict_error: %', SQLERRM;
    END IF;
END $$;

-- Duplicate firm for same billing company fails unique
DO $$
BEGIN
  INSERT INTO public.firms (name, billing_company_id)
  VALUES ('Dup', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  RAISE EXCEPTION 'unique_should_fail';
EXCEPTION
  WHEN unique_violation THEN NULL;
  WHEN OTHERS THEN
    IF SQLERRM = 'unique_should_fail' THEN RAISE; END IF;
END $$;

-- Client cap 2
INSERT INTO public.firm_clients (firm_id, company_id, name, subscription_status)
SELECT f.id, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'C1', 'active'
FROM public.firms f WHERE f.billing_company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

INSERT INTO public.firm_clients (firm_id, company_id, name, subscription_status)
SELECT f.id, 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'C2', 'active'
FROM public.firms f WHERE f.billing_company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

DO $$
DECLARE
  v_firm uuid;
BEGIN
  SELECT id INTO v_firm FROM public.firms WHERE billing_company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  BEGIN
    INSERT INTO public.firm_clients (firm_id, company_id, name, subscription_status)
    VALUES (v_firm, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'C3', 'active');
    RAISE EXCEPTION 'client_cap_should_fail';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'client_cap_should_fail' THEN RAISE; END IF;
      IF SQLERRM NOT LIKE '%ra_pro_client_cap_reached%' THEN
        RAISE EXCEPTION 'unexpected_client_cap_error: %', SQLERRM;
      END IF;
  END;
END $$;

-- Fill pilot slots 2-10 then reject 11 (postgres trusted role; buyers are company members)
DO $$
DECLARE
  i int;
  cid uuid;
  uid uuid;
BEGIN
  FOR i IN 2..10 LOOP
    cid := gen_random_uuid();
    uid := gen_random_uuid();
    INSERT INTO public.companies (id, name) VALUES (cid, 'Pilot' || i);
    INSERT INTO public.company_users (company_id, user_id, role, status)
    VALUES (cid, uid, 'admin', 'active');
    PERFORM public.activate_review_assist_pro_subscription(
      cid,
      uid,
      'Firm ' || i,
      'sub_pilot_' || i,
      'cus_pilot_' || i,
      'flat',
      'monthly',
      'pilot'
    );
  END LOOP;
END $$;

DO $$
DECLARE
  cid uuid := gen_random_uuid();
  uid uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.companies (id, name) VALUES (cid, 'Pilot11');
  INSERT INTO public.company_users (company_id, user_id, role, status)
  VALUES (cid, uid, 'admin', 'active');
  BEGIN
    PERFORM public.activate_review_assist_pro_subscription(
      cid,
      uid,
      'Firm 11',
      'sub_pilot_11',
      'cus_pilot_11',
      'flat',
      'monthly',
      'pilot'
    );
    RAISE EXCEPTION 'pilot11_should_fail';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'pilot11_should_fail' THEN RAISE; END IF;
      IF SQLERRM NOT LIKE '%pilot_cap_reached%' THEN
        RAISE EXCEPTION 'unexpected_pilot_cap_error: %', SQLERRM;
      END IF;
  END;
END $$;

-- ON DELETE RESTRICT
DO $$
BEGIN
  BEGIN
    DELETE FROM public.companies WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    RAISE EXCEPTION 'delete_should_restrict';
  EXCEPTION
    WHEN foreign_key_violation THEN NULL;
    WHEN OTHERS THEN
      IF SQLERRM = 'delete_should_restrict' THEN RAISE; END IF;
  END;
END $$;

RESET ROLE;

SELECT 'REHEARSAL_OK' AS result;
