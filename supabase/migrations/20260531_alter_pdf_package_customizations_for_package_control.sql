alter table public.pdf_package_customizations
  add column if not exists package_type text not null default 'pdf',
  add column if not exists customization_action text not null default 'add';

create index if not exists pdf_package_customizations_type_action_idx
  on public.pdf_package_customizations(package_type, customization_action, recurrence);

-- package_type values: pdf, powerpoint.
-- customization_action values: add, remove.
-- Customer-facing changes must be initiated through Pulse; Super Admin may retain internal package controls.
