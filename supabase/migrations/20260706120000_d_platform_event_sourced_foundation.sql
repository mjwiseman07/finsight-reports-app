-- Phase D-Platform: Event-Sourced Ledger Foundation
-- Migration: 20260706120000_d_platform_event_sourced_foundation
-- Base commit: 4268659
-- Additive-only. No existing tables modified except je_posting_audit CHECK.

BEGIN;

-- ============================================================================
-- 1. pgvector extension for AI-native queries (populated by later phases)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 2. Firm hierarchy expansion — engagements + portcos
--    Unified model: firms → clients (bookkeeping)
--                    firms → engagements → portcos (CFO firms)
--                    direct owner (no firm) still supported via firm_clients.firm_id nullable
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.engagements (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                UUID NOT NULL REFERENCES public.firms(id) ON DELETE RESTRICT,
  engagement_name        TEXT NOT NULL,
  engagement_type        TEXT NOT NULL CHECK (engagement_type IN ('bookkeeping','fractional_cfo','audit_prep','tax_prep','advisory','one_time')),
  status                 TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('prospect','onboarding','active','paused','offboarded','completed')),
  start_date             DATE,
  end_date               DATE,
  monthly_fee_cents      BIGINT,
  scope_json             JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by             TEXT,
  UNIQUE (firm_id, engagement_name)
);
CREATE INDEX IF NOT EXISTS idx_engagements_firm ON public.engagements(firm_id);
CREATE INDEX IF NOT EXISTS idx_engagements_status ON public.engagements(status) WHERE status='active';

CREATE TABLE IF NOT EXISTS public.portcos (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id          UUID NOT NULL REFERENCES public.engagements(id) ON DELETE RESTRICT,
  firm_client_id         UUID REFERENCES public.firm_clients(id) ON DELETE SET NULL,
  portco_name            TEXT NOT NULL,
  legal_name             TEXT,
  ein                    TEXT,
  sector                 TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (engagement_id, portco_name)
);
CREATE INDEX IF NOT EXISTS idx_portcos_engagement ON public.portcos(engagement_id);
CREATE INDEX IF NOT EXISTS idx_portcos_firm_client ON public.portcos(firm_client_id) WHERE firm_client_id IS NOT NULL;

COMMENT ON TABLE public.engagements IS 'CFO firm / accounting firm engagement lifecycle. Firms without engagements (pure bookkeeping) do not need rows here.';
COMMENT ON TABLE public.portcos IS 'Portfolio companies under a CFO engagement. Each portco can optionally link to a firm_client for QBO connection.';

-- ============================================================================
-- 3. ledger_events — immutable append-only event log
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ledger_events (
  event_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_sequence         BIGINT NOT NULL GENERATED ALWAYS AS IDENTITY,
  event_type             TEXT NOT NULL,
  event_category         TEXT NOT NULL CHECK (event_category IN (
    'intake',             -- Universal Intake events (bill received, remit received, doc received)
    'ledger',             -- JE posted, JE reversed, account balance changed
    'cash_app',           -- Payment matched, payment unapplied, remittance parsed
    'ar',                 -- Invoice sent, reminder sent, aging changed
    'ap',                 -- Bill approved, bill paid, accrual created
    'recon',              -- Reconciliation performed, variance detected
    'close',              -- Period opened, period locked, close packet generated
    'assertion',          -- Assertion coverage computed, gap detected, gap remediated
    'rule',               -- Rule fired, rule proposed JE
    'directive',          -- Client directive applied
    'ai_action',          -- LLM took an action
    'system'              -- Health, sync, error
  )),
  event_version          INTEGER NOT NULL DEFAULT 1,  -- Schema version for event_payload
  firm_id                UUID REFERENCES public.firms(id) ON DELETE RESTRICT,
  firm_client_id         UUID REFERENCES public.firm_clients(id) ON DELETE RESTRICT,
  engagement_id          UUID REFERENCES public.engagements(id) ON DELETE RESTRICT,
  portco_id              UUID REFERENCES public.portcos(id) ON DELETE RESTRICT,
  close_period_id        TEXT,  -- Nullable; not all events are close-period-scoped
  aggregate_type         TEXT NOT NULL,  -- 'bill', 'invoice', 'payment', 'je', 'account', etc.
  aggregate_id           TEXT NOT NULL,  -- Domain-key of the thing this event is about
  actor_type             TEXT NOT NULL CHECK (actor_type IN ('user','system','ai_agent','integration','rule','recurring')),
  actor_id               TEXT,  -- User email, system component name, agent name
  event_payload          JSONB NOT NULL,
  event_metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Correlation IDs, request IDs, trace IDs
  causation_event_id     UUID REFERENCES public.ledger_events(event_id),  -- What event caused this event
  correlation_id         UUID,  -- Groups related events into a business transaction
  occurred_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- Always NOW() at insert
  CONSTRAINT ledger_events_scope_check CHECK (
    -- Must be scoped to at least one of: firm, firm_client, engagement, portco
    firm_id IS NOT NULL OR firm_client_id IS NOT NULL OR engagement_id IS NOT NULL OR portco_id IS NOT NULL
  )
);

