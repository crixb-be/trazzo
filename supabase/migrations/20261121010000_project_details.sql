alter table public.projects
  add column if not exists client text not null default '',
  add column if not exists built_area numeric(12,2) check (built_area is null or built_area >= 0);
