-- PROVENANCE: FETCHED_PRODUCTION_READ_ONLY
-- SOURCE_PROJECT_REF: jzmdgwwiestcmmeuhhkr
-- SOURCE_TABLE: supabase_migrations.schema_migrations
-- VERSION: 20260805005320
-- NAME: pilot_lifecycle_anchors
-- DATABASE_MD5_UTF8: 74f838e87f887acae7cfee3bc65a00cc
-- STATEMENT_COUNT: 1
-- STATEMENT_BYTE_LENGTH: 5905
-- WARNING: NOT AN APPROVED ACTIVE MIGRATION — recovered original for Option D draft replay only. Do not place in supabase/migrations/ without sign-off.
-- CONTAINS_DATA_ROWS: false
-- CONTAINS_CREDENTIALS: false
-- SUBSTITUTION: none — original statements[1] preserved in order.

-- Phase MEM_LIFECYCLE Block 9 — RFC 3161 batch anchoring tables.

CREATE TABLE IF NOT EXISTS public.pilot_lifecycle_anchor_batches (
  id                     bigserial PRIMARY KEY,
  created_at             timestamptz NOT NULL DEFAULT now(),
  batch_start_chain_seq  bigint NOT NULL,
  batch_end_chain_seq    bigint NOT NULL,
  leaf_count             integer NOT NULL,
  merkle_root            bytea NOT NULL,
  hash_algorithm         text NOT NULL DEFAULT 'sha256',
  superseded_by_anchor_batch_id bigint
    REFERENCES public.pilot_lifecycle_anchor_batches(id),
  CHECK (batch_end_chain_seq >= batch_start_chain_seq),
  CHECK (leaf_count > 0),
  CHECK (octet_length(merkle_root) = 32),
  CHECK (hash_algorithm = 'sha256')
);

CREATE INDEX IF NOT EXISTS pilot_lifecycle_anchor_batches_range_idx
  ON public.pilot_lifecycle_anchor_batches (batch_start_chain_seq, batch_end_chain_seq);
CREATE INDEX IF NOT EXISTS pilot_lifecycle_anchor_batches_end_seq_idx
  ON public.pilot_lifecycle_anchor_batches (batch_end_chain_seq DESC);

CREATE TABLE IF NOT EXISTS public.pilot_lifecycle_anchor_leaves (
  batch_id         bigint NOT NULL REFERENCES public.pilot_lifecycle_anchor_batches(id) ON DELETE CASCADE,
  leaf_index       integer NOT NULL,
  chain_seq        bigint NOT NULL,
  event_id         uuid NOT NULL,
  row_hash_bytes   bytea NOT NULL,
  PRIMARY KEY (batch_id, leaf_index),
  CHECK (leaf_index >= 0),
  CHECK (octet_length(row_hash_bytes) = 32)
);

CREATE INDEX IF NOT EXISTS pilot_lifecycle_anchor_leaves_chain_seq_idx
  ON public.pilot_lifecycle_anchor_leaves (chain_seq);
CREATE INDEX IF NOT EXISTS pilot_lifecycle_anchor_leaves_event_id_idx
  ON public.pilot_lifecycle_anchor_leaves (event_id);

