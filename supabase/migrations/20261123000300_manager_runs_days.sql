-- The manager now runs the day too: receive from factories, dispatch, unassign, and "Rút lại đơn xưởng" (this function).
create or replace function reopen_production_day(p_date date, p_staff_id bigint) returns integer language plpgsql as $$
declare
  v_day production_days;
  v_dispatched integer;
  v_jobs integer;
  v_orders integer;
begin
  if not exists (select 1 from staff where id = p_staff_id and role::text in ('admin', 'manager') and active) then
    raise exception 'Chỉ quản trị hoặc quản lý được rút lại đơn xưởng';
  end if;
  select * into v_day from production_days where date = p_date for update;
  if v_day is null or v_day.status <> 'closed' then
    raise exception 'Ngày % chưa gửi đơn cho xưởng', p_date;
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
