-- Goods arrive factory by factory, so receiving is per factory (one or several at once) instead of the whole day.
-- An order becomes ready ("Đã nhận hàng") only once every factory making something in it has delivered.

drop function receive_day(date);

create function receive_factories(p_date date, p_factory_ids bigint[]) returns integer language plpgsql as $$
declare
  v_day production_days;
  v_done text;
  v_orders integer;
begin
  select * into v_day from production_days where date = p_date for update;
  if v_day is null or v_day.status <> 'closed' then
    raise exception 'Ngày % chưa gửi đơn cho xưởng', p_date;
  end if;

  select string_agg(f.name, ', ') into v_done from factories f
  where f.id = any (p_factory_ids)
    and not exists (select 1 from production_jobs j where j.date = p_date and j.factory_id = f.id and j.status = 'producing');
  if v_done is not null then
    raise exception 'Không còn hàng chờ nhận ngày %: %', p_date, v_done;
  end if;

  update production_jobs set status = 'received', received_kg = qty_kg
  where date = p_date and factory_id = any (p_factory_ids) and status = 'producing';

  update orders o set status = 'ready'
  where o.production_date = p_date and o.status = 'in_production'
    and not exists (
      select 1 from order_items i
      join production_jobs j on j.date = p_date and j.product_id = i.product_id
      where i.order_id = o.id and j.status = 'producing'
    );
  get diagnostics v_orders = row_count;
  return v_orders;
end $$;

revoke execute on function receive_factories(date, bigint[]) from public, anon, authenticated;
