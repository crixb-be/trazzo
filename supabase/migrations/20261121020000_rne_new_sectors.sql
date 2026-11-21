-- New RNE / sector norms: NTS 113 (Salud), A.090 (Servicios Comunales),
-- A.040 and RVM 208-2019-MINEDU (Educación).
-- Additive only: existing rows and values are untouched.

alter type public.rne_category add value if not exists 'Salud';
alter type public.rne_category add value if not exists 'Servicios Comunales';
alter type public.rne_category add value if not exists 'Educación';

-- Official resolution a card was checked against (null = pending documentary check).
alter table public.rne_cards add column if not exists source_resolution text;

comment on column public.rne_cards.source_resolution is
  'Resolución o decreto oficial con el que se contrastó la ficha; null si está pendiente.';
