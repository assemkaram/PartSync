

update public.components
set
  price = round(price * 50),
  store_links = (
    select coalesce(
      jsonb_agg(link || jsonb_build_object('price', round((link ->> 'price')::numeric * 50))),
      '[]'::jsonb
    )
    from jsonb_array_elements(store_links) as link
  )
where price > 0
  and price < 2500;

-- Build totals are derived from their items, so recompute rather than convert:
-- converting the stored total would drift from the sum of the parts.
update public.builds b
set total_price = coalesce(
  (
    select sum(c.price * bi.quantity)
    from public.build_items bi
    join public.components c on c.id = bi.component_id
    where bi.build_id = b.id
  ),
  b.total_price
)
where exists (select 1 from public.build_items bi where bi.build_id = b.id);
