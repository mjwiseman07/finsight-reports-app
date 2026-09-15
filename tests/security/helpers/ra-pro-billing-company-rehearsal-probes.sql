-- Disposable rehearsal probes for 20260915004500_ra_pro_firm_billing_company_id
-- Applied after bootstrap + migration in local docker only.

INSERT INTO public.companies (id, name) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BillCo'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'OtherCo')
ON CONFLICT DO NOTHING;

INSERT INTO public.firms (id, name) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'LegacyFirm')
ON CONFLICT DO NOTHING;

-- Existing row remains null
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.firms
    WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
      AND billing_company_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'legacy_firm_not_null';
  END IF;
END $$;

-- Authenticated cannot set billing_company_id even with a permissive UPDATE policy
SET ROLE postgres;
DROP POLICY IF EXISTS firms_auth_update_rehearsal ON public.firms;
CREATE POLICY firms_auth_update_rehearsal ON public.firms
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
DO $$
BEGIN
  UPDATE public.firms
  SET billing_company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  RAISE EXCEPTION 'authenticated_update_should_fail';
EXCEPTION
  WHEN insufficient_privilege THEN NULL;
  WHEN OTHERS THEN
    IF SQLERRM = 'authenticated_update_should_fail' THEN RAISE; END IF;
    -- billing_company_id_immutable / forbidden also OK
    IF SQLERRM NOT LIKE '%billing_company_id%' THEN
      RAISE EXCEPTION 'unexpected_auth_deny: %', SQLERRM;
    END IF;
END $$;
-- Name updates still allowed under rehearsal policy
UPDATE public.firms SET name = 'LegacyFirmRenamed'
WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
RESET ROLE;
SET ROLE postgres;
DROP POLICY IF EXISTS firms_auth_update_rehearsal ON public.firms;

-- service_role activation + replay
SET ROLE service_role;
SELECT set_config('request.jwt.claim.role', 'service_role', true);

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

-- Fill pilot slots 2-10 then reject 11
RESET ROLE;
DO $$
DECLARE
  i int;
  cid uuid;
BEGIN
  FOR i IN 2..10 LOOP
    cid := gen_random_uuid();
    INSERT INTO public.companies (id, name) VALUES (cid, 'Pilot' || i);
    PERFORM set_config('request.jwt.claim.role', 'service_role', true);
    -- Call as table owner; JWT claim still marks trusted server path.
    PERFORM public.activate_review_assist_pro_subscription(
      cid,
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
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
BEGIN
  INSERT INTO public.companies (id, name) VALUES (cid, 'Pilot11');
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  BEGIN
    PERFORM public.activate_review_assist_pro_subscription(
      cid,
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
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
