-- TRAZZO / Fee quotes and editable professional identity
-- Local fee quotes sync privately to the signed-in architect.

alter table public.profiles
  add column if not exists full_name text;
alter table public.profiles
  add column if not exists cap_number text;

comment on column public.profiles.full_name is
  'User-editable professional name used in proposal exports.';
comment on column public.profiles.cap_number is
  'User-editable Colegio de Arquitectos del Perú number.';

create table if not exists public.fee_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  project_name text not null default '',
  client_name text not null default '',
  location text not null default '',
  typology text not null default '',
  area_m2 numeric(12,2) not null default 0 check (area_m2 >= 0),
  total_pen numeric(14,2) not null default 0 check (total_pen >= 0),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, code)
);

create index if not exists fee_quotes_user_updated_idx
  on public.fee_quotes (user_id, updated_at desc);

drop trigger if exists fee_quotes_set_updated_at on public.fee_quotes;
create trigger fee_quotes_set_updated_at
before update on public.fee_quotes
for each row execute function public.set_updated_at();

alter table public.fee_quotes enable row level security;

drop policy if exists fee_quotes_select_own on public.fee_quotes;
create policy fee_quotes_select_own
on public.fee_quotes for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists fee_quotes_insert_own on public.fee_quotes;
create policy fee_quotes_insert_own
on public.fee_quotes for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists fee_quotes_update_own on public.fee_quotes;
create policy fee_quotes_update_own
on public.fee_quotes for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists fee_quotes_delete_own on public.fee_quotes;
create policy fee_quotes_delete_own
on public.fee_quotes for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists fee_quotes_service_role on public.fee_quotes;
create policy fee_quotes_service_role
on public.fee_quotes for all
to service_role
using (true)
with check (true);
