-- Orders customers place themselves are checked before production, so the office no longer reviews every one:
-- the sale whose ref link brought the customer reviews it on /sale; walk-in orders (no sale) go to admin or manager.
-- Orders a sale or the admin enters are approved as they are entered. "Không hợp lệ" also cancels the order.
-- Sending a day to the factories waits until none of its orders is still unreviewed.

create type review_status as enum ('pending', 'approved', 'rejected');

alter table orders
  add column review_status review_status not null default 'approved',
  add column reviewed_by bigint references staff(id),
  add column reviewed_at timestamptz,
  add column review_note text check (char_length(review_note) <= 500),
  add constraint orders_rejected_is_cancelled check (review_status <> 'rejected' or status = 'cancelled');
alter table orders alter column review_status set default 'pending';

create index orders_pending_review on orders (production_date) where review_status = 'pending';

create or replace function set_initial_review() returns trigger language plpgsql as $$
begin
  if new.created_by <> 'customer' then
    new.review_status := 'approved';
    new.reviewed_by := new.created_by_staff_id;
    new.reviewed_at := now();
  end if;
  return new;
end $$;

create trigger orders_initial_review before insert on orders for each row execute function set_initial_review();

-- "Khôi phục" an order rejected as invalid puts it back in the queue to be checked again.
create or replace function reset_review_on_restore() returns trigger language plpgsql as $$
begin
  if old.status = 'cancelled' and new.status = 'placed' and new.review_status = 'rejected' then
    new.review_status := 'pending';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.review_note := null;
  end if;
  return new;
end $$;

create trigger orders_restore_review before update of status on orders for each row execute function reset_review_on_restore();

create or replace function close_production_day(p_date date) returns void language plpgsql as $$
declare
  v_day production_days;
  v_inactive text;
  v_pending int;
begin
  insert into production_days (date) values (p_date) on conflict do nothing;
  select * into v_day from production_days where date = p_date for update;
  if v_day.status = 'closed' then
    raise exception 'Đơn ngày % đã gửi cho xưởng rồi', p_date;
  end if;
  if not exists (select 1 from orders where production_date = p_date and status = 'placed') then
    raise exception 'Không có đơn nào cho ngày %', p_date;
  end if;
  select count(*) into v_pending from orders where production_date = p_date and status = 'placed' and review_status = 'pending';
  if v_pending > 0 then
    raise exception 'Còn % đơn chưa duyệt ngày %; duyệt hoặc đánh dấu không hợp lệ trước khi gửi xưởng', v_pending, p_date;
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

revoke execute on function close_production_day(date) from public, anon, authenticated;
