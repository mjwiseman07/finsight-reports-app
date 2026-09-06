-- ============================================================================
-- Advisacor Wave 1 — Close Packet Renderer (Doc C, Block C3)
-- Track manual edits to individual packet sections + an updated_at timestamp
-- so the section editor can flag hand-edited sections and record edit time.
-- ============================================================================

alter table close_packet_sections
  add column if not exists manually_edited boolean default false;

alter table close_packet_sections
  add column if not exists updated_at timestamptz default now();