-- Enforce immutability: no UPDATE, no DELETE
CREATE OR REPLACE FUNCTION public.ledger_events_prevent_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ledger_events is append-only; UPDATE/DELETE is forbidden';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_events_no_update
  BEFORE UPDATE ON public.ledger_events
  FOR EACH ROW EXECUTE FUNCTION public.ledger_events_prevent_mutation();

CREATE TRIGGER ledger_events_no_delete
  BEFORE DELETE ON public.ledger_events
  FOR EACH ROW EXECUTE FUNCTION public.ledger_events_prevent_mutation();

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_ledger_events_aggregate
  ON public.ledger_events(aggregate_type, aggregate_id, event_sequence);
CREATE INDEX IF NOT EXISTS idx_ledger_events_firm_client_time
  ON public.ledger_events(firm_client_id, occurred_at DESC)
  WHERE firm_client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ledger_events_close_period
  ON public.ledger_events(close_period_id, event_category)
  WHERE close_period_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ledger_events_correlation
  ON public.ledger_events(correlation_id)
  WHERE correlation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ledger_events_category_time
  ON public.ledger_events(event_category, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_events_type_time
  ON public.ledger_events(event_type, occurred_at DESC);

-- Notify listeners on every insert
CREATE OR REPLACE FUNCTION public.ledger_events_notify()
RETURNS TRIGGER AS $$
DECLARE
  channel_name TEXT;
BEGIN
  channel_name := 'ledger_events_' || NEW.event_category;
  PERFORM pg_notify(channel_name, json_build_object(
    'event_id', NEW.event_id,
    'event_sequence', NEW.event_sequence,
    'event_type', NEW.event_type,
    'firm_client_id', NEW.firm_client_id,
    'aggregate_type', NEW.aggregate_type,
    'aggregate_id', NEW.aggregate_id,
    'occurred_at', NEW.occurred_at
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_events_notify_trigger
  AFTER INSERT ON public.ledger_events
  FOR EACH ROW EXECUTE FUNCTION public.ledger_events_notify();

COMMENT ON TABLE public.ledger_events IS 'Immutable append-only event log. Every state change in Advisacor is emitted here. Projections derive from this stream.';

-- ============================================================================
-- 4. event_projections — registry of projection workers + their positions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.event_projections (
  projection_name        TEXT PRIMARY KEY,
  description            TEXT,
  event_categories       TEXT[] NOT NULL,  -- Which categories this projection subscribes to
  last_processed_seq     BIGINT NOT NULL DEFAULT 0,
  processed_count        BIGINT NOT NULL DEFAULT 0,
  error_count            BIGINT NOT NULL DEFAULT 0,
  last_error             TEXT,
  last_error_at          TIMESTAMPTZ,
  status                 TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','error','rebuilding')),
  worker_lock_holder     TEXT,  -- Which worker instance currently holds the lock
  worker_lock_expires_at TIMESTAMPTZ,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.event_projections IS 'Registry of projection workers. Each row tracks how far a projection has caught up in the event stream.';

-- ============================================================================
-- 5. ai_action_log — every LLM-driven system action logged
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_action_log (
  action_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_client_id         UUID REFERENCES public.firm_clients(id) ON DELETE RESTRICT,
  action_type            TEXT NOT NULL,  -- 'ocr_extract', 'cash_app_reason', 'dunning_draft', 'assertion_reason', etc.
  action_category        TEXT NOT NULL CHECK (action_category IN (
    'intake_ocr','intake_classify','cash_app_reasoning','ar_dunning_draft',
    'assertion_reasoning','je_proposal','anomaly_reasoning','recon_reasoning',
    'agent_close_walkthrough','other'
  )),
  model_name             TEXT NOT NULL,  -- 'claude-3-5-sonnet-20241022', 'gpt-4o-2024-11-20', etc.
  model_provider         TEXT NOT NULL CHECK (model_provider IN ('anthropic','openai','google','aws_bedrock','local')),
  input_summary          TEXT,  -- Short description; full input NOT stored to keep table lean
  input_hash             TEXT,  -- SHA-256 of input for dedup / replay
  input_ref_uri          TEXT,  -- Optional S3 URI to full input if needed for replay
  output_summary         TEXT,
  output_hash            TEXT,
  output_ref_uri         TEXT,
  confidence             NUMERIC(4,3),  -- 0.000 to 1.000
  latency_ms             INTEGER,
  cost_usd               NUMERIC(10,6),
  input_tokens           INTEGER,
  output_tokens          INTEGER,
  temperature            NUMERIC(3,2),
  seed                   BIGINT,  -- If model call was deterministic
  human_reviewed         BOOLEAN NOT NULL DEFAULT FALSE,
  human_approved         BOOLEAN,
  human_reviewer         TEXT,
  human_review_note      TEXT,
  linked_event_id        UUID REFERENCES public.ledger_events(event_id),
  correlation_id         UUID,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_action_log_firm_client_time
  ON public.ai_action_log(firm_client_id, created_at DESC)
  WHERE firm_client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_action_log_category_time
  ON public.ai_action_log(action_category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_action_log_correlation
  ON public.ai_action_log(correlation_id)
  WHERE correlation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_action_log_needs_review
  ON public.ai_action_log(created_at DESC)
  WHERE human_reviewed = FALSE;
COMMENT ON TABLE public.ai_action_log IS 'Audit trail for every LLM-driven action. Enables decision transparency, cost tracking, and replay.';

-- ============================================================================
-- 6. vector_index — pgvector storage for embeddings (populated by later phases)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vector_index (
  vector_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_client_id         UUID REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  namespace              TEXT NOT NULL,  -- 'vendor_templates', 'invoice_content', 'transaction_memo', 'rule_descriptions', etc.
  aggregate_type         TEXT NOT NULL,
  aggregate_id           TEXT NOT NULL,
  content_text           TEXT NOT NULL,
  content_hash           TEXT NOT NULL,
  embedding              VECTOR(1536),  -- Compatible with OpenAI text-embedding-3-small and Voyage v2
  embedding_model        TEXT NOT NULL,
  metadata               JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (firm_client_id, namespace, aggregate_type, aggregate_id)
);
CREATE INDEX IF NOT EXISTS idx_vector_index_firm_ns
  ON public.vector_index(firm_client_id, namespace)
  WHERE firm_client_id IS NOT NULL;
-- IVFFlat index for approximate nearest neighbor search
-- Note: pgvector recommends creating this AFTER initial data load; leaving commented for D6.5 to enable
-- CREATE INDEX IF NOT EXISTS idx_vector_index_embedding
--   ON public.vector_index USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
COMMENT ON TABLE public.vector_index IS 'Vector embeddings for AI-native semantic search. Populated by D6.5 (vendor templates), D6.7 (payment memos), D8 (JE narratives).';

-- ============================================================================
-- 7. platform_metrics — SLO tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.platform_metrics (
  metric_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_client_id         UUID REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  metric_name            TEXT NOT NULL,  -- 'close_duration_hours', 'categorization_latency_ms', 'je_post_latency_ms', 'intake_to_bill_latency_ms', etc.
  metric_value           NUMERIC NOT NULL,
  metric_unit            TEXT NOT NULL,  -- 'ms', 'seconds', 'hours', 'count', 'percentage'
  dimensions             JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Free-form breakdown (rule_id, source_type, etc.)
  slo_target             NUMERIC,  -- What we're targeting
  slo_met                BOOLEAN,  -- Whether metric_value meets slo_target (direction depends on metric)
  recorded_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_platform_metrics_name_time
  ON public.platform_metrics(metric_name, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_metrics_firm_time
  ON public.platform_metrics(firm_client_id, recorded_at DESC)
  WHERE firm_client_id IS NOT NULL;
COMMENT ON TABLE public.platform_metrics IS 'SLO tracking. Populated by all phases. Report surface: are we hitting our cutting-edge targets.';

-- ============================================================================
-- 8. Expand je_posting_audit source_type CHECK to include new categories
-- ============================================================================
ALTER TABLE public.je_posting_audit DROP CONSTRAINT IF EXISTS je_posting_audit_source_type_check;
ALTER TABLE public.je_posting_audit ADD CONSTRAINT je_posting_audit_source_type_check
  CHECK (source_type IN (
    'rule','anomaly','flux','manual','reversal','recurring',
    -- New from D-Platform onward:
    'intake','cash_app','ar_orchestration','assertion_remediation','event_projection'
  ));

-- ============================================================================
-- 9. Row-Level Security scaffolding
--    Enable RLS on new tables. Policies added below.
-- ============================================================================
ALTER TABLE public.engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portcos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_action_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vector_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_metrics ENABLE ROW LEVEL SECURITY;

-- Service role bypass (Advisacor backend uses service key)
CREATE POLICY "service_role_all_engagements" ON public.engagements FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_all_portcos" ON public.portcos FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_all_ledger_events" ON public.ledger_events FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_all_event_projections" ON public.event_projections FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_all_ai_action_log" ON public.ai_action_log FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_all_vector_index" ON public.vector_index FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_all_platform_metrics" ON public.platform_metrics FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- Authenticated user policies: users can see events for firms they belong to
-- (Client-scoped RLS is layered in D6.4d; these are firm-level guards)
CREATE POLICY "firm_members_read_engagements" ON public.engagements FOR SELECT TO authenticated
  USING (firm_id IN (SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid()));
CREATE POLICY "firm_members_read_portcos" ON public.portcos FOR SELECT TO authenticated
  USING (engagement_id IN (
    SELECT id FROM public.engagements
    WHERE firm_id IN (SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid())
  ));
CREATE POLICY "firm_members_read_ledger_events" ON public.ledger_events FOR SELECT TO authenticated
  USING (
    firm_id IN (SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid())
    OR firm_client_id IN (
      SELECT id FROM public.firm_clients
      WHERE firm_id IN (SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "firm_members_read_ai_action_log" ON public.ai_action_log FOR SELECT TO authenticated
  USING (
    firm_client_id IN (
      SELECT id FROM public.firm_clients
      WHERE firm_id IN (SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid())
    )
  );

-- ============================================================================
-- 10. Seed event_projections registry with placeholder rows for phases to come
--     Each subsequent phase will INSERT its own projection row.
-- ============================================================================
INSERT INTO public.event_projections (projection_name, description, event_categories)
VALUES
  ('_healthcheck', 'Baseline projection to verify event bus is alive', ARRAY['system']::TEXT[])
ON CONFLICT (projection_name) DO NOTHING;

COMMIT;
