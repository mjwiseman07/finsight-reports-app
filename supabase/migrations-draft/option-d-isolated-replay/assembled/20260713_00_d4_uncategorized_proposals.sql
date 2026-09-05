-- === D4: Uncategorized Cleanup Engine — proposal storage ===
-- Path A (posted-to-uncategorized) proposals + reviewer decisions.
-- Review-only in Wave 1: accepts delegate posting to the D2 poster.

CREATE TABLE IF NOT EXISTS public.uncategorized_proposals (
  proposal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_client_id UUID NOT NULL REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  scan_run_id UUID NOT NULL,        -- links to the D3-style scan_run memory record
  txn_id TEXT NOT NULL,             -- QBO Id
  txn_type TEXT NOT NULL CHECK (txn_type IN ('Purchase','Bill','JournalEntry','Deposit','Expense')),
  txn_date DATE NOT NULL,
  txn_amount NUMERIC(18,2) NOT NULL,
  txn_memo TEXT,
  vendor_id TEXT,
  vendor_name TEXT,
  current_account_id TEXT NOT NULL,
  current_account_name TEXT NOT NULL,
  suggested_account_id TEXT,
  suggested_account_name TEXT,
  suggested_account_type TEXT,
  suggested_account_subtype TEXT,
  source TEXT NOT NULL CHECK (source IN ('vendor_gl_mapping','recurring_pattern','amount_range','no_pattern')),
  memory_id TEXT,                   -- source pattern
  confidence NUMERIC(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  confidence_bucket TEXT NOT NULL CHECK (confidence_bucket IN ('green','yellow','red')),
  sample_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
         CHECK (status IN ('pending','accepted','rejected','modified','skipped')),
  reviewer_user_id UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ,
  final_account_id TEXT,
  final_account_name TEXT,
  posted_je_id TEXT,                -- D2 attempt_id after accept
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uncat_proposals_firm_status
  ON public.uncategorized_proposals (firm_client_id, status, txn_date DESC);
CREATE INDEX IF NOT EXISTS idx_uncat_proposals_txn
  ON public.uncategorized_proposals (firm_client_id, txn_id);

-- Idempotency: one open proposal per (firm_client_id, txn_id, current_account_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_uncat_proposals_open_unique
  ON public.uncategorized_proposals (firm_client_id, txn_id, current_account_id)
  WHERE status IN ('pending');

-- Touch trigger
CREATE OR REPLACE FUNCTION public.touch_uncategorized_proposals_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS touch_uncategorized_proposals ON public.uncategorized_proposals;
CREATE TRIGGER touch_uncategorized_proposals
  BEFORE UPDATE ON public.uncategorized_proposals
  FOR EACH ROW EXECUTE FUNCTION public.touch_uncategorized_proposals_updated_at();

-- Immutability: once decided, decided_at + reviewer_user_id + status cannot change
CREATE OR REPLACE FUNCTION public.prevent_proposal_decision_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('accepted','rejected','modified','skipped') THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.reviewer_user_id IS DISTINCT FROM OLD.reviewer_user_id
       OR NEW.decided_at IS DISTINCT FROM OLD.decided_at
       OR NEW.final_account_id IS DISTINCT FROM OLD.final_account_id
       OR NEW.posted_je_id IS DISTINCT FROM OLD.posted_je_id THEN
      RAISE EXCEPTION 'Proposal decision fields are immutable once status is terminal (was: %)', OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_proposal_decision_mutation ON public.uncategorized_proposals;
CREATE TRIGGER prevent_proposal_decision_mutation
  BEFORE UPDATE ON public.uncategorized_proposals
  FOR EACH ROW EXECUTE FUNCTION public.prevent_proposal_decision_mutation();

-- RLS
ALTER TABLE public.uncategorized_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS uncat_proposals_firm_access ON public.uncategorized_proposals;
CREATE POLICY uncat_proposals_firm_access ON public.uncategorized_proposals
  FOR ALL USING (
    firm_client_id IN (
      SELECT id FROM public.firm_clients
      WHERE owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS uncat_proposals_service_role ON public.uncategorized_proposals;
CREATE POLICY uncat_proposals_service_role ON public.uncategorized_proposals
  FOR ALL TO service_role USING (true) WITH CHECK (true);
