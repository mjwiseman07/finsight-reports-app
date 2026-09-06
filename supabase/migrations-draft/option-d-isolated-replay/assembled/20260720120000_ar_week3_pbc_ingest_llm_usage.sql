-- Week 3 Block 3 — PBC ingest + LLM usage tracking + PII redaction maps
-- ADDITIVE ONLY. No modifications to existing tables.
-- Adapted: uses company_users / firm_memberships (repo schema).

BEGIN;

-- ============================================================================
-- 1) audit_ready_pbc_uploads — raw uploaded documents (before parse)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_ready_pbc_uploads (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id          uuid NOT NULL REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  uploaded_by_user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  storage_bucket         text NOT NULL DEFAULT 'audit-ready-pbc',
  storage_path           text NOT NULL,
  original_filename      text NOT NULL,
  content_type           text NOT NULL,
  size_bytes             bigint NOT NULL,
  file_sha256            text NOT NULL,
  status                 text NOT NULL DEFAULT 'uploaded'
                         CHECK (status IN ('uploaded','parsing','parsed','failed','rejected')),
  parse_started_at       timestamptz NULL,
  parse_completed_at     timestamptz NULL,
  parse_error            text NULL,
  extracted_request_count integer NOT NULL DEFAULT 0,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (engagement_id, file_sha256)
);

CREATE INDEX IF NOT EXISTS idx_ar_pbc_uploads_engagement
  ON public.audit_ready_pbc_uploads(engagement_id);
CREATE INDEX IF NOT EXISTS idx_ar_pbc_uploads_status
  ON public.audit_ready_pbc_uploads(engagement_id, status);

ALTER TABLE public.audit_ready_pbc_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ar_pbc_uploads_service_role_all ON public.audit_ready_pbc_uploads;
CREATE POLICY ar_pbc_uploads_service_role_all ON public.audit_ready_pbc_uploads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ar_pbc_uploads_engagement_all ON public.audit_ready_pbc_uploads;
CREATE POLICY ar_pbc_uploads_engagement_all ON public.audit_ready_pbc_uploads
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_pbc_uploads.engagement_id
        AND (
          (e.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'
              AND cu.role IN ('company_admin','owner_executive','controller')))
          OR
          (e.firm_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'
              AND fm.role IN ('firm_admin','controller','fractional_cfo')))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_pbc_uploads.engagement_id
        AND (
          (e.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'
              AND cu.role IN ('company_admin','owner_executive','controller')))
          OR
          (e.firm_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'
              AND fm.role IN ('firm_admin','controller','fractional_cfo')))
        )
    )
  );

-- ============================================================================
-- 2) audit_ready_llm_usage — every Bedrock call, engagement-scoped
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_ready_llm_usage (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id            uuid NOT NULL REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  operation                text NOT NULL CHECK (operation IN (
    'pbc_parse','assertion_classify','pii_redaction_ner',
    'response_draft','evidence_bundle_summary','tieout_explain'
  )),
  model_id                 text NOT NULL,
  model_family             text NOT NULL CHECK (model_family IN ('sonnet','haiku','other')),
  prompt_tokens            integer NOT NULL DEFAULT 0,
  completion_tokens        integer NOT NULL DEFAULT 0,
  total_tokens             integer GENERATED ALWAYS AS (prompt_tokens + completion_tokens) STORED,
  cost_usd_cents           integer NOT NULL DEFAULT 0,
  latency_ms               integer NULL,
  zero_retention_flag      boolean NOT NULL DEFAULT true,
  redaction_map_id         uuid NULL,
  called_by_user_id        uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  request_hash             text NOT NULL,
  success                  boolean NOT NULL,
  error_code               text NULL,
  called_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ar_llm_usage_engagement
  ON public.audit_ready_llm_usage(engagement_id, called_at DESC);
CREATE INDEX IF NOT EXISTS idx_ar_llm_usage_engagement_operation
  ON public.audit_ready_llm_usage(engagement_id, operation);
CREATE INDEX IF NOT EXISTS idx_ar_llm_usage_engagement_success
  ON public.audit_ready_llm_usage(engagement_id, success);

ALTER TABLE public.audit_ready_llm_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ar_llm_usage_service_role_all ON public.audit_ready_llm_usage;
CREATE POLICY ar_llm_usage_service_role_all ON public.audit_ready_llm_usage
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ar_llm_usage_engagement_read ON public.audit_ready_llm_usage;
CREATE POLICY ar_llm_usage_engagement_read ON public.audit_ready_llm_usage
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_llm_usage.engagement_id
        AND (
          (e.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'))
          OR
          (e.firm_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'))
        )
    )
  );

-- ============================================================================
-- 3) audit_ready_pii_redaction_maps — engagement-scoped, encrypted at rest
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_ready_pii_redaction_maps (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id         uuid NOT NULL REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  source_upload_id      uuid NULL REFERENCES public.audit_ready_pbc_uploads(id) ON DELETE CASCADE,
  redaction_map_hash    text NOT NULL,
  entity_count          integer NOT NULL DEFAULT 0,
  entity_categories     text[] NOT NULL DEFAULT '{}',
  encrypted_map_ciphertext text NOT NULL,
  encryption_key_ref    text NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (engagement_id, redaction_map_hash)
);

CREATE INDEX IF NOT EXISTS idx_ar_pii_maps_engagement
  ON public.audit_ready_pii_redaction_maps(engagement_id);

ALTER TABLE public.audit_ready_pii_redaction_maps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ar_pii_maps_service_role_all ON public.audit_ready_pii_redaction_maps;
CREATE POLICY ar_pii_maps_service_role_all ON public.audit_ready_pii_redaction_maps
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Deliberately no authenticated policy — redaction maps are service-role only.

-- ============================================================================
-- 4) increment_pbc_request_count RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.increment_pbc_request_count(
  p_engagement_id uuid,
  p_delta integer
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.audit_ready_engagements
  SET pbc_request_count = pbc_request_count + p_delta,
      updated_at = now()
  WHERE id = p_engagement_id;
$$;

REVOKE ALL ON FUNCTION public.increment_pbc_request_count(uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.increment_pbc_request_count(uuid, integer) TO service_role;

-- ============================================================================
-- 5) Storage bucket for PBC uploads
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audit-ready-pbc',
  'audit-ready-pbc',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/msword',
    'message/rfc822',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS ar_pbc_storage_engagement_write ON storage.objects;
CREATE POLICY ar_pbc_storage_engagement_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'audit-ready-pbc'
    AND EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE (storage.foldername(name))[1] = e.id::text
        AND (
          (e.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'
              AND cu.role IN ('company_admin','owner_executive','controller')))
          OR
          (e.firm_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'
              AND fm.role IN ('firm_admin','controller','fractional_cfo')))
        )
    )
  );

DROP POLICY IF EXISTS ar_pbc_storage_engagement_read ON storage.objects;
CREATE POLICY ar_pbc_storage_engagement_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'audit-ready-pbc'
    AND EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE (storage.foldername(name))[1] = e.id::text
        AND (
          (e.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'))
          OR
          (e.firm_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'))
        )
    )
  );

COMMIT;
