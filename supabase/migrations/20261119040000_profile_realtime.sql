-- Live profile updates across devices.
--
-- The app subscribes to UPDATE events on its own profiles row (RLS still applies:
-- profiles_select_own lets each user receive only their row). When another device
-- saves the photo, logo or studio data, the open app syncs at once instead of
-- waiting for a reload. Safe to run more than once.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end;
$$;
