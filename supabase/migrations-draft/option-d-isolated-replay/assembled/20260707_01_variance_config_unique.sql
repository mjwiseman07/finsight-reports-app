-- ============================================================================
-- Doc C2 — unique constraints for close_packet_variance_config upserts.
-- Postgres treats NULLs as distinct, so a UNIQUE on firm_client_id still allows
-- many firm-level rows (firm_client_id NULL) and vice versa.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_variance_config_firm_client'
  ) THEN
    ALTER TABLE close_packet_variance_config
      ADD CONSTRAINT uq_variance_config_firm_client UNIQUE (firm_client_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_variance_config_firm'
  ) THEN
    ALTER TABLE close_packet_variance_config
      ADD CONSTRAINT uq_variance_config_firm UNIQUE (firm_id);
  END IF;
END $$;
