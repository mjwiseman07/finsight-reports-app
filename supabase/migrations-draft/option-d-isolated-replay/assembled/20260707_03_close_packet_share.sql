-- ============================================================================
-- Advisacor Wave 1 — Close Packet Renderer (Doc C, Block C4)
-- PDF artifact tracking + revocable, signed share links for locked packets.
-- ============================================================================

-- Persist the generated PDF's storage object path + timestamps on the packet.
alter table close_packets
  add column if not exists pdf_object_path text;

alter table close_packets
  add column if not exists pdf_generated_at timestamptz;

alter table close_packets
  add column if not exists locked_by_user_id uuid;

-- Revocable share tokens. Only the SHA-256 hash of the raw token is stored;
-- the raw token is shown to the creator exactly once.
create table if not exists close_packet_share_tokens (
  id uuid primary key default gen_random_uuid(),
  packet_id uuid not null references close_packets(id) on delete cascade,
  token_hash text not null unique,
  created_by_user_id uuid,
  label text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_accessed_at timestamptz,
  access_count integer not null default 0
);

create index if not exists idx_share_tokens_packet on close_packet_share_tokens(packet_id);
create index if not exists idx_share_tokens_hash on close_packet_share_tokens(token_hash);

alter table close_packet_share_tokens enable row level security;

drop policy if exists "Super admins manage share tokens" on close_packet_share_tokens;
create policy "Super admins manage share tokens"
  on close_packet_share_tokens for all
  using ((auth.jwt() ->> 'role') = 'super_admin');

-- Atomic access counter used by recordShareAccess (with a JS fallback if absent).
create or replace function increment_share_token_access(p_token_id uuid)
returns void
language sql
as $$
  update close_packet_share_tokens
  set
    access_count = access_count + 1,
    last_accessed_at = now()
  where id = p_token_id;
$$;
