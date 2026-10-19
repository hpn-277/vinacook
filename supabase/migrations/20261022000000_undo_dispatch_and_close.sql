-- Manager undo actions: take an order back from a driver before loading, and reopen a closed production day.

-- assigned -> ready: "Hủy phân công" (only before the driver confirms loading).
-- in_production/ready -> placed: only through reopen_production_day below.
insert into status_transitions (machine, from_status, to_status) values
  ('orders', 'assigned', 'ready'),
  ('orders', 'in_production', 'placed'),
  ('orders', 'ready', 'placed')
on conflict do nothing;

create table admin_events (
  id bigint generated always as identity primary key,
  staff_id bigint not null references staff (id),
  action text not null check (action in ('unassign', 'reopen_day')),
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on admin_events (created_at);
alter table admin_events enable row level security;

-- Atomic: the day row lock serialises against close/receive. Refused once any order of the day has a driver,
-- because goods may already be on a truck; unassign those first.
create function reopen_production_day(p_date date, p_staff_id bigint) returns integer language plpgsql as $$
declare
  v_day production_days;
  v_dispatched integer;
  v_jobs integer;
  v_orders integer;
begin
  if not exists (select 1 from staff where id = p_staff_id and role::text = 'manager' and active) then
    raise exception 'Chỉ quản lý được mở lại ngày sản xuất';
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

revoke execute on function reopen_production_day(date, bigint) from public, anon, authenticated;
