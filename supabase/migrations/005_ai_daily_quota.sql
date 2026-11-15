-- TRAZZO / Daily assistant quota
--
-- 1. The quota becomes daily (Lima time) instead of monthly.
-- 2. Fixes the counter: protect_profile_columns reverted every change to
--    ai_queries_used made by a signed-in user, including the one made by
--    increment_ai_queries(), so the counter never moved. The function now
--    raises a transaction-local flag that the trigger honours.
-- 3. Anonymous usage is counted in the database instead of server memory.

alter table public.profiles
  add column if not exists ai_queries_day date;

comment on column public.profiles.ai_queries_used is
  'Assistant queries used on ai_queries_day (Lima time); resets when the day changes.';
comment on column public.profiles.ai_queries_day is
  'Day (America/Lima) that ai_queries_used refers to.';

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
    -- Only increment_ai_queries() may move the usage counter.
    if coalesce(current_setting('trazzo.usage_update', true), '') <> '1' then
      new.ai_queries_used = old.ai_queries_used;
      new.ai_queries_day = old.ai_queries_day;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.increment_ai_queries()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count integer;
  today date := (now() at time zone 'America/Lima')::date;
begin
  perform set_config('trazzo.usage_update', '1', true);

  update public.profiles
  set ai_queries_used = case when ai_queries_day = today then ai_queries_used + 1 else 1 end,
      ai_queries_day = today,
      updated_at = now()
  where id = auth.uid()
  returning ai_queries_used into next_count;

  perform set_config('trazzo.usage_update', '', true);
  return coalesce(next_count, 0);
end;
$$;

-- Anonymous visitors: one row per hashed client key and day. Service role only.
create table if not exists public.ai_anonymous_usage (
  key text not null,
  day date not null,
  count integer not null default 0 check (count >= 0),
  primary key (key, day)
);

alter table public.ai_anonymous_usage enable row level security;

comment on table public.ai_anonymous_usage is
  'Daily assistant usage for visitors without an account, keyed by a hash of the client address.';

-- Returns true and counts the query when the visitor is still under the limit.
create or replace function public.consume_anonymous_ai_query(p_key text, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'America/Lima')::date;
  next_count integer;
begin
  insert into public.ai_anonymous_usage (key, day, count)
  values (p_key, today, 1)
  on conflict (key, day) do update
    set count = public.ai_anonymous_usage.count + 1
    where public.ai_anonymous_usage.count < p_limit
  returning count into next_count;

  return next_count is not null;
end;
$$;

revoke all on function public.consume_anonymous_ai_query(text, integer) from public, anon, authenticated;
grant execute on function public.consume_anonymous_ai_query(text, integer) to service_role;
