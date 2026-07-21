-- PBC-TIEOUT-3.4: Per-source-transaction evidence for tie-out variance rows.
-- One evidence row per source bill/invoice/adjustment that contributed to
-- a rollup variance row. Enables audit-defensible traceability from a
-- rollup number back to the raw QBO transactions + their PO links.
--
-- Design notes:
-- - Foreign-keyed to audit_ready_tie_out_variances via variance_id (cascade delete).
-- - Also foreign-keyed to audit_ready_tie_out_runs via run_id for run-scoped queries.
-- - source_kind discriminator ('bill' | 'invoice' | 'inventory_adjustment') so AR/AP/Inventory
--   resolvers can write evidence uniformly without a new table each.
-- - linked_po_ids stored as text[] (Postgres array) — natural for QBO LinkedTxn.
-- - aging_bucket + age_days_at_run captured at classification time (frozen at run time,
--   not recomputed on read — audit history must not shift as time passes).
CREATE TABLE IF NOT EXISTS public.audit_ready_tie_out_variance_evidence (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variance_id            uuid NOT NULL REFERENCES public.audit_ready_tie_out_variances(id) ON DELETE CASCADE,
  run_id                 uuid NOT NULL REFERENCES public.audit_ready_tie_out_runs(id) ON DELETE CASCADE,
  engagement_id          uuid NOT NULL REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  -- Source transaction metadata (QBO)
  source_kind            text NOT NULL CHECK (source_kind IN ('bill','invoice','inventory_adjustment')),
  source_qbo_id          text NOT NULL,
  source_txn_date        date,
  source_doc_number      text,          -- null/blank for GRNI bills; populated otherwise
  vendor_ref             text,          -- QBO vendor id (bills)
  customer_ref           text,          -- QBO customer id (invoices)
  -- Financial contribution (cents, always positive for a positive-balance txn)
  total_cents            bigint NOT NULL,
  subtotal_cents         bigint NOT NULL,
  balance_cents          bigint NOT NULL,
  -- Evidence
  linked_po_ids          text[] NOT NULL DEFAULT '{}',
  linked_invoice_ids     text[] NOT NULL DEFAULT '{}',  -- future: AR credit memo links, etc.
  enrichment_error       text,          -- Non-null when per-txn GET-by-id failed
  aging_bucket           text,          -- 'current_0_60' | 'aging_60_90' | 'aging_90_180' | 'aging_over_180' | null
  age_days_at_run        integer,       -- Frozen at run time
  created_at             timestamptz NOT NULL DEFAULT now()
);
-- Indexes for the queries we actually run
CREATE INDEX IF NOT EXISTS idx_arte_variance_id      ON public.audit_ready_tie_out_variance_evidence (variance_id);
CREATE INDEX IF NOT EXISTS idx_arte_run_id           ON public.audit_ready_tie_out_variance_evidence (run_id);
CREATE INDEX IF NOT EXISTS idx_arte_engagement_id    ON public.audit_ready_tie_out_variance_evidence (engagement_id);
CREATE INDEX IF NOT EXISTS idx_arte_source_kind_qbo  ON public.audit_ready_tie_out_variance_evidence (source_kind, source_qbo_id);
-- RLS mirrors audit_ready_tie_out_variances: engagement-scoped, no client writes.
ALTER TABLE public.audit_ready_tie_out_variance_evidence ENABLE ROW LEVEL SECURITY;
-- Service role bypasses RLS. For authenticated reads, allow if the caller
-- can see the underlying variance row (delegate to the parent table's policy
-- via a SELECT check on audit_ready_tie_out_variances).
DROP POLICY IF EXISTS "arte_select_via_variance" ON public.audit_ready_tie_out_variance_evidence;
CREATE POLICY "arte_select_via_variance"
  ON public.audit_ready_tie_out_variance_evidence
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.audit_ready_tie_out_variances v
      WHERE v.id = audit_ready_tie_out_variance_evidence.variance_id
    )
  );
-- No INSERT/UPDATE/DELETE policies for authenticated — only service role writes.
COMMENT ON TABLE public.audit_ready_tie_out_variance_evidence IS
  'Per-source-transaction evidence for tie-out variance rows (PBC-TIEOUT-3.4). One row per QBO bill/invoice/adjustment that contributed to a rollup variance row.';
