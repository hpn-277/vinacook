-- Each product is made by one factory. Closing a day sends each product's kg straight to its factory, so the manager
-- only checks the orders; there is no manual split across factories any more.
alter table products add column factory_id bigint references factories (id);

do $$
begin
  if exists (select 1 from products) and not exists (select 1 from factories) then
    raise exception 'Create a factory before this migration: every product needs one';
  end if;
end $$;
update products set factory_id = (select id from factories order by not active, id limit 1) where factory_id is null;
alter table products alter column factory_id set not null;

drop function close_production_day(date, jsonb);

-- Atomic and idempotent: the day row lock serializes concurrent closes, and a closed day refuses a second run.
-- Every placed order of the day goes to production; the manager cancels unwanted ones before closing.
create function close_production_day(p_date date) returns void language plpgsql as $$
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
    raise exception 'Xưởng ngừng hoạt động: %. Đổi xưởng cho sản phẩm trong Cài đặt', v_inactive;
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

revoke execute on function close_production_day(date) from public, anon, authenticated;
