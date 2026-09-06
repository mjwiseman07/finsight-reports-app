-- URM-3.2: Require non-null content_hash when storage_path is set.
-- Corrective only — does NOT alter already-applied:
--   20260815120000_urm3_universal_evidence_spine.sql
--   20260815130000_urm3_hash_normalization_order.sql
--
-- Live defect: CHECK was
--   storage_path IS NULL OR content_hash ~ '^[a-f0-9]{64}$'
-- In PostgreSQL, CHECK fails only on FALSE; NULL passes, so
-- storage_path SET + content_hash NULL slipped through.
--
-- READY ONLY — do not apply until authorized after PR review.

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  DROP CONSTRAINT IF EXISTS arte_storage_requires_content_hash;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD CONSTRAINT arte_storage_requires_content_hash
  CHECK (
    storage_path IS NULL
    OR (
      content_hash IS NOT NULL
      AND content_hash ~ '^[a-f0-9]{64}$'
    )
  );

COMMENT ON CONSTRAINT arte_storage_requires_content_hash
  ON public.audit_ready_tie_out_variance_evidence IS
  'URM-3.2: storage-backed evidence requires a non-null SHA-256 hex content_hash (NULL regex no longer passes CHECK).';
