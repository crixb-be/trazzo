-- TRAZZO / Supabase schema
-- Source of truth: ARCHITECTURE.md, sections 5 and 10.
-- This migration is intentionally explicit so the local and hosted modes share
-- the same constraints, indexes and authorization model.

create extension if not exists pgcrypto;
create extension if not exists vector;

do $$
begin
  create type public.plan_type as enum ('free', 'student', 'pro');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.rne_category as enum (
    'Accesibilidad',
    'Circulación',
    'Seguridad',
    'Sanitarias',
    'Estacionamientos'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.project_status as enum ('activo', 'pausado', 'cerrado');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  plan public.plan_type not null default 'free',
  student_verified boolean not null default false,
  subscription_expires_at timestamptz,
  ai_queries_used integer not null default 0
    constraint profiles_ai_queries_used_check check (ai_queries_used >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Private account state. Protected billing fields are service-role controlled.';
comment on column public.profiles.ai_queries_used is
  'Monthly usage counter; reset by the billing job or webhook workflow.';

create table if not exists public.rne_cards (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  norm_code text not null,
  article text not null,
  category public.rne_category not null,
  keywords text[] not null default '{}',
  min_value numeric,
  unit text not null default '',
  summary text not null,
  body text not null,
  legal_note text not null,
  edition text not null,
  svg_type text not null,
  params jsonb not null default '{}'::jsonb,
  is_pro boolean not null default false,
  verified_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint rne_cards_slug_format check (slug <> ''),
  constraint rne_cards_params_object check (jsonb_typeof(params) = 'object')
);

create table if not exists public.rne_embeddings (
  id uuid primary key default gen_random_uuid(),
  rne_card_id uuid not null references public.rne_cards (id) on delete cascade,
  norm_code text not null,
  article text not null,
  chunk_text text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536) not null,
  created_at timestamptz not null default now(),
  constraint rne_embeddings_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.materials_catalog (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null,
  unit text not null,
  yield_factor numeric not null default 1
    constraint materials_yield_factor_check check (yield_factor >= 0),
  default_waste_pct numeric not null default 5
    constraint materials_waste_check check (default_waste_pct >= 0),
  ref_price_pen numeric(12, 2) not null
    constraint materials_price_check check (ref_price_pen >= 0),
  notes text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  location text not null default '',
  typology text not null default '',
  status public.project_status not null default 'activo',
  updated_at timestamptz not null default now(),
  constraint projects_name_check check (length(trim(name)) > 0)
);

create table if not exists public.project_takeoffs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  part_name text not null,
  material_code text references public.materials_catalog (code) on update cascade,
  length numeric not null default 0
    constraint takeoffs_length_check check (length >= 0),
  width numeric not null default 0
    constraint takeoffs_width_check check (width >= 0),
  height numeric not null default 0
    constraint takeoffs_height_check check (height >= 0),
  quantity numeric not null default 0
    constraint takeoffs_quantity_check check (quantity >= 0),
  yield_factor numeric not null default 1
    constraint takeoffs_yield_check check (yield_factor >= 0),
  waste_pct numeric not null default 0
    constraint takeoffs_waste_check check (waste_pct >= 0),
  total numeric not null default 0
    constraint takeoffs_total_check check (total >= 0),
  subtotal_pen numeric(12, 2) not null default 0
    constraint takeoffs_subtotal_check check (subtotal_pen >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint takeoffs_part_name_check check (length(trim(part_name)) > 0)
);

create table if not exists public.payment_events (
  id text primary key,
  provider text not null
    constraint payment_events_provider_check check (provider in ('mercadopago', 'culqi')),
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

comment on table public.payment_events is
  'Idempotency ledger for payment provider webhook events.';

-- Search, vector and ownership indexes.
create unique index if not exists rne_cards_slug_unique_idx
  on public.rne_cards (slug);

create index if not exists rne_cards_norm_code_idx
  on public.rne_cards (norm_code);

create index if not exists rne_cards_keywords_gin_idx
  on public.rne_cards using gin (keywords);

create index if not exists rne_embeddings_card_idx
  on public.rne_embeddings (rne_card_id);

create index if not exists rne_embeddings_norm_article_idx
  on public.rne_embeddings (norm_code, article);

create index if not exists rne_embeddings_embedding_hnsw_idx
  on public.rne_embeddings
  using hnsw (embedding vector_cosine_ops);

create index if not exists materials_catalog_category_idx
  on public.materials_catalog (category);

create index if not exists projects_user_id_idx
  on public.projects (user_id);

create index if not exists projects_status_idx
  on public.projects (status);

create index if not exists project_takeoffs_project_id_idx
  on public.project_takeoffs (project_id);

create index if not exists project_takeoffs_material_code_idx
  on public.project_takeoffs (material_code);

create index if not exists payment_events_provider_idx
  on public.payment_events (provider);

-- Shared updated_at trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists rne_cards_set_updated_at on public.rne_cards;
create trigger rne_cards_set_updated_at
before update on public.rne_cards
for each row execute function public.set_updated_at();

drop trigger if exists materials_set_updated_at on public.materials_catalog;
create trigger materials_set_updated_at
before update on public.materials_catalog
for each row execute function public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists project_takeoffs_set_updated_at on public.project_takeoffs;
create trigger project_takeoffs_set_updated_at
before update on public.project_takeoffs
for each row execute function public.set_updated_at();

-- Create a profile immediately after Supabase Auth creates a user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Only trusted billing/admin code may change plan, verification, expiry or usage.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    new.plan = old.plan;
    new.student_verified = old.student_verified;
    new.subscription_expires_at = old.subscription_expires_at;
    new.ai_queries_used = old.ai_queries_used;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_columns on public.profiles;
create trigger protect_profile_columns
before update on public.profiles
for each row execute function public.protect_profile_columns();

create or replace function public.has_pro_access()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and plan in ('student', 'pro')
      and subscription_expires_at > now()
  );
$$;

create or replace function public.match_rne_documents(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_norm text default null
)
returns table (
  id uuid,
  norm_code text,
  article text,
  chunk_text text,
  metadata jsonb,
  similarity float
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    e.id,
    e.norm_code,
    e.article,
    e.chunk_text,
    e.metadata,
    1 - (e.embedding <=> query_embedding) as similarity
  from public.rne_embeddings as e
  where e.embedding is not null
    and 1 - (e.embedding <=> query_embedding) >= match_threshold
    and (filter_norm is null or e.norm_code = filter_norm)
  order by e.embedding <=> query_embedding
  limit greatest(0, least(match_count, 100));
$$;

create or replace function public.increment_ai_queries()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count integer;
begin
  update public.profiles
  set ai_queries_used = ai_queries_used + 1,
      updated_at = now()
  where id = auth.uid()
  returning ai_queries_used into next_count;

  return coalesce(next_count, 0);
end;
$$;

-- RLS is on for every application table, including the idempotency ledger.
alter table public.profiles enable row level security;
alter table public.rne_cards enable row level security;
alter table public.rne_embeddings enable row level security;
alter table public.materials_catalog enable row level security;
alter table public.projects enable row level security;
alter table public.project_takeoffs enable row level security;
alter table public.payment_events enable row level security;

-- Profiles: users can read and update their own non-protected fields.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists profiles_service_role on public.profiles;
create policy profiles_service_role
on public.profiles for all
to service_role
using (true)
with check (true);

-- RNE cards: basic cards are public, Pro cards require an active plan.
drop policy if exists rne_cards_public_select on public.rne_cards;
create policy rne_cards_public_select
on public.rne_cards for select
to anon, authenticated
using (not is_pro or public.has_pro_access());

drop policy if exists rne_cards_service_role on public.rne_cards;
create policy rne_cards_service_role
on public.rne_cards for all
to service_role
using (true)
with check (true);

drop policy if exists rne_embeddings_public_select on public.rne_embeddings;
create policy rne_embeddings_public_select
on public.rne_embeddings for select
to anon, authenticated
using (true);

drop policy if exists rne_embeddings_service_role on public.rne_embeddings;
create policy rne_embeddings_service_role
on public.rne_embeddings for all
to service_role
using (true)
with check (true);

drop policy if exists materials_public_select on public.materials_catalog;
create policy materials_public_select
on public.materials_catalog for select
to anon, authenticated
using (true);

drop policy if exists materials_service_role on public.materials_catalog;
create policy materials_service_role
on public.materials_catalog for all
to service_role
using (true)
with check (true);

-- Projects are private to their owner.
drop policy if exists projects_select_own on public.projects;
create policy projects_select_own
on public.projects for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists projects_insert_own on public.projects;
create policy projects_insert_own
on public.projects for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists projects_update_own on public.projects;
create policy projects_update_own
on public.projects for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists projects_delete_own on public.projects;
create policy projects_delete_own
on public.projects for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists projects_service_role on public.projects;
create policy projects_service_role
on public.projects for all
to service_role
using (true)
with check (true);

-- Takeoffs are private whenever their parent project is private.
drop policy if exists takeoffs_select_own on public.project_takeoffs;
create policy takeoffs_select_own
on public.project_takeoffs for select
to authenticated
using (
  exists (
    select 1 from public.projects
    where projects.id = project_takeoffs.project_id
      and projects.user_id = auth.uid()
  )
);

drop policy if exists takeoffs_insert_own on public.project_takeoffs;
create policy takeoffs_insert_own
on public.project_takeoffs for insert
to authenticated
with check (
  exists (
    select 1 from public.projects
    where projects.id = project_takeoffs.project_id
      and projects.user_id = auth.uid()
  )
);

drop policy if exists takeoffs_update_own on public.project_takeoffs;
create policy takeoffs_update_own
on public.project_takeoffs for update
to authenticated
using (
  exists (
    select 1 from public.projects
    where projects.id = project_takeoffs.project_id
      and projects.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.projects
    where projects.id = project_takeoffs.project_id
      and projects.user_id = auth.uid()
  )
);

drop policy if exists takeoffs_delete_own on public.project_takeoffs;
create policy takeoffs_delete_own
on public.project_takeoffs for delete
to authenticated
using (
  exists (
    select 1 from public.projects
    where projects.id = project_takeoffs.project_id
      and projects.user_id = auth.uid()
  )
);

drop policy if exists takeoffs_service_role on public.project_takeoffs;
create policy takeoffs_service_role
on public.project_takeoffs for all
to service_role
using (true)
with check (true);

drop policy if exists payment_events_service_role on public.payment_events;
create policy payment_events_service_role
on public.payment_events for all
to service_role
using (true)
with check (true);

-- Least-privilege API grants. RLS remains the authorization boundary.
grant usage on schema public to anon, authenticated, service_role;
grant select on public.rne_cards, public.rne_embeddings, public.materials_catalog
  to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.projects, public.project_takeoffs
  to authenticated;
grant execute on function public.has_pro_access() to anon, authenticated;
grant execute on function public.match_rne_documents(vector(1536), float, int, text)
  to anon, authenticated;
grant execute on function public.increment_ai_queries() to authenticated;

-- Private student document storage. The first path segment must be auth.uid().
insert into storage.buckets (id, name, public)
values ('student-docs', 'student-docs', false)
on conflict (id) do update set public = false;

drop policy if exists student_docs_insert_own on storage.objects;
create policy student_docs_insert_own
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'student-docs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists student_docs_select_own on storage.objects;
create policy student_docs_select_own
on storage.objects for select
to authenticated
using (
  bucket_id = 'student-docs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists student_docs_update_own on storage.objects;
create policy student_docs_update_own
on storage.objects for update
to authenticated
using (
  bucket_id = 'student-docs'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'student-docs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists student_docs_delete_own on storage.objects;
create policy student_docs_delete_own
on storage.objects for delete
to authenticated
using (
  bucket_id = 'student-docs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

grant select, insert, update, delete on storage.objects to authenticated;
