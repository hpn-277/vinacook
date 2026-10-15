-- Only the manager moves orders and jobs: no approval step, factories never click anything.
-- Orders: placed -> in_production (close day) -> ready (receive day) -> assigned -> delivered | failed.
-- Jobs: producing (close day) -> received (receive day).

drop function reassign_job(bigint, bigint);

drop trigger orders_status_guard on orders;
drop trigger jobs_status_guard on production_jobs;

-- Orders: drop `approved`; approved orders go back to placed and are sent to production by the next close.
alter table orders
  drop constraint orders_check,
  drop constraint orders_check1,
  alter column status drop default;
alter type order_status rename to order_status_old;
create type order_status as enum ('placed', 'in_production', 'ready', 'assigned', 'delivered', 'failed', 'cancelled');
alter table orders alter column status type order_status
  using (case status::text when 'approved' then 'placed' else status::text end)::order_status;
drop type order_status_old;
alter table orders
  alter column status set default 'placed',
  add constraint orders_check check ((status = 'delivered') = (delivered_at is not null)),
  add constraint orders_check1 check (status not in ('assigned', 'delivered', 'failed') or driver_id is not null);

-- Jobs: a replaced rejection is history only; everything not yet received is still producing.
delete from production_jobs where status = 'rejected' and replaced_by is not null;
alter table production_jobs
  drop column replaced_by,
  drop column rejected_reason,
  drop constraint production_jobs_check,
  alter column status drop default;
alter type job_status rename to job_status_old;
create type job_status as enum ('producing', 'received');
alter table production_jobs alter column status type job_status
  using (case status::text when 'received' then 'received' else 'producing' end)::job_status;
drop type job_status_old;
alter table production_jobs
  alter column status set default 'producing',
  add constraint production_jobs_check check ((status = 'received') = (received_kg is not null));

delete from status_transitions;
insert into status_transitions (machine, from_status, to_status) values
  ('orders', 'placed', 'in_production'),
  ('orders', 'placed', 'cancelled'),
  ('orders', 'in_production', 'ready'),
  ('orders', 'ready', 'assigned'),
  ('orders', 'assigned', 'delivered'),
  ('orders', 'assigned', 'failed'),
  ('orders', 'failed', 'ready'),
  ('orders', 'failed', 'cancelled'),
  ('production_jobs', 'producing', 'received');

create trigger orders_status_guard before update of status on orders
  for each row execute function guard_status_transition();
create trigger jobs_status_guard before update of status on production_jobs
  for each row execute function guard_status_transition();

-- Atomic and idempotent: the day row lock serializes concurrent closes, and a closed day refuses a second run.
-- Every placed order of the day goes to production; the manager cancels unwanted ones before closing.
create or replace function close_production_day(p_date date, p_alloc jsonb) returns void language plpgsql as $$
declare
  v_day production_days;
  v_mismatch text;
  v_bad_factory text;
begin
  insert into production_days (date) values (p_date) on conflict do nothing;
  select * into v_day from production_days where date = p_date for update;

  if v_day.status = 'closed' then
    raise exception 'Ngày % đã chốt sản xuất', p_date;
  end if;
  if not exists (select 1 from orders where production_date = p_date and status = 'placed') then
    raise exception 'Không có đơn nào cho ngày %', p_date;
  end if;

  create temp table alloc on commit drop as
  select a.product_id, a.factory_id, sum(a.qty_kg) as qty_kg
  from jsonb_to_recordset(p_alloc) as a(product_id bigint, factory_id bigint, qty_kg numeric)
  where a.qty_kg > 0
  group by 1, 2;

  select string_agg(f.name, ', ') into v_bad_factory
  from (select distinct factory_id from alloc) a
  join factories f on f.id = a.factory_id
  where not f.active;
  if v_bad_factory is not null then
    raise exception 'Xưởng không hoạt động: %', v_bad_factory;
  end if;

  with need as (
    select oi.product_id, sum(oi.qty_kg) as qty
    from order_items oi join orders o on o.id = oi.order_id
    where o.production_date = p_date and o.status = 'placed'
    group by 1
  ), given as (
    select product_id, sum(qty_kg) as qty from alloc group by 1
  )
  select string_agg(p.name || ' (cần ' || coalesce(need.qty, 0) || ', chia ' || coalesce(given.qty, 0) || ')', ', ')
  into v_mismatch
  from need full join given using (product_id)
  join products p on p.id = product_id
  where need.qty is distinct from given.qty;
  if v_mismatch is not null then
    raise exception 'Phân bổ chưa khớp tổng kg: %', v_mismatch;
  end if;

  insert into production_jobs (date, product_id, factory_id, qty_kg)
  select p_date, product_id, factory_id, qty_kg from alloc;

  update orders set status = 'in_production' where production_date = p_date and status = 'placed';
  update production_days set status = 'closed', closed_at = now() where date = p_date;
end $$;

-- Factories make exactly what is ordered, so the manager confirms a whole closed day at once at the planned kg.
create or replace function receive_day(p_date date) returns integer language plpgsql as $$
declare
  v_day production_days;
  v_received integer;
begin
  select * into v_day from production_days where date = p_date for update;
  if v_day is null or v_day.status <> 'closed' then
    raise exception 'Ngày % chưa chốt sản xuất', p_date;
  end if;

  update production_jobs set status = 'received', received_kg = qty_kg where date = p_date and status = 'producing';
  get diagnostics v_received = row_count;
  update orders set status = 'ready' where production_date = p_date and status = 'in_production';
  return v_received;
end $$;

-- Server-only app: the public API keys must not reach these functions.
revoke execute on all functions in schema public from public, anon, authenticated;