CREATE TABLE IF NOT EXISTS public.pilot_lifecycle_anchor_tsr (
  id             bigserial PRIMARY KEY,
  batch_id       bigint NOT NULL REFERENCES public.pilot_lifecycle_anchor_batches(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  tsa_name       text NOT NULL,
  tsa_url        text NOT NULL,
  tsr_der        bytea NOT NULL,
  gen_time       timestamptz NOT NULL,
  serial_number  numeric NOT NULL,
  nonce          bytea,
  tsa_cert_chain bytea,
  UNIQUE (batch_id, tsa_name),
  CHECK (tsa_name IN ('digicert', 'sectigo', 'identrust'))
);

CREATE INDEX IF NOT EXISTS pilot_lifecycle_anchor_tsr_gen_time_idx
  ON public.pilot_lifecycle_anchor_tsr (gen_time DESC);

ALTER TABLE public.pilot_lifecycle_anchor_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_lifecycle_anchor_leaves  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_lifecycle_anchor_tsr     ENABLE ROW LEVEL SECURITY;

CREATE POLICY pl_anchor_batches_read ON public.pilot_lifecycle_anchor_batches
  FOR SELECT TO authenticated USING (true);
CREATE POLICY pl_anchor_leaves_read ON public.pilot_lifecycle_anchor_leaves
  FOR SELECT TO authenticated USING (true);
CREATE POLICY pl_anchor_tsr_read ON public.pilot_lifecycle_anchor_tsr
  FOR SELECT TO authenticated USING (true);

ALTER TABLE public.lifecycle_issues
  DROP CONSTRAINT IF EXISTS lifecycle_issues_partition_chk;

ALTER TABLE public.lifecycle_issues
  ADD CONSTRAINT lifecycle_issues_partition_chk
  CHECK (
    company_id IS NOT NULL
    OR firm_id IS NOT NULL
    OR issue_kind IN ('marketing.seo.drift', 'pilot.lifecycle.chain.anchor')
  );

ALTER TABLE public.lifecycle_issues
  DROP CONSTRAINT IF EXISTS lifecycle_issues_issue_kind_chk;

ALTER TABLE public.lifecycle_issues
  ADD CONSTRAINT lifecycle_issues_issue_kind_chk
  CHECK (issue_kind IN (
    'pilot.lifecycle.drift.detected',
    'pilot.lifecycle.transition.rejected',
    'pilot.lifecycle.chain.integrity.broken',
    'pilot.lifecycle.monitor.error',
    'pilot.lifecycle.chain.anchor',
    'marketing.seo.drift'
  ));

CREATE OR REPLACE FUNCTION public.sp_write_anchor_batch(
  p_batch_start_chain_seq bigint,
  p_batch_end_chain_seq   bigint,
  p_leaf_count            integer,
  p_merkle_root           text,
  p_leaves                jsonb,
  p_tsrs                  jsonb
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_batch_id bigint;
  v_leaf     jsonb;
  v_tsr      jsonb;
  v_root     bytea;
BEGIN
  v_root := decode(replace(p_merkle_root, E'\\x', ''), 'hex');

  INSERT INTO public.pilot_lifecycle_anchor_batches(
    batch_start_chain_seq, batch_end_chain_seq, leaf_count, merkle_root
  ) VALUES (
    p_batch_start_chain_seq, p_batch_end_chain_seq, p_leaf_count, v_root
  )
  RETURNING id INTO v_batch_id;

  FOR v_leaf IN SELECT * FROM jsonb_array_elements(p_leaves) LOOP
    INSERT INTO public.pilot_lifecycle_anchor_leaves(
      batch_id, leaf_index, chain_seq, event_id, row_hash_bytes
    ) VALUES (
      v_batch_id,
      (v_leaf->>'leaf_index')::integer,
      (v_leaf->>'chain_seq')::bigint,
      (v_leaf->>'event_id')::uuid,
      decode(replace(v_leaf->>'row_hash_bytes', E'\\x', ''), 'hex')
    );
  END LOOP;

  FOR v_tsr IN SELECT * FROM jsonb_array_elements(p_tsrs) LOOP
    INSERT INTO public.pilot_lifecycle_anchor_tsr(
      batch_id, tsa_name, tsa_url, tsr_der, gen_time,
      serial_number, nonce, tsa_cert_chain
    ) VALUES (
      v_batch_id,
      v_tsr->>'tsa_name',
      v_tsr->>'tsa_url',
      decode(replace(v_tsr->>'tsr_der', E'\\x', ''), 'hex'),
      (v_tsr->>'gen_time')::timestamptz,
      (v_tsr->>'serial_number')::numeric,
      CASE WHEN v_tsr->>'nonce' IS NULL THEN NULL
           ELSE decode(replace(v_tsr->>'nonce', E'\\x', ''), 'hex') END,
      CASE WHEN v_tsr->>'tsa_cert_chain' IS NULL THEN NULL
           ELSE decode(replace(v_tsr->>'tsa_cert_chain', E'\\x', ''), 'hex') END
    );
  END LOOP;

  RETURN v_batch_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sp_write_anchor_batch(bigint,bigint,integer,text,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sp_write_anchor_batch(bigint,bigint,integer,text,jsonb,jsonb) TO service_role;