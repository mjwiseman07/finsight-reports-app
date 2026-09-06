-- Phase PBC-TIEOUT-4.1.2 Block B: raw QBO payload persistence for Source Data tab
-- Path Y: build() reads from this column, never live-fetches.
ALTER TABLE audit_ready_tie_out_runs
  ADD COLUMN IF NOT EXISTS raw_qbo_payload_jsonb jsonb;

COMMENT ON COLUMN audit_ready_tie_out_runs.raw_qbo_payload_jsonb IS
  'Snapshot of the QBO API response(s) used to compute this run. Read by workpaper emitters for the Source Data tab. Never mutated after run completion.';
