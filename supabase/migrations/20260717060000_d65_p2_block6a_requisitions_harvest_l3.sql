-- Phase D6.5 Part 2 — Block 6a
-- L0 Requisitions + L0.5 Baseline Harvest + L3 Three-Way-Match + Pilot Allowlist + Numbering RPC
-- Additive-only. Idempotent chunks. No user_id literals.
BEGIN;

-- =========================================================
-- Chunk 1: Widen engagement_addons.addon_code CHECK
-- (Also reconciles quarantine_review which exists in TS registry but not in DB CHECK)
-- =========================================================
ALTER TABLE public.engagement_addons DROP CONSTRAINT IF EXISTS engagement_addons_addon_code_check;
ALTER TABLE public.engagement_addons
  ADD CONSTRAINT engagement_addons_addon_code_check
  CHECK (addon_code IN (
    'ap_intake',
    'ap_pay',
    'ar_invoicing',
    'ar_cash_app',
    'ar_collections',
    'voice_collections',
    'quarantine_review',
    'ap_requisitions',
    'ap_baseline_harvest',
    'ap_three_way_match'
  ));

-- =========================================================
-- Chunk 2: pilot_feature_allowlist (PRIVATE per-firm feature gates)
-- Mirrors bookkeeper_release_allowlist shape.
-- =========================================================
CREATE TABLE IF NOT EXISTS public.pilot_feature_allowlist (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id       UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  feature_code  TEXT NOT NULL CHECK (feature_code IN (
    'ap_requisitions',
    'ap_baseline_harvest',
    'ap_three_way_match'
  )),
  granted_by    TEXT,
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at    TIMESTAMPTZ,
  note          TEXT,
  UNIQUE (firm_id, feature_code)
);
CREATE INDEX IF NOT EXISTS idx_pilot_feature_allowlist_firm
  ON public.pilot_feature_allowlist (firm_id) WHERE revoked_at IS NULL;
ALTER TABLE public.pilot_feature_allowlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pilot_feature_allowlist_service_all ON public.pilot_feature_allowlist;
CREATE POLICY pilot_feature_allowlist_service_all
  ON public.pilot_feature_allowlist
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS pilot_feature_allowlist_firm_admin_select ON public.pilot_feature_allowlist;
CREATE POLICY pilot_feature_allowlist_firm_admin_select
  ON public.pilot_feature_allowlist
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.firm_memberships fm
      WHERE fm.firm_id = pilot_feature_allowlist.firm_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    )
  );

-- =========================================================
-- Chunk 3: firm_memberships.can_approve column
-- =========================================================
ALTER TABLE public.firm_memberships
  ADD COLUMN IF NOT EXISTS can_approve BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_firm_memberships_can_approve
  ON public.firm_memberships (firm_id, user_id) WHERE can_approve = TRUE;

-- =========================================================
-- Chunk 4: Document numbering (PO-YYYY-NNNN, REQ-YYYY-NNNN, GR-YYYY-NNNN)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.company_document_numbering_config (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL,
  doc_type          TEXT NOT NULL CHECK (doc_type IN ('purchase_order','requisition','goods_receipt')),
  prefix            TEXT NOT NULL,
  next_seq          INTEGER NOT NULL DEFAULT 1 CHECK (next_seq > 0),
  seq_width         INTEGER NOT NULL DEFAULT 4 CHECK (seq_width BETWEEN 3 AND 8),
  reset_annually    BOOLEAN NOT NULL DEFAULT TRUE,
  current_year      INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, doc_type)
);
ALTER TABLE public.company_document_numbering_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cdnc_service_all ON public.company_document_numbering_config;
CREATE POLICY cdnc_service_all
  ON public.company_document_numbering_config
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.next_document_number(
  p_company_id UUID,
  p_doc_type   TEXT
) RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_row RECORD;
  v_now_year INTEGER := EXTRACT(YEAR FROM NOW())::INT;
  v_prefix TEXT;
  v_seq INTEGER;
  v_width INTEGER;
  v_default_prefix TEXT;
