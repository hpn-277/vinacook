create function daily_overview(p_from date, p_to date)
returns table (
  day date,
  orders integer,
  cancelled integer,
  kg numeric,
  revenue bigint,
  paid bigint,
  unpaid bigint
) language sql stable as $$
  select
    o.production_date,
    count(*) filter (where o.status <> 'cancelled')::integer,
    count(*) filter (where o.status = 'cancelled')::integer,
    coalesce(sum(i.kg) filter (where o.status <> 'cancelled'), 0),
    coalesce(sum(o.total) filter (where o.status <> 'cancelled'), 0)::bigint,
    coalesce(sum(o.total) filter (where o.status <> 'cancelled' and o.payment_status = 'paid'), 0)::bigint,
    coalesce(sum(o.total) filter (where o.status <> 'cancelled' and o.payment_status = 'unpaid'), 0)::bigint
  from orders o
  left join lateral (select sum(qty_kg) as kg from order_items where order_id = o.id) i on true
  where o.production_date >= p_from and o.production_date < p_to
  group by o.production_date
  order by o.production_date
$$;
