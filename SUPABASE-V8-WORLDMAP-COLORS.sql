-- OUR LITTLE HOUSE V8 — CUSTOM WORLD MAP COLORS
-- Run once in Supabase SQL Editor.

alter table public.countries
add column if not exists custom_color text;

-- Optional validation: only allow CSS hex colors or NULL.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'countries_custom_color_hex'
  ) then
    alter table public.countries
    add constraint countries_custom_color_hex
    check (custom_color is null or custom_color ~ '^#[0-9A-Fa-f]{6}$');
  end if;
end $$;
