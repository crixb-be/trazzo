-- Keep explicit tombstones so a partial download cannot be mistaken for a deletion.
alter table public.projects add column deleted_at timestamptz;
alter table public.project_takeoffs add column deleted_at timestamptz;
alter table public.fee_quotes add column deleted_at timestamptz;

-- Quote codes are chosen offline. The UUID is the identity, even if two devices
-- independently choose the same display code.
alter table public.fee_quotes drop constraint if exists fee_quotes_user_id_code_key;

create table public.project_records (
  id uuid primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null check (kind in ('note', 'photo')),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null,
  deleted_at timestamptz
);
create index project_records_project_id_idx on public.project_records (project_id);
alter table public.project_records enable row level security;
revoke all on public.project_records from public, anon, authenticated;
grant select, insert, update on public.project_records to authenticated;

create policy project_records_owned on public.project_records
for all to authenticated
using (
  exists (select 1 from public.projects p where p.id = project_records.project_id
    and p.user_id = (select auth.uid()))
)
with check (
  exists (select 1 from public.projects p where p.id = project_records.project_id
    and p.user_id = (select auth.uid()))
);

-- ON CONFLICT locks the existing row before this compares versions. Preserve
-- the edit time from the device, rather than the time the connection recovered.
create function public.keep_latest_offline_version()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if new.updated_at <= old.updated_at then
    return null;
  end if;
  return new;
end;
$$;

drop trigger projects_set_updated_at on public.projects;
drop trigger project_takeoffs_set_updated_at on public.project_takeoffs;
drop trigger fee_quotes_set_updated_at on public.fee_quotes;
create trigger projects_versioned before update on public.projects
for each row execute function public.keep_latest_offline_version();
create trigger project_takeoffs_versioned before update on public.project_takeoffs
for each row execute function public.keep_latest_offline_version();
create trigger fee_quotes_versioned before update on public.fee_quotes
for each row execute function public.keep_latest_offline_version();
create trigger project_records_versioned before update on public.project_records
for each row execute function public.keep_latest_offline_version();
