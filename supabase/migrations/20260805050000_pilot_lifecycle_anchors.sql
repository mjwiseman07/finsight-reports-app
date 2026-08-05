-- Phase MEM_LIFECYCLE Block 9 — RFC 3161 batch anchoring tables.
-- Two-table schema (batch + tsr) so a Merkle root anchored to N TSAs is
-- stored once. bytea for raw DER (33% smaller than base64 text, matches
-- existing sha256 bytea usage). Forward-compatible with LTA re-timestamping
-- via superseded_by_anchor_batch_id.
--
-- Filename adaptation: paste said 20260805030000 but that slot is taken by
-- Block 7 coverage_downloads AND Block 8 already shipped 20260805040000.
-- This file is 20260805050000 so it applies AFTER Block 8's issue_kind/partition
-- widening (which this migration further widens for chain.anchor).

BEGIN;

-- Parent: one row per Merkle batch (one Merkle root, N TSA responses).
CREATE TABLE IF NOT EXISTS public.pilot_lifecycle_anchor_batches (
  id                     bigserial PRIMARY KEY,
  created_at             timestamptz NOT NULL DEFAULT now(),
  batch_start_chain_seq  bigint NOT NULL,   -- first chain_seq covered (inclusive)
  batch_end_chain_seq    bigint NOT NULL,   -- last chain_seq covered (inclusive)
  leaf_count             integer NOT NULL,
  merkle_root            bytea NOT NULL,    -- sha256 root, 32 bytes
  hash_algorithm         text NOT NULL DEFAULT 'sha256',
  -- LTA / re-timestamping (Block 10+): if this batch has been re-anchored
  -- with fresh TSA timestamps, point at the newer batch. NULL = current.
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

COMMENT ON TABLE public.pilot_lifecycle_anchor_batches IS
  'Phase MEM_LIFECYCLE Block 9. One row per Merkle batch of pilot_lifecycle_events. Merkle root anchored to N TSAs via pilot_lifecycle_anchor_tsr.';
COMMENT ON COLUMN public.pilot_lifecycle_anchor_batches.merkle_root IS
  'Raw 32-byte sha256 Merkle root over row_hash values for chain_seq in [batch_start_chain_seq, batch_end_chain_seq]. Byte-identical to messageImprint.hashedMessage submitted to TSAs.';

-- Merkle leaves — one row per (batch, position). Stores the row_hash bytes
-- as they appeared in the tree. Required for the browser verifier to
-- reconstruct the O(log N) inclusion path for any target chain_seq.
CREATE TABLE IF NOT EXISTS public.pilot_lifecycle_anchor_leaves (
  batch_id         bigint NOT NULL REFERENCES public.pilot_lifecycle_anchor_batches(id) ON DELETE CASCADE,
  leaf_index       integer NOT NULL,       -- 0-based position in the tree
  chain_seq        bigint NOT NULL,        -- lookup key for verifier
  event_id         uuid NOT NULL,          -- pilot_lifecycle_events.id
  row_hash_bytes   bytea NOT NULL,         -- 32 bytes, the decoded sha256 of the row
  PRIMARY KEY (batch_id, leaf_index),
  CHECK (leaf_index >= 0),
  CHECK (octet_length(row_hash_bytes) = 32)
);

CREATE INDEX IF NOT EXISTS pilot_lifecycle_anchor_leaves_chain_seq_idx
  ON public.pilot_lifecycle_anchor_leaves (chain_seq);
CREATE INDEX IF NOT EXISTS pilot_lifecycle_anchor_leaves_event_id_idx
  ON public.pilot_lifecycle_anchor_leaves (event_id);

COMMENT ON TABLE public.pilot_lifecycle_anchor_leaves IS
  'Phase MEM_LIFECYCLE Block 9. One row per event included in a Merkle batch. Verifier reads sibling leaves (or intermediate nodes; here we store leaves and recompute internal nodes) to build the inclusion path.';

-- Child: one row per TSA response for a batch. N=2 today (DigiCert + Sectigo);
-- schema supports N=3+ (e.g. IdenTrust) without change.
CREATE TABLE IF NOT EXISTS public.pilot_lifecycle_anchor_tsr (
  id             bigserial PRIMARY KEY,
  batch_id       bigint NOT NULL REFERENCES public.pilot_lifecycle_anchor_batches(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  tsa_name       text NOT NULL,        -- 'digicert' | 'sectigo' | 'identrust'
  tsa_url        text NOT NULL,
  tsr_der        bytea NOT NULL,       -- raw DER TimeStampResp / CMS SignedData
  gen_time       timestamptz NOT NULL, -- parsed TSTInfo.genTime
  serial_number  numeric NOT NULL,     -- TSA serial can exceed bigint
  nonce          bytea,
  tsa_cert_chain bytea,                -- full DER cert chain if certReq=true
  UNIQUE (batch_id, tsa_name),
  CHECK (tsa_name IN ('digicert', 'sectigo', 'identrust'))
);

CREATE INDEX IF NOT EXISTS pilot_lifecycle_anchor_tsr_gen_time_idx
  ON public.pilot_lifecycle_anchor_tsr (gen_time DESC);

COMMENT ON TABLE public.pilot_lifecycle_anchor_tsr IS
  'Phase MEM_LIFECYCLE Block 9. One row per TSA response for a batch. Raw DER stored in bytea. Verifier reads tsr_der + tsa_cert_chain and validates against bundled TSA root certs.';

-- RLS: anchor tables are global (they span all firms/companies via a single
-- global Merkle tree). Read-only for authenticated users; only service_role
-- (via cron) may insert.
ALTER TABLE public.pilot_lifecycle_anchor_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_lifecycle_anchor_leaves  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_lifecycle_anchor_tsr     ENABLE ROW LEVEL SECURITY;

CREATE POLICY pl_anchor_batches_read ON public.pilot_lifecycle_anchor_batches
  FOR SELECT TO authenticated USING (true);
CREATE POLICY pl_anchor_leaves_read ON public.pilot_lifecycle_anchor_leaves
  FOR SELECT TO authenticated USING (true);
CREATE POLICY pl_anchor_tsr_read ON public.pilot_lifecycle_anchor_tsr
  FOR SELECT TO authenticated USING (true);

-- Widen lifecycle_issues partition CHECK to allow global-scope chain.anchor
-- events (parallel to Block 8's marketing.seo.drift widening).
ALTER TABLE public.lifecycle_issues
  DROP CONSTRAINT IF EXISTS lifecycle_issues_partition_chk;

ALTER TABLE public.lifecycle_issues
  ADD CONSTRAINT lifecycle_issues_partition_chk
  CHECK (
    company_id IS NOT NULL
    OR firm_id IS NOT NULL
    OR issue_kind IN ('marketing.seo.drift', 'pilot.lifecycle.chain.anchor')
  );

-- Widen IssueKind CHECK to include the new anchor kind.
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

-- Transactional writer for one batch + its leaves + TSRs.
-- Called from lib/pilot-lifecycle/anchor-batcher.ts. Uses SECURITY DEFINER
-- so service_role is the effective actor (RLS bypass for these tables).
-- p_merkle_root is text '\\x'||hex (PostgREST-safe); cast to bytea inside.
CREATE OR REPLACE FUNCTION public.sp_write_anchor_batch(
  p_batch_start_chain_seq bigint,
  p_batch_end_chain_seq   bigint,
  p_leaf_count            integer,
  p_merkle_root           text,     -- '\\x'||hex (PostgREST-safe); cast inside
  p_leaves                jsonb,   -- array of {leaf_index, chain_seq, event_id, row_hash_bytes(\\x hex)}
  p_tsrs                  jsonb    -- array of {tsa_name, tsa_url, tsr_der, gen_time, serial_number, nonce, tsa_cert_chain}
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

COMMIT;
