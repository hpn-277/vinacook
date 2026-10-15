-- Factories make exactly what is ordered, so the manager confirms a whole day at once at the planned kg.
drop function receive_job(bigint, numeric);

create function receive_day(p_date date) returns integer language plpgsql as $$
declare
  v_day production_days;
  v_pending integer;
  v_received integer;
begin
  select * into v_day from production_days where date = p_date for update;
  if v_day is null or v_day.status <> 'closed' then
    raise exception 'Ngày % chưa chốt sản xuất', p_date;
  end if;

  select count(*) into v_pending from production_jobs
  where date = p_date and status not in ('shipped', 'received') and not (status = 'rejected' and replaced_by is not null);
  if v_pending > 0 then
    raise exception 'Còn % lệnh xưởng chưa xuất hàng', v_pending;
  end if;

  update production_jobs set status = 'received', received_kg = qty_kg where date = p_date and status = 'shipped';
  get diagnostics v_received = row_count;
  update orders set status = 'ready' where production_date = p_date and status = 'in_production';
  return v_received;
end $$;

revoke execute on function receive_day(date) from public, anon, authenticated;
revoke execute on function daily_overview(date, date) from public, anon, authenticated;
