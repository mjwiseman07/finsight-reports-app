-- Phase D6.5 Part 2 — Block 5
-- L6 statistical anomaly + L11 fraud score aggregation + Merkle-chained ledger
-- ADDITIVE ONLY.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.bill_history (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                  UUID NOT NULL,
  firm_client_id           UUID NOT NULL,
  vendor_id                UUID NOT NULL,
  bill_id                  UUID NOT NULL REFERENCES public.ap_intake_bills(id),
  invoice_amount_cents     BIGINT,
  invoice_date             DATE,
  invoice_number           TEXT,
  received_at              TIMESTAMPTZ NOT NULL,
  quarantined              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bill_id)
);

CREATE INDEX IF NOT EXISTS ix_bill_history_firm_client_vendor_received
  ON public.bill_history (firm_client_id, vendor_id, received_at DESC);

CREATE INDEX IF NOT EXISTS ix_bill_history_firm_client_amount
  ON public.bill_history (firm_client_id, vendor_id, invoice_amount_cents)
  WHERE invoice_amount_cents IS NOT NULL;

ALTER TABLE public.bill_history ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.fraud_score_signals (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                   UUID NOT NULL,
  firm_client_id            UUID NOT NULL,
  bill_id                   UUID NOT NULL REFERENCES public.ap_intake_bills(id),
  layer                     TEXT NOT NULL CHECK (layer IN ('L3','L4','L5','L6')),
  signal_code               TEXT NOT NULL,
  severity                  TEXT NOT NULL CHECK (severity IN ('HIGH','MEDIUM','LOW')),
  contribution              NUMERIC(4,3) NOT NULL CHECK (contribution >= 0 AND contribution <= 1),
  evidence                  JSONB NOT NULL,
  disposition               TEXT NOT NULL DEFAULT 'pending'
    CHECK (disposition IN ('pending','confirmed','dismissed','escalated')),
  disposition_note          TEXT,
  disposed_at               TIMESTAMPTZ,
  disposed_by_user_id       UUID,
  detected_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  aggregated_score_snapshot NUMERIC(4,3) NOT NULL,
  UNIQUE (bill_id, layer, signal_code)
);

CREATE INDEX IF NOT EXISTS ix_fraud_score_signals_bill
  ON public.fraud_score_signals (bill_id, detected_at DESC);

CREATE INDEX IF NOT EXISTS ix_fraud_score_signals_disposition
  ON public.fraud_score_signals (firm_client_id, disposition, detected_at DESC);

