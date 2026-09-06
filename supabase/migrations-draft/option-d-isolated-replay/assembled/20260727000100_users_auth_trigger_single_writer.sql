-- Phase FIX-USERS-PKEY: single-writer auth trigger
-- Retires all app-side inserts to public.users. Handler is source of truth.
-- Idempotent, safe to re-run.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  -- Idempotent insert. Populate metadata columns from raw_user_meta_data
  -- so signup form fields aren't lost when we retire the app-side writers.
  -- created_at has default now(); do not override so new signups get wall-clock time.
  insert into public.users (
    id,
    email,
    first_name,
    last_name,
    business_name
  )
  values (
    new.id,
    new.email,
    nullif(trim(meta->>'first_name'), ''),
    nullif(trim(meta->>'last_name'), ''),
    nullif(trim(meta->>'business_name'), '')
  )
  on conflict (id) do nothing;
  return new;
exception
  when others then
    -- Fail-open: never block auth. Log for observability.
    raise notice '[handle_new_auth_user] failed to insert public.users row for auth.users.id=%: % (%)',
      new.id, sqlerrm, sqlstate;
    return new;
end;
$$;

-- Drop any prior trigger by this name (idempotency)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

-- Backfill: any existing auth.users without a public.users row.
-- Copy auth.users.created_at into public.users.created_at explicitly
-- so historical timestamps are preserved (default now() would clobber them).
insert into public.users (
  id,
  email,
  first_name,
  last_name,
  business_name,
  created_at
)
select
  au.id,
  au.email,
  nullif(trim((au.raw_user_meta_data->>'first_name')), ''),
  nullif(trim((au.raw_user_meta_data->>'last_name')), ''),
  nullif(trim((au.raw_user_meta_data->>'business_name')), ''),
  coalesce(au.created_at, now())
from auth.users au
left join public.users pu on pu.id = au.id
where pu.id is null
on conflict (id) do nothing;

comment on function public.handle_new_auth_user() is
  'Phase FIX-USERS-PKEY: single-writer trigger. Do not add app-side inserts to public.users. See docs/fix-users-pkey.md.';
