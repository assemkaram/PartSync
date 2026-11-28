

update public.build_items bi
set price_at_add = round(bi.price_at_add * 50)
from public.components c
where c.id = bi.component_id
  and bi.price_at_add > 0
  and bi.price_at_add < 2500
  and bi.price_at_add * 10 < c.price
  and c.currency is distinct from 'EGP';

update public.components
set currency = 'EGP'
where currency is distinct from 'EGP';
