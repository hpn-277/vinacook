create function commission_report(p_month date)
returns table (
  sale_id bigint,
  name text,
  ref_code text,
  commission_pct numeric,
  delivered_count bigint,
  delivered_total bigint,
  commission bigint
) language sql stable as $$
  with bounds as (
    select
      date_trunc('month', p_month::timestamp) at time zone s.timezone as from_ts,
      (date_trunc('month', p_month::timestamp) + interval '1 month') at time zone s.timezone as to_ts
    from settings s
  )
  select
    st.id,
    st.name,
    st.ref_code,
    st.commission_pct,
    count(o.id),
    coalesce(sum(o.total), 0)::bigint,
    round(coalesce(sum(o.total), 0) * coalesce(st.commission_pct, 0) / 100)::bigint
  from staff st
  cross join bounds b
  left join orders o
    on o.sale_id = st.id
    and o.status = 'delivered'
    and o.delivered_at >= b.from_ts
    and o.delivered_at < b.to_ts
  where st.role = 'sale'
  group by st.id
  order by st.name;
$$;

-- Server-only app: the public API keys must not reach these functions.
revoke execute on all functions in schema public from public, anon, authenticated;
