-- Roles become admin (the owner: everything), manager (day orders, month overview, staff read-only; may mark orders paid), sale, factory, driver.
-- Today's managers run the business, so they become admins; cashier and accountant are dropped and their rows become read-only managers.
-- Postgres cannot drop enum values, so the type is rebuilt. The role checks are re-added because they bind to the old type.

do $$
declare c record;
begin
  for c in select conname from pg_constraint where conrelid = 'staff'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%role%' loop
    execute format('alter table staff drop constraint %I', c.conname);
  end loop;
end $$;

alter type staff_role rename to staff_role_old;
create type staff_role as enum ('admin', 'manager', 'sale', 'factory', 'driver');

alter table staff alter column role type staff_role using (
  case role::text
    when 'manager' then 'admin'
    when 'cashier' then 'manager'
    when 'accountant' then 'manager'
    else role::text
  end
)::staff_role;

drop type staff_role_old;

alter table staff
  add constraint staff_factory_role check ((role = 'factory') = (factory_id is not null)),
  add constraint staff_sale_fields check (role = 'sale' or (ref_code is null and commission_pct is null));

create or replace function guard_payment_change() returns trigger language plpgsql as $$
begin
  if (new.payment_status, new.paid_at, new.paid_by) is distinct from (old.payment_status, old.paid_at, old.paid_by)
     and current_setting('app.set_payment', true) is distinct from 'on' then
    raise exception 'Chỉ quản trị hoặc quản lý được gạch nợ';
  end if;
  return new;
end $$;

create or replace function set_payment(p_order_ids bigint[], p_paid boolean, p_staff_id bigint, p_note text) returns integer language plpgsql as $$
declare
  v_to payment_status := case when p_paid then 'paid' else 'unpaid' end;
  v_note text := nullif(trim(p_note), '');
  v_changed integer;
begin
  if not exists (select 1 from staff where id = p_staff_id and role::text in ('admin', 'manager') and active) then
    raise exception 'Chỉ quản trị hoặc quản lý được gạch nợ';
  end if;
  if not p_paid and v_note is null then
    raise exception 'Nhập lý do bỏ đánh dấu đã thu';
  end if;

  perform set_config('app.set_payment', 'on', true);
  with changed as (
    update orders
    set payment_status = v_to,
        paid_at = case when p_paid then now() end,
        paid_by = case when p_paid then p_staff_id end
    where id = any (p_order_ids) and status <> 'cancelled' and payment_status <> v_to
    returning id, total
  )
  insert into payment_events (order_id, staff_id, action, amount, note)
  select id, p_staff_id, v_to::text::payment_action, total, v_note from changed;
  get diagnostics v_changed = row_count;
  perform set_config('app.set_payment', 'off', true);
  return v_changed;
end $$;

create or replace function reopen_production_day(p_date date, p_staff_id bigint) returns integer language plpgsql as $$
declare
  v_day production_days;
  v_dispatched integer;
  v_jobs integer;
  v_orders integer;
begin
  if not exists (select 1 from staff where id = p_staff_id and role::text = 'admin' and active) then
    raise exception 'Chỉ quản trị được mở lại ngày sản xuất';
  end if;
  select * into v_day from production_days where date = p_date for update;
  if v_day is null or v_day.status <> 'closed' then
    raise exception 'Ngày % chưa chốt sản xuất', p_date;
  end if;

  select count(*) into v_dispatched from orders
  where production_date = p_date and status in ('assigned', 'out_for_delivery', 'delivered', 'failed');
  if v_dispatched > 0 then
    raise exception 'Còn % đơn đã giao cho tài xế; hủy phân công trước khi mở lại ngày', v_dispatched;
  end if;

  update orders set status = 'placed' where production_date = p_date and status in ('in_production', 'ready');
  get diagnostics v_orders = row_count;
  delete from production_jobs where date = p_date;
  get diagnostics v_jobs = row_count;
  delete from production_days where date = p_date;

  insert into admin_events (staff_id, action, detail)
  values (p_staff_id, 'reopen_day', jsonb_build_object('date', p_date, 'orders', v_orders, 'jobs', v_jobs));
  return v_orders;
end $$;

revoke execute on function set_payment(bigint[], boolean, bigint, text) from public, anon, authenticated;
revoke execute on function reopen_production_day(date, bigint) from public, anon, authenticated;