BEGIN
  v_default_prefix := CASE p_doc_type
    WHEN 'purchase_order' THEN 'PO'
    WHEN 'requisition'    THEN 'REQ'
    WHEN 'goods_receipt'  THEN 'GR'
    ELSE (SELECT 'DOC') END;

  INSERT INTO public.company_document_numbering_config (company_id, doc_type, prefix)
  VALUES (p_company_id, p_doc_type, v_default_prefix)
  ON CONFLICT (company_id, doc_type) DO NOTHING;

  SELECT * INTO v_row
  FROM public.company_document_numbering_config
  WHERE company_id = p_company_id AND doc_type = p_doc_type
  FOR UPDATE;

  IF v_row.reset_annually AND v_row.current_year <> v_now_year THEN
    UPDATE public.company_document_numbering_config
    SET next_seq = 2, current_year = v_now_year, updated_at = NOW()
    WHERE id = v_row.id;
    v_seq := 1;
  ELSE
    UPDATE public.company_document_numbering_config
    SET next_seq = v_row.next_seq + 1, updated_at = NOW()
    WHERE id = v_row.id;
    v_seq := v_row.next_seq;
  END IF;

  v_prefix := v_row.prefix;
  v_width := v_row.seq_width;
  RETURN v_prefix || '-' || v_now_year::TEXT || '-' || LPAD(v_seq::TEXT, v_width, '0');
END;
$$;

-- =========================================================
-- Chunk 5: baseline_harvest_runs (audit trail for L0.5)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.baseline_harvest_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id           UUID NOT NULL,
  firm_client_id    UUID NOT NULL REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  source            TEXT NOT NULL CHECK (source IN ('qbo','csv')),
  status            TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed','cancelled')),
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  actor_id          TEXT,
  counts            JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message     TEXT,
  correlation_id    TEXT
);
CREATE INDEX IF NOT EXISTS idx_baseline_harvest_runs_firm_client
  ON public.baseline_harvest_runs (firm_client_id, started_at DESC);
ALTER TABLE public.baseline_harvest_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bhr_service_all ON public.baseline_harvest_runs;
CREATE POLICY bhr_service_all ON public.baseline_harvest_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS bhr_firm_select ON public.baseline_harvest_runs;
CREATE POLICY bhr_firm_select ON public.baseline_harvest_runs
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.firm_memberships fm
      WHERE fm.firm_id = baseline_harvest_runs.firm_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    )
  );

-- =========================================================
-- Chunk 6: purchase_orders + purchase_order_line_items
-- =========================================================
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id               UUID NOT NULL,
  firm_client_id        UUID NOT NULL REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  company_id            UUID NOT NULL,
  po_number             TEXT NOT NULL,
  vendor_id             UUID,
  vendor_external_id    TEXT,
  status                TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft','open','partially_received','closed','cancelled')),
  currency              TEXT NOT NULL DEFAULT 'USD',
  subtotal_cents        BIGINT NOT NULL DEFAULT 0,
  tax_cents             BIGINT NOT NULL DEFAULT 0,
  total_cents           BIGINT NOT NULL DEFAULT 0,
  ordered_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expected_delivery_at  TIMESTAMPTZ,
  closed_at             TIMESTAMPTZ,
  requisition_id        UUID,
  source                TEXT NOT NULL DEFAULT 'requisition' CHECK (source IN ('requisition','harvest_qbo','harvest_csv','manual')),
  source_external_id    TEXT,
  baseline_harvest_run_id UUID REFERENCES public.baseline_harvest_runs(id),
  memo                  TEXT,
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, po_number)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_purchase_orders_source_external
  ON public.purchase_orders (firm_client_id, source, source_external_id)
  WHERE source_external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor
  ON public.purchase_orders (firm_client_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status
  ON public.purchase_orders (firm_client_id, status);

CREATE TABLE IF NOT EXISTS public.purchase_order_line_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  line_number       INTEGER NOT NULL,
  description       TEXT NOT NULL,
  quantity_ordered  NUMERIC(14,4) NOT NULL DEFAULT 1,
  quantity_received NUMERIC(14,4) NOT NULL DEFAULT 0,
  unit_price_cents  BIGINT NOT NULL DEFAULT 0,
  line_total_cents  BIGINT NOT NULL DEFAULT 0,
  gl_account_code   TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (purchase_order_id, line_number)
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS po_service_all ON public.purchase_orders;
CREATE POLICY po_service_all ON public.purchase_orders
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS poli_service_all ON public.purchase_order_line_items;
CREATE POLICY poli_service_all ON public.purchase_order_line_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS po_firm_select ON public.purchase_orders;
CREATE POLICY po_firm_select ON public.purchase_orders
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.firm_memberships fm
      WHERE fm.firm_id = purchase_orders.firm_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    )
  );
