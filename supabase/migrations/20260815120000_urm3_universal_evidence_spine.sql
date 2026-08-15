-- URM-3: Universal reconciliation evidence spine.
-- Additive only. Reuses audit_ready_tie_out_variance_evidence (no new evidence table).
--
-- Locks:
-- - Evidence attaches to Identified Reconciling Items (and optionally measurement variances).
-- - Evidence NEVER authors GL/subledger balances or changes unidentified residual math.
-- - GRNI continues to write variance-only evidence rows (variance_id set, reconciling_item_id null).
-- - URM-2 evidence_ids[] remains a denormalized cache; FK reconciling_item_id is source of truth.
-- - content_hash is SHA-256 hex (64 lowercase [a-f0-9]) when present; required for storage_path rows.
--
-- READY ONLY — do not apply to production until authorized live smoke.

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1) Link evidence → reconciling items; relax variance-only requirement
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD COLUMN IF NOT EXISTS reconciling_item_id uuid NULL
    REFERENCES public.audit_ready_reconciling_items(id) ON DELETE CASCADE;

-- Legacy GRNI/AR/AP evidence always had variance_id. Third-party item evidence may
-- attach to a reconciling item without a measurement variance row.
ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ALTER COLUMN variance_id DROP NOT NULL;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  DROP CONSTRAINT IF EXISTS arte_variance_or_item_required;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD CONSTRAINT arte_variance_or_item_required
  CHECK (variance_id IS NOT NULL OR reconciling_item_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_arte_reconciling_item_id
  ON public.audit_ready_tie_out_variance_evidence(reconciling_item_id)
  WHERE reconciling_item_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 2) Expand source_kind + provider-neutral / third-party fields
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.audit_ready_tie_out_variance_evidence
  DROP CONSTRAINT IF EXISTS audit_ready_tie_out_variance_evidence_source_kind_check;

-- Discover legacy check name if auto-generated differently
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.audit_ready_tie_out_variance_evidence'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%source_kind%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.audit_ready_tie_out_variance_evidence DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD CONSTRAINT audit_ready_tie_out_variance_evidence_source_kind_check
  CHECK (source_kind IN (
    -- Legacy QBO measurement kinds (GRNI / AR / AP / Inventory)
    'bill',
    'invoice',
    'inventory_adjustment',
    -- Provider-neutral / third-party spine (URM-3 lock)
    'bank_statement',
    'vendor_statement',
    'customer_statement',
    'confirmation',
    'count_sheet',
    'amort_schedule',
    'reserve_model',
    'fixed_asset_register',
    'debt_statement',
    'tax_document',
    'lease_schedule',
    'system_generated_schedule',
    'provider_txn',
    'pbc_upload',
    'manual_attachment'
  ));

-- Provider-neutral identity (source_qbo_id remains for GRNI; nullable for third-party).
ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ALTER COLUMN source_qbo_id DROP NOT NULL;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD COLUMN IF NOT EXISTS provider text NULL;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  DROP CONSTRAINT IF EXISTS audit_ready_tie_out_variance_evidence_provider_check;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD CONSTRAINT audit_ready_tie_out_variance_evidence_provider_check
  CHECK (
    provider IS NULL
    OR provider IN ('quickbooks', 'xero', 'external', 'system', 'manual')
  );

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD COLUMN IF NOT EXISTS external_ref text NULL;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD COLUMN IF NOT EXISTS storage_path text NULL;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD COLUMN IF NOT EXISTS content_hash text NULL;

-- Workpaper / document display metadata (URM-3 lock)
ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD COLUMN IF NOT EXISTS file_name text NULL;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD COLUMN IF NOT EXISTS content_type text NULL;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD COLUMN IF NOT EXISTS source_date date NULL;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD COLUMN IF NOT EXISTS fetched_at timestamptz NULL;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  DROP CONSTRAINT IF EXISTS arte_source_identity_required;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD CONSTRAINT arte_source_identity_required
  CHECK (
    source_qbo_id IS NOT NULL
    OR external_ref IS NOT NULL
    OR storage_path IS NOT NULL
  );

-- Integrity hash: Advisacor convention = sha256 hex digest (64 lowercase hex),
-- same as upload-artifact / FA / BS recon artifact writers.
ALTER TABLE public.audit_ready_tie_out_variance_evidence
  DROP CONSTRAINT IF EXISTS arte_content_hash_sha256_hex;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD CONSTRAINT arte_content_hash_sha256_hex
  CHECK (
    content_hash IS NULL
    OR content_hash ~ '^[a-f0-9]{64}$'
  );

-- Uploaded/static storage evidence must carry a real integrity hash.
ALTER TABLE public.audit_ready_tie_out_variance_evidence
  DROP CONSTRAINT IF EXISTS arte_storage_requires_content_hash;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD CONSTRAINT arte_storage_requires_content_hash
  CHECK (
    storage_path IS NULL
    OR content_hash ~ '^[a-f0-9]{64}$'
  );

-- Idempotency for item-linked hashed documents (retry-safe).
CREATE UNIQUE INDEX IF NOT EXISTS uq_arte_item_content_hash
  ON public.audit_ready_tie_out_variance_evidence(reconciling_item_id, content_hash)
  WHERE reconciling_item_id IS NOT NULL AND content_hash IS NOT NULL;

-- Document / third-party rows may carry zero contribution cents.
-- Keep total/subtotal/balance NOT NULL (callers pass 0).

CREATE INDEX IF NOT EXISTS idx_arte_provider_external_ref
  ON public.audit_ready_tie_out_variance_evidence(provider, external_ref)
  WHERE external_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_arte_content_hash
  ON public.audit_ready_tie_out_variance_evidence(content_hash)
  WHERE content_hash IS NOT NULL;

