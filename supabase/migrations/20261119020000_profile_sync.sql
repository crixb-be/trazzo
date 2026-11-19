-- Profile and studio brand sync (device <-> cloud).
--
-- The app sends the whole profile in one row: the photo and the studio logo travel
-- as compressed data URLs (each under 150 KB decoded), and profile_updated_at is the
-- device time of the edit; the newest one wins on every device.
-- updated_at cannot serve: the service role also bumps it (AI quota, billing).

alter table public.profiles
  add column if not exists avatar_data_url text,
  add column if not exists logo_data_url text,
  add column if not exists profile_updated_at timestamptz;

comment on column public.profiles.avatar_data_url is
  'Foto de perfil como data URL JPEG comprimida (< 150 KB). La escribe la app al sincronizar.';
comment on column public.profiles.logo_data_url is
  'Logo del estudio como data URL PNG/JPEG comprimida (< 150 KB). La escribe la app al sincronizar.';
comment on column public.profiles.profile_updated_at is
  'Momento de la última edición del perfil en un dispositivo; gana el más reciente.';

-- 150 KB decoded is about 205 000 base64 characters plus the header: cap at 220 000
-- and accept only image data URLs, so the row can never carry anything else.
alter table public.profiles drop constraint if exists profiles_avatar_data_url_check;
alter table public.profiles
  add constraint profiles_avatar_data_url_check
  check (
    avatar_data_url is null
    or (length(avatar_data_url) <= 220000 and avatar_data_url like 'data:image/%')
  );

alter table public.profiles drop constraint if exists profiles_logo_data_url_check;
alter table public.profiles
  add constraint profiles_logo_data_url_check
  check (
    logo_data_url is null
    or (length(logo_data_url) <= 220000 and logo_data_url like 'data:image/%')
  );

-- Row access is unchanged: profiles_select_own / profiles_update_own already limit
-- every read and write to auth.uid() = id, and protect_profile_columns keeps plan,
-- quota and subscription fields out of the user's reach. Re-assert them in case a
-- project was created without the initial migration's policies.
alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);
