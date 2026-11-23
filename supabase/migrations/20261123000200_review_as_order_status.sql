-- Reviewing is a step of the order's lifecycle, not a second status: an order a customer placed starts at
-- pending_review; the sale (or admin/manager for walk-ins) moves it to placed, or cancels it as invalid ("Không hợp lệ",
-- the reason kept in review_note). reviewed_by/reviewed_at/review_note stay as the record of who decided.

-- A backfill, not a lifecycle move, so past the transition guard.
alter table orders disable trigger orders_status_guard;
update orders set status = 'pending_review' where status = 'placed' and review_status = 'pending';
alter table orders enable trigger orders_status_guard;

drop trigger orders_restore_review on orders;
drop function reset_review_on_restore();
drop index orders_pending_review;
alter table orders drop constraint orders_rejected_is_cancelled, drop column review_status;
drop type review_status;
create index orders_pending_review on orders (production_date) where status = 'pending_review';

insert into status_transitions (machine, from_status, to_status) values
  ('orders', 'pending_review', 'placed'),
  ('orders', 'pending_review', 'cancelled'),
  ('orders', 'cancelled', 'pending_review')
on conflict do nothing;

create or replace function set_initial_review() returns trigger language plpgsql as $$
begin
  if new.created_by <> 'customer' then
    new.reviewed_by := new.created_by_staff_id;
    new.reviewed_at := now();
  elsif new.status = 'placed' then
    new.status := 'pending_review';
  end if;
  return new;
end $$;

-- "Khôi phục": only while the production day is ahead and not sent to the factories. A customer's order that was
-- never approved (cancelled as invalid, or cancelled while still unreviewed) goes back to be checked again.
create or replace function guard_restore_cancelled() returns trigger language plpgsql as $$
begin
  if old.status = 'cancelled' and new.status in ('placed', 'pending_review') then
    if new.production_date < (now() at time zone 'Asia/Ho_Chi_Minh')::date then
      raise exception 'Ngày sản xuất % đã qua; tạo đơn mới', new.production_date;
    end if;
    if exists (select 1 from production_days where date = new.production_date and status = 'closed') then
      raise exception 'Đơn ngày % đã gửi cho xưởng; tạo đơn mới', new.production_date;
    end if;
    if old.review_note is not null or (old.created_by = 'customer' and old.reviewed_at is null) then
      new.status := 'pending_review';
      new.reviewed_by := null;
      new.reviewed_at := null;
      new.review_note := null;
    end if;
  end if;
  return new;
end $$;

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
  select count(*) into v_pending from orders where production_date = p_date and status = 'pending_review';
  if v_pending > 0 then
    raise exception 'Còn % đơn chưa duyệt ngày %; duyệt hoặc đánh dấu không hợp lệ trước khi gửi xưởng', v_pending, p_date;
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

revoke execute on function close_production_day(date) from public, anon, authenticated;
