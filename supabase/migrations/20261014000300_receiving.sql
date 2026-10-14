-- A day's orders become ready once every live job is received; a rejected job counts only after it was replaced.
create function receive_job(p_job_id bigint, p_received_kg numeric) returns boolean language plpgsql as $$
declare
  v_job production_jobs;
  v_all_in boolean;
begin
  select * into v_job from production_jobs where id = p_job_id;
  perform 1 from production_days where date = v_job.date for update;
  select * into v_job from production_jobs where id = p_job_id for update;

  if v_job.status <> 'shipped' then
    raise exception 'Chỉ nhận hàng cho lệnh đã xuất (đang ở trạng thái %)', v_job.status;
  end if;
  update production_jobs set status = 'received', received_kg = p_received_kg where id = p_job_id;

  select not exists (
    select 1 from production_jobs
    where date = v_job.date
      and not (status = 'received' or (status = 'rejected' and replaced_by is not null))
  ) into v_all_in;

  if v_all_in then
    update orders set status = 'ready' where production_date = v_job.date and status = 'in_production';
  end if;
  return v_all_in;
end $$;

-- Server-only app: the public API keys must not reach these functions.
revoke execute on all functions in schema public from public, anon, authenticated;
