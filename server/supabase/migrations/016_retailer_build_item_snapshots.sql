

alter table public.build_items
  alter column component_id drop not null;

alter table public.build_items
  add column if not exists component_key text,
  add column if not exists component_snapshot jsonb;

create unique index if not exists idx_build_items_build_component_key
  on public.build_items (build_id, component_key)
  where component_key is not null;

create or replace function public.recalculate_build_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_build uuid := coalesce(new.build_id, old.build_id);
begin
  update public.builds b
     set total_price = coalesce((
           select sum(bi.price_at_add * bi.quantity)
             from public.build_items bi
            where bi.build_id = target_build
         ), 0),
         total_power_watts = coalesce((
           select sum(
             coalesce(
               nullif(bi.component_snapshot ->> 'powerDrawWatts', '')::numeric,
               c.power_draw_watts,
               0
             ) * bi.quantity
           )
             from public.build_items bi
             left join public.components c on c.id = bi.component_id
            where bi.build_id = target_build
         ), 0)
   where b.id = target_build;

  return null;
end;
$$;
