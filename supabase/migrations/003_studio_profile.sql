alter table public.profiles
  add column if not exists studio_name text,
  add column if not exists ruc text,
  add column if not exists studio_address text,
  add column if not exists brand_primary text,
  add column if not exists brand_secondary text,
  add column if not exists logo_url text;

comment on column public.profiles.studio_name is 'Nombre del estudio o empresa del profesional.';
comment on column public.profiles.ruc is 'RUC opcional del estudio.';
comment on column public.profiles.studio_address is 'Ciudad o dirección del estudio.';
comment on column public.profiles.brand_primary is 'Color principal de marca en formato hexadecimal.';
comment on column public.profiles.brand_secondary is 'Color de acento de marca en formato hexadecimal.';
comment on column public.profiles.logo_url is 'Ruta o URL firmada del logo PNG del estudio.';

alter table public.project_takeoffs
  add column if not exists unit_price_pen numeric(12,2) check (unit_price_pen is null or unit_price_pen >= 0);

insert into storage.buckets (id, name, public)
values ('studio-logos', 'studio-logos', false)
on conflict (id) do nothing;

create policy "studio logos select own folder"
on storage.objects for select to authenticated
using (bucket_id = 'studio-logos' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "studio logos insert own folder"
on storage.objects for insert to authenticated
with check (bucket_id = 'studio-logos' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "studio logos update own folder"
on storage.objects for update to authenticated
using (bucket_id = 'studio-logos' and (storage.foldername(name))[1] = (select auth.uid()::text))
with check (bucket_id = 'studio-logos' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "studio logos delete own folder"
on storage.objects for delete to authenticated
using (bucket_id = 'studio-logos' and (storage.foldername(name))[1] = (select auth.uid()::text));