DROP POLICY IF EXISTS poli_firm_select ON public.purchase_order_line_items;
CREATE POLICY poli_firm_select ON public.purchase_order_line_items
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.purchase_orders po
      JOIN public.firm_memberships fm ON fm.firm_id = po.firm_id
      WHERE po.id = purchase_order_line_items.purchase_order_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    )
  );

-- =========================================================
-- Chunk 7: requisitions + requisition_line_items
-- =========================================================
CREATE TABLE IF NOT EXISTS public.requisitions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id               UUID NOT NULL,
  firm_client_id        UUID NOT NULL REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  company_id            UUID NOT NULL,
  engagement_id         UUID,
  requisition_number    TEXT NOT NULL,
  requester_user_id     UUID NOT NULL,
  approver_user_id      UUID,
  status                TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','cancelled','converted_to_po')),
  vendor_id             UUID,
  vendor_hint_text      TEXT,
  currency              TEXT NOT NULL DEFAULT 'USD',
  subtotal_cents        BIGINT NOT NULL DEFAULT 0,
  tax_cents             BIGINT NOT NULL DEFAULT 0,
  total_cents           BIGINT NOT NULL DEFAULT 0,
  needed_by             DATE,
  justification         TEXT,
  approved_at           TIMESTAMPTZ,
  approved_by           UUID,
  rejected_at           TIMESTAMPTZ,
  rejection_reason      TEXT,
  purchase_order_id     UUID,
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, requisition_number)
);
CREATE INDEX IF NOT EXISTS idx_requisitions_firm_client_status
  ON public.requisitions (firm_client_id, status);
CREATE INDEX IF NOT EXISTS idx_requisitions_approver
  ON public.requisitions (approver_user_id, status);
CREATE INDEX IF NOT EXISTS idx_requisitions_requester
  ON public.requisitions (requester_user_id, status);

CREATE TABLE IF NOT EXISTS public.requisition_line_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id    UUID NOT NULL REFERENCES public.requisitions(id) ON DELETE CASCADE,
  line_number       INTEGER NOT NULL,
  description       TEXT NOT NULL,
  quantity          NUMERIC(14,4) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_cents  BIGINT NOT NULL DEFAULT 0 CHECK (unit_price_cents >= 0),
  line_total_cents  BIGINT NOT NULL DEFAULT 0,
  gl_account_code   TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (requisition_id, line_number)
);

ALTER TABLE public.purchase_orders
  DROP CONSTRAINT IF EXISTS fk_purchase_orders_requisition;
ALTER TABLE public.purchase_orders
  ADD CONSTRAINT fk_purchase_orders_requisition
  FOREIGN KEY (requisition_id) REFERENCES public.requisitions(id) ON DELETE SET NULL;
ALTER TABLE public.requisitions
  DROP CONSTRAINT IF EXISTS fk_requisitions_po;
