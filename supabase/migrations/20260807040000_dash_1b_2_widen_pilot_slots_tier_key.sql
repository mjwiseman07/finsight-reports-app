-- Phase DASH_1B.2 — Widen pilot_slots.tier_key to include free_trial_connected.
-- Precedent: pilot_slots_add_review_assist_pro_tier_key migration (DROP + CREATE).

alter table public.pilot_slots
  drop constraint if exists pilot_slots_tier_key_check;

alter table public.pilot_slots
  add constraint pilot_slots_tier_key_check
  check (tier_key = any (array[
    'solo_bookkeeper'::text,
    'owner_lite'::text,
    'owner_pro'::text,
    'accounting_pro'::text,
    'firm'::text,
    'enterprise_firm'::text,
    'industry_premium'::text,
    'client_seat_alacarte'::text,
    'review_assist'::text,
    'review_assist_pro'::text,
    'audit_ready'::text,
    'free_trial_connected'::text
  ]));

comment on constraint pilot_slots_tier_key_check on public.pilot_slots is
  'DASH_1B.2: free_trial_connected added for implicit ERP-connect anchor (Option B). See Phase_DASH_1B_2_Cursor_Paste_Block.md.';
