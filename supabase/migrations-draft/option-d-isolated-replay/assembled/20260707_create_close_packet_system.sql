-- ============================================================================
-- Advisacor Wave 1 — Close Packet Renderer (Doc C, Block C1)
-- Depends on Doc A (close_periods, close_checklist_runs) and firm_clients/firms.
-- ============================================================================

-- Rendered packets — one per close_periods row, versioned on each render
CREATE TABLE IF NOT EXISTS close_packets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  close_period_id UUID NOT NULL REFERENCES close_periods(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','review_ready','sent','signed_off','locked')),
  payload_json JSONB NOT NULL,
  pdf_url TEXT,
  pdf_hash TEXT,
  rendered_by_user_id UUID,
  rendered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  locked_signature_json JSONB,
  UNIQUE (close_period_id, version)
);

-- Section-level authoring — each section can be manually edited by preparer/bookkeeper
CREATE TABLE IF NOT EXISTS close_packet_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_id UUID NOT NULL REFERENCES close_packets(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  sort_order INT NOT NULL,
  is_included BOOLEAN NOT NULL DEFAULT TRUE,
  content_json JSONB NOT NULL,
  ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  edited_by_user_id UUID,
  edited_at TIMESTAMPTZ,
  UNIQUE (packet_id, section_key)
);

-- Variance thresholds per firm/client (customizable)
CREATE TABLE IF NOT EXISTS close_packet_variance_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_client_id UUID REFERENCES firm_clients(id) ON DELETE CASCADE,
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  pct_threshold NUMERIC NOT NULL DEFAULT 10.0,
  abs_threshold_usd NUMERIC NOT NULL DEFAULT 1000.00,
  min_baseline_usd NUMERIC NOT NULL DEFAULT 100.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((firm_client_id IS NOT NULL) OR (firm_id IS NOT NULL))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_close_packets_period ON close_packets(close_period_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_close_packet_sections_packet ON close_packet_sections(packet_id);
CREATE INDEX IF NOT EXISTS idx_variance_config_firm_client ON close_packet_variance_config(firm_client_id) WHERE firm_client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_variance_config_firm ON close_packet_variance_config(firm_id) WHERE firm_id IS NOT NULL;

-- RLS
ALTER TABLE close_packets ENABLE ROW LEVEL SECURITY;
ALTER TABLE close_packet_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE close_packet_variance_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins manage close packets" ON close_packets;
CREATE POLICY "Super admins manage close packets"
  ON close_packets FOR ALL
  USING ((auth.jwt() ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Super admins manage packet sections" ON close_packet_sections;
CREATE POLICY "Super admins manage packet sections"
  ON close_packet_sections FOR ALL
  USING ((auth.jwt() ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Super admins manage variance config" ON close_packet_variance_config;
CREATE POLICY "Super admins manage variance config"
  ON close_packet_variance_config FOR ALL
  USING ((auth.jwt() ->> 'role') = 'super_admin');