ALTER TABLE public.requisitions
  ADD CONSTRAINT fk_requisitions_po
  FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE SET NULL;

ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS req_service_all ON public.requisitions;
CREATE POLICY req_service_all ON public.requisitions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS reqli_service_all ON public.requisition_line_items;
CREATE POLICY reqli_service_all ON public.requisition_line_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS req_firm_select ON public.requisitions;
CREATE POLICY req_firm_select ON public.requisitions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.firm_memberships fm
      WHERE fm.firm_id = requisitions.firm_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    )
  );
DROP POLICY IF EXISTS reqli_firm_select ON public.requisition_line_items;
CREATE POLICY reqli_firm_select ON public.requisition_line_items
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.requisitions r
      JOIN public.firm_memberships fm ON fm.firm_id = r.firm_id
      WHERE r.id = requisition_line_items.requisition_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    )
  );

-- =========================================================
-- Chunk 8: goods_receipts + goods_receipt_line_items
-- =========================================================
CREATE TABLE IF NOT EXISTS public.goods_receipts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id               UUID NOT NULL,
  firm_client_id        UUID NOT NULL REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  company_id            UUID NOT NULL,
  purchase_order_id     UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE RESTRICT,
  gr_number             TEXT NOT NULL,
  received_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_by_user_id   UUID,
  status                TEXT NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded','reversed')),
  source                TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','harvest_qbo','harvest_csv')),
  source_external_id    TEXT,
  baseline_harvest_run_id UUID REFERENCES public.baseline_harvest_runs(id),
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, gr_number)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_goods_receipts_source_external
  ON public.goods_receipts (firm_client_id, source, source_external_id)
  WHERE source_external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.goods_receipt_line_items (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_receipt_id          UUID NOT NULL REFERENCES public.goods_receipts(id) ON DELETE CASCADE,
  purchase_order_line_id    UUID NOT NULL REFERENCES public.purchase_order_line_items(id) ON DELETE RESTRICT,
  quantity_received         NUMERIC(14,4) NOT NULL CHECK (quantity_received > 0),
  metadata                  JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (goods_receipt_id, purchase_order_line_id)
);

ALTER TABLE public.goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipt_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gr_service_all ON public.goods_receipts;
CREATE POLICY gr_service_all ON public.goods_receipts FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS grli_service_all ON public.goods_receipt_line_items;
CREATE POLICY grli_service_all ON public.goods_receipt_line_items FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS gr_firm_select ON public.goods_receipts;
CREATE POLICY gr_firm_select ON public.goods_receipts
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.firm_memberships fm
      WHERE fm.firm_id = goods_receipts.firm_id
        AND fm.user_id = auth.uid() AND fm.status = 'active'
    )
  );
DROP POLICY IF EXISTS grli_firm_select ON public.goods_receipt_line_items;
CREATE POLICY grli_firm_select ON public.goods_receipt_line_items
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.goods_receipts gr
      JOIN public.firm_memberships fm ON fm.firm_id = gr.firm_id
      WHERE gr.id = goods_receipt_line_items.goods_receipt_id
        AND fm.user_id = auth.uid() AND fm.status = 'active'
    )
  );

-- =========================================================
-- Chunk 9: bill_history harvest-ready refactor (5 sub-steps)
-- =========================================================
ALTER TABLE public.bill_history
  ALTER COLUMN bill_id DROP NOT NULL;

ALTER TABLE public.bill_history
  ADD COLUMN IF NOT EXISTS company_id UUID,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'intake' CHECK (source IN ('intake','harvest_qbo','harvest_csv','manual')),
  ADD COLUMN IF NOT EXISTS source_external_id TEXT,
  ADD COLUMN IF NOT EXISTS baseline_harvest_run_id UUID REFERENCES public.baseline_harvest_runs(id),
  ADD COLUMN IF NOT EXISTS purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS three_way_match_status TEXT CHECK (three_way_match_status IN ('matched','no_po','price_variance','quantity_variance','po_closed','not_evaluated')),
  ADD COLUMN IF NOT EXISTS three_way_match_signals JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.bill_history bh
