-- === D2: Safe JE Posting Infrastructure ===

-- 1. Idempotency + attempt tracking
CREATE TABLE IF NOT EXISTS je_post_attempts (
  attempt_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_client_id uuid NOT NULL REFERENCES firm_clients(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  qbo_je_id text,
  status text NOT NULL CHECK (status IN ('pending', 'posted', 'rejected', 'failed', 'reversed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_client_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_je_post_attempts_firm_client
  ON je_post_attempts(firm_client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_je_post_attempts_qbo_je_id
  ON je_post_attempts(qbo_je_id) WHERE qbo_je_id IS NOT NULL;

-- 2. Append-only audit trail
CREATE TABLE IF NOT EXISTS je_posting_audit (
  audit_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES je_post_attempts(attempt_id) ON DELETE RESTRICT,
  firm_client_id uuid NOT NULL REFERENCES firm_clients(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('rule', 'anomaly', 'flux', 'manual', 'reversal')),
  source_id text,
  posted_by text NOT NULL CHECK (posted_by IN ('ai', 'human')),
  posted_by_user_id uuid REFERENCES auth.users(id),
  qbo_je_id text,
  dr_total numeric(18,2) NOT NULL,
  cr_total numeric(18,2) NOT NULL,
  transaction_date date NOT NULL,
  narration text,
  status text NOT NULL CHECK (status IN ('posted', 'rejected', 'failed', 'reversed')),
  rejection_reason text,
  qbo_error_json jsonb,
  reversal_of_attempt_id uuid REFERENCES je_post_attempts(attempt_id),
  payload_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_je_posting_audit_firm_client
  ON je_posting_audit(firm_client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_je_posting_audit_source
  ON je_posting_audit(source_type, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_je_posting_audit_status
  ON je_posting_audit(status);

-- 3. Immutability trigger
CREATE OR REPLACE FUNCTION prevent_je_audit_update()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'je_posting_audit is append-only';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_je_audit_immutable ON je_posting_audit;
CREATE TRIGGER trg_je_audit_immutable
  BEFORE UPDATE OR DELETE ON je_posting_audit
  FOR EACH ROW EXECUTE FUNCTION prevent_je_audit_update();

-- 4. Auto-update je_post_attempts.updated_at
CREATE OR REPLACE FUNCTION touch_je_post_attempts()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_je_post_attempts_touch ON je_post_attempts;
CREATE TRIGGER trg_je_post_attempts_touch
  BEFORE UPDATE ON je_post_attempts
  FOR EACH ROW EXECUTE FUNCTION touch_je_post_attempts();

-- 5. RLS — service-role-only access (consistent with other D-series audit tables).
--    Service role bypasses RLS; this denies direct client reads/writes.
ALTER TABLE je_post_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE je_posting_audit ENABLE ROW LEVEL SECURITY;
