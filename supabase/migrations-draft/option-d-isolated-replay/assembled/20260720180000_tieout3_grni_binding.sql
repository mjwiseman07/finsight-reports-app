-- Phase PBC-TIEOUT-3 — GRNI clearing account binding
-- Additive-only. Optional per engagement. Absent = GRNI resolver returns
-- resolver_config_required cleanly instead of guessing.
alter table public.audit_ready_engagements
  add column if not exists grni_clearing_qbo_account_id text;
comment on column public.audit_ready_engagements.grni_clearing_qbo_account_id is
  'Optional QBO Account ID (numeric string) that maps to the client''s GRNI / '
  'Goods-Received-Not-Invoiced clearing account. Populated by controller during '
  'engagement setup. When null, tie-out for tie_out_kind=grni returns '
  'resolver_config_required.';
-- Optional: also let the AR/AP/Inv account IDs live on the engagement for
-- convenience so the Run modal can prefill. Additive; UI wiring is TIEOUT-4.
alter table public.audit_ready_engagements
  add column if not exists ar_control_qbo_account_id text;
alter table public.audit_ready_engagements
  add column if not exists ap_control_qbo_account_id text;
alter table public.audit_ready_engagements
  add column if not exists inventory_control_qbo_account_id text;
comment on column public.audit_ready_engagements.ar_control_qbo_account_id is
  'Optional QBO AR control account ID. When set, Run modal for ar_aging '
  'prefills this value.';
comment on column public.audit_ready_engagements.ap_control_qbo_account_id is
  'Optional QBO AP control account ID. When set, Run modal for ap_aging '
  'prefills this value.';
comment on column public.audit_ready_engagements.inventory_control_qbo_account_id is
  'Optional QBO Inventory control account ID. When set, Run modal for '
  'inventory prefills this value.';