SET company_id = fc.company_id
FROM public.firm_clients fc
WHERE bh.firm_client_id = fc.id AND bh.company_id IS NULL;

ALTER TABLE public.bill_history
  ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE public.bill_history DROP CONSTRAINT IF EXISTS bill_history_bill_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_bill_history_bill_id
  ON public.bill_history (bill_id) WHERE bill_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_bill_history_source_external
  ON public.bill_history (firm_client_id, source, source_external_id)
  WHERE source_external_id IS NOT NULL;

ALTER TABLE public.bill_history
  DROP CONSTRAINT IF EXISTS bill_history_identity_check;
ALTER TABLE public.bill_history
  ADD CONSTRAINT bill_history_identity_check
  CHECK (
    bill_id IS NOT NULL
    OR (source IN ('harvest_qbo','harvest_csv') AND source_external_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_bill_history_firm_client_source
  ON public.bill_history (firm_client_id, source);

-- =========================================================
-- Chunk 10: vendor_master_mirror additive columns for baseline harvest
-- =========================================================
ALTER TABLE public.vendor_master_mirror
  ADD COLUMN IF NOT EXISTS baseline_source TEXT CHECK (baseline_source IN ('qbo','csv')),
  ADD COLUMN IF NOT EXISTS baseline_harvest_run_id UUID REFERENCES public.baseline_harvest_runs(id);
CREATE INDEX IF NOT EXISTS idx_vendor_master_mirror_baseline_source
  ON public.vendor_master_mirror (firm_client_id, baseline_source)
  WHERE baseline_source IS NOT NULL;

-- =========================================================
-- Chunk 11: qbo_coa_mirror (read-only Chart of Accounts)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.qbo_coa_mirror (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id               UUID NOT NULL,
  firm_client_id        UUID NOT NULL REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  external_account_id   TEXT NOT NULL,
  account_number        TEXT,
  account_name          TEXT NOT NULL,
  account_type          TEXT,
  account_subtype       TEXT,
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  baseline_harvest_run_id UUID REFERENCES public.baseline_harvest_runs(id),
  first_synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (firm_client_id, external_account_id)
);
ALTER TABLE public.qbo_coa_mirror ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS coa_service_all ON public.qbo_coa_mirror;
CREATE POLICY coa_service_all ON public.qbo_coa_mirror FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS coa_firm_select ON public.qbo_coa_mirror;
CREATE POLICY coa_firm_select ON public.qbo_coa_mirror
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.firm_memberships fm
      WHERE fm.firm_id = qbo_coa_mirror.firm_id
        AND fm.user_id = auth.uid() AND fm.status = 'active'
    )
  );

-- =========================================================
-- Chunk 12: Extend ap_intake_ledger_event_types catalog (13 events)
-- =========================================================
INSERT INTO public.ap_intake_ledger_event_types (event_type, actor_type, is_merkle_chained) VALUES
  ('requisition.created',           'user',   TRUE),
  ('requisition.submitted',         'user',   TRUE),
  ('requisition.approved',          'user',   TRUE),
  ('requisition.rejected',          'user',   TRUE),
  ('requisition.converted_to_po',   'user',   TRUE),
  ('purchase_order.created',        'user',   TRUE),
  ('purchase_order.closed',         'user',   TRUE),
  ('goods_receipt.recorded',        'user',   TRUE),
  ('three_way_match.evaluated',     'system', TRUE),
  ('three_way_match.hit',           'system', TRUE),
  ('baseline_harvest.started',      'user',   TRUE),
  ('baseline_harvest.completed',    'system', TRUE),
  ('baseline_harvest.failed',       'system', TRUE)
ON CONFLICT (event_type) DO NOTHING;

COMMIT;
