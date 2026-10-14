-- Atomic and idempotent: the day row lock serializes concurrent closes, and a closed day refuses a second run.
create function close_production_day(p_date date, p_alloc jsonb) returns void language plpgsql as $$
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
  if exists (select 1 from orders where production_date = p_date and status = 'placed') then
    raise exception 'Còn đơn chưa duyệt cho ngày %', p_date;
  end if;
  if not exists (select 1 from orders where production_date = p_date and status = 'approved') then
    raise exception 'Không có đơn đã duyệt cho ngày %', p_date;
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
    where o.production_date = p_date and o.status = 'approved'
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

  update orders set status = 'in_production' where production_date = p_date and status = 'approved';
  update production_days set status = 'closed', closed_at = now() where date = p_date;
end $$;

create function reassign_job(p_job_id bigint, p_factory_id bigint) returns bigint language plpgsql as $$
declare
  v_job production_jobs;
  v_new_id bigint;
begin
  select * into v_job from production_jobs where id = p_job_id for update;
  if v_job.status <> 'rejected' then
    raise exception 'Chỉ giao lại lệnh bị từ chối';
  end if;
  if v_job.replaced_by is not null then
    raise exception 'Lệnh này đã được giao lại';
  end if;
  if p_factory_id = v_job.factory_id then
    raise exception 'Chọn xưởng khác xưởng đã từ chối';
  end if;
  if not exists (select 1 from factories where id = p_factory_id and active) then
    raise exception 'Xưởng không hoạt động';
  end if;

  insert into production_jobs (date, product_id, factory_id, qty_kg)
  values (v_job.date, v_job.product_id, p_factory_id, v_job.qty_kg)
  returning id into v_new_id;
  update production_jobs set replaced_by = v_new_id where id = p_job_id;
  return v_new_id;
end $$;

-- Server-only app: the public API keys must not reach these functions.
revoke execute on all functions in schema public from public, anon, authenticated;