ALTER TABLE public.fraud_score_signals ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ledger_events
  ADD COLUMN IF NOT EXISTS event_hash          TEXT,
  ADD COLUMN IF NOT EXISTS previous_event_hash TEXT,
  ADD COLUMN IF NOT EXISTS chain_index         BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_events_chain_index
  ON public.ledger_events (chain_index)
  WHERE chain_index IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_ledger_events_event_hash
  ON public.ledger_events (event_hash)
  WHERE event_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.ledger_chain_head (
  id                       INTEGER PRIMARY KEY CHECK (id = 1),
  current_chain_index      BIGINT NOT NULL DEFAULT -1,
  current_event_hash       TEXT,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.ledger_chain_head (id, current_chain_index, current_event_hash)
VALUES (1, -1, NULL)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.ledger_chain_head ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.publish_ledger_event(
  p_event_type              TEXT,
  p_event_category          TEXT,
  p_event_version           INTEGER,
  p_firm_id                 UUID,
  p_firm_client_id          UUID,
  p_engagement_id           UUID,
  p_portco_id               UUID,
  p_close_period_id         TEXT,
  p_aggregate_type          TEXT,
  p_aggregate_id            TEXT,
  p_actor_type              TEXT,
  p_actor_id                TEXT,
  p_event_payload           JSONB,
  p_event_metadata          JSONB,
  p_causation_event_id      UUID,
  p_event_payload_canonical TEXT
)
RETURNS TABLE(event_id UUID, event_hash TEXT, chain_index BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_head             public.ledger_chain_head%ROWTYPE;
  v_new_chain_index  BIGINT;
  v_new_event_id     UUID := gen_random_uuid();
  v_prev_hash        TEXT;
  v_hash_input       TEXT;
  v_new_hash         TEXT;
BEGIN
  SELECT * INTO v_head FROM public.ledger_chain_head WHERE id = 1 FOR UPDATE;
  v_new_chain_index := v_head.current_chain_index + 1;
  v_prev_hash := v_head.current_event_hash;

  v_hash_input := COALESCE(v_prev_hash, '') || v_new_event_id::TEXT || p_event_type || p_event_payload_canonical;
  v_new_hash := encode(digest(v_hash_input::bytea, 'sha256'), 'hex');

  INSERT INTO public.ledger_events (
    event_id, event_type, event_category, event_version,
    firm_id, firm_client_id, engagement_id, portco_id, close_period_id,
    aggregate_type, aggregate_id,
    actor_type, actor_id,
    event_payload, event_metadata, causation_event_id,
    event_hash, previous_event_hash, chain_index
  ) VALUES (
    v_new_event_id, p_event_type, p_event_category, p_event_version,
    p_firm_id, p_firm_client_id, p_engagement_id, p_portco_id, p_close_period_id,
    p_aggregate_type, p_aggregate_id,
    p_actor_type, p_actor_id,
    p_event_payload, p_event_metadata, p_causation_event_id,
    v_new_hash, v_prev_hash, v_new_chain_index
  );

  UPDATE public.ledger_chain_head
     SET current_chain_index = v_new_chain_index,
         current_event_hash  = v_new_hash,
         updated_at          = NOW()
   WHERE id = 1;

  event_id := v_new_event_id;
  event_hash := v_new_hash;
  chain_index := v_new_chain_index;
  RETURN NEXT;
END;
$fn$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bill_history' AND policyname = 'bill_history_service_role'
  ) THEN
    CREATE POLICY bill_history_service_role ON public.bill_history
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'fraud_score_signals' AND policyname = 'fraud_score_signals_service_role'
  ) THEN
    CREATE POLICY fraud_score_signals_service_role ON public.fraud_score_signals
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ledger_chain_head' AND policyname = 'ledger_chain_head_service_role'
  ) THEN
    CREATE POLICY ledger_chain_head_service_role ON public.ledger_chain_head
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

INSERT INTO public.ap_intake_ledger_event_types (event_type, actor_type, is_merkle_chained) VALUES
  ('bill.anomaly_detected', 'system', TRUE),
  ('bill.anomaly_flagged', 'system', TRUE),
  ('bill.fraud_score_updated', 'system', TRUE),
  ('bill.fraud_score_quarantine', 'system', TRUE)
ON CONFLICT (event_type) DO NOTHING;

DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_action_log_action_category_check'
  ) INTO constraint_exists;
  IF constraint_exists THEN
    ALTER TABLE public.ai_action_log DROP CONSTRAINT ai_action_log_action_category_check;
  END IF;
  ALTER TABLE public.ai_action_log
    ADD CONSTRAINT ai_action_log_action_category_check
    CHECK (action_category IN (
      'intake_ocr','intake_classify','cash_app_reasoning','ar_dunning_draft',
      'assertion_reasoning','je_proposal','anomaly_reasoning','recon_reasoning',
      'agent_close_walkthrough','entitlement_check','other',
      'directive_apply','review_item_compose',
      'posting_attempt','posting_blocked','posting_remediation',
      'reviewer_ui_export','reviewer_ui_visibility_change','reviewer_ui_policy_change',
      'assertion_coverage_scan','assertion_gap_reasoning',
      'visual_fingerprint','vendor_resolution',
      'bank_change_detection','quarantine_gate_evaluation',
      'duplicate_detection',
      'statistical_anomaly_detection','fraud_score_aggregation'
    ));
END $$;

COMMIT;
