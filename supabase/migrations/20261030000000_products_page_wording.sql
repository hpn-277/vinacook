-- The manager settings page is now "Sản phẩm"; point the inactive-factory error at it.
create or replace function close_production_day(p_date date) returns void language plpgsql as $$
declare
  v_day production_days;
  v_inactive text;
begin
  insert into production_days (date) values (p_date) on conflict do nothing;
  select * into v_day from production_days where date = p_date for update;

  if v_day.status = 'closed' then
    raise exception 'Ngày % đã chốt sản xuất', p_date;
  end if;
  if not exists (select 1 from orders where production_date = p_date and status = 'placed') then
    raise exception 'Không có đơn nào cho ngày %', p_date;
  end if;

  select string_agg(distinct p.name || ' (' || f.name || ')', ', ') into v_inactive
  from order_items oi
  join orders o on o.id = oi.order_id
  join products p on p.id = oi.product_id
  join factories f on f.id = p.factory_id
  where o.production_date = p_date and o.status = 'placed' and not f.active;
  if v_inactive is not null then
    raise exception 'Xưởng ngừng hoạt động: %. Đổi xưởng cho sản phẩm ở trang Sản phẩm', v_inactive;
  end if;

  insert into production_jobs (date, product_id, factory_id, qty_kg)
  select p_date, oi.product_id, p.factory_id, sum(oi.qty_kg)
  from order_items oi
  join orders o on o.id = oi.order_id
  join products p on p.id = oi.product_id
  where o.production_date = p_date and o.status = 'placed'
  group by oi.product_id, p.factory_id;

  update orders set status = 'in_production' where production_date = p_date and status = 'placed';
  update production_days set status = 'closed', closed_at = now() where date = p_date;
end $$;
