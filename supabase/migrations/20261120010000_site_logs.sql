create table public.site_logs (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create index site_logs_user_id_idx on public.site_logs (user_id, id);
create index site_logs_project_id_idx on public.site_logs (project_id);

alter table public.site_logs enable row level security;
revoke all on public.site_logs from public, anon, authenticated;
grant select, insert, update on public.site_logs to authenticated;

create policy site_logs_owner on public.site_logs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create trigger site_logs_keep_latest_version
  before update on public.site_logs
  for each row execute function public.keep_latest_offline_version();