COMMENT ON COLUMN public.audit_ready_tie_out_variance_evidence.reconciling_item_id IS
  'URM-3: optional FK to identified reconciling item. Source of truth for item↔evidence; URM-2 evidence_ids[] is denormalized repairable cache.';
COMMENT ON COLUMN public.audit_ready_tie_out_variance_evidence.provider IS
  'URM-3: quickbooks | xero | external | system | manual. Null allowed for legacy GRNI rows.';
COMMENT ON COLUMN public.audit_ready_tie_out_variance_evidence.external_ref IS
  'URM-3: provider-neutral external id (replaces sole reliance on source_qbo_id for non-QBO evidence).';
COMMENT ON COLUMN public.audit_ready_tie_out_variance_evidence.storage_path IS
  'URM-3: uploaded third-party document path (PBC / statement / confirmation). Requires content_hash.';
COMMENT ON COLUMN public.audit_ready_tie_out_variance_evidence.content_hash IS
  'URM-3: SHA-256 of attached document bytes as 64 lowercase hex (createHash("sha256").digest("hex")). Fail-closed format. Does not affect recon math.';
COMMENT ON COLUMN public.audit_ready_tie_out_variance_evidence.file_name IS
  'URM-3: original file name for workpaper display.';
COMMENT ON COLUMN public.audit_ready_tie_out_variance_evidence.content_type IS
  'URM-3: MIME type for workpaper display (e.g. application/pdf).';
COMMENT ON COLUMN public.audit_ready_tie_out_variance_evidence.source_date IS
  'URM-3: document/source as-of date (statement period end, confirmation date, etc.).';
COMMENT ON COLUMN public.audit_ready_tie_out_variance_evidence.fetched_at IS
  'URM-3: when the evidence bytes/metadata were fetched or uploaded.';

COMMENT ON TABLE public.audit_ready_tie_out_variance_evidence IS
  'URM-3 universal evidence spine (extends PBC-TIEOUT-3.4). Measurement variance and/or identified reconciling item evidence. Never authors residual/outcome math.';

-- ─────────────────────────────────────────────────────────────
-- 3) Same-run integrity stamp (run + engagement from item/variance)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_arte_stamp_run_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  v_engagement_id uuid;
  v_item_run_id uuid;
  v_var_run_id uuid;
BEGIN
  IF NEW.reconciling_item_id IS NOT NULL THEN
    SELECT i.run_id, i.engagement_id
      INTO v_item_run_id, v_engagement_id
    FROM public.audit_ready_reconciling_items i
    WHERE i.id = NEW.reconciling_item_id;

    IF v_item_run_id IS NULL THEN
      RAISE EXCEPTION 'urm3_reconciling_item_not_found';
    END IF;

    v_run_id := v_item_run_id;
    NEW.run_id := v_item_run_id;
    NEW.engagement_id := v_engagement_id;
  END IF;

  IF NEW.variance_id IS NOT NULL THEN
    SELECT v.run_id, v.engagement_id
      INTO v_var_run_id, v_engagement_id
    FROM public.audit_ready_tie_out_variances v
    WHERE v.id = NEW.variance_id;

    IF v_var_run_id IS NULL THEN
      RAISE EXCEPTION 'urm3_variance_not_found';
    END IF;

    IF v_run_id IS NOT NULL AND v_run_id <> v_var_run_id THEN
      RAISE EXCEPTION 'urm3_cross_run_evidence_forbidden';
    END IF;

    NEW.run_id := v_var_run_id;
    NEW.engagement_id := v_engagement_id;
  END IF;

  -- Normalize content_hash when provided (lowercase; strip optional sha256: prefix).
  IF NEW.content_hash IS NOT NULL THEN
    NEW.content_hash := lower(regexp_replace(btrim(NEW.content_hash), '^sha256:', ''));
    IF NEW.content_hash !~ '^[a-f0-9]{64}$' THEN
      RAISE EXCEPTION 'urm3_invalid_content_hash';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_arte_stamp_run_identity
  ON public.audit_ready_tie_out_variance_evidence;
CREATE TRIGGER trg_arte_stamp_run_identity
  BEFORE INSERT OR UPDATE OF variance_id, reconciling_item_id, run_id, engagement_id, content_hash
  ON public.audit_ready_tie_out_variance_evidence
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_arte_stamp_run_identity();

REVOKE ALL ON FUNCTION public.trg_arte_stamp_run_identity()
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.trg_arte_stamp_run_identity() IS
  'URM-3: stamps evidence run/engagement from variance and/or reconciling item; forbids cross-run linkage; normalizes/validates content_hash.';

-- ─────────────────────────────────────────────────────────────
-- 4) RLS — explicit engagement membership (cross-engagement denied)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "arte_select_via_variance" ON public.audit_ready_tie_out_variance_evidence;
DROP POLICY IF EXISTS arte_select_engagement_read ON public.audit_ready_tie_out_variance_evidence;
CREATE POLICY arte_select_engagement_read
  ON public.audit_ready_tie_out_variance_evidence
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_tie_out_variance_evidence.engagement_id
        AND (
          (e.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'
          ))
          OR
          (e.firm_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'
          ))
        )
    )
  );

-- Explicit service_role write policy (mirrors reconciling_items).
DROP POLICY IF EXISTS arte_service_role_all ON public.audit_ready_tie_out_variance_evidence;
CREATE POLICY arte_service_role_all
  ON public.audit_ready_tie_out_variance_evidence
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
