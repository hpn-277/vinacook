-- "Khôi phục": the admin can bring a cancelled order back to placed, but only while its production day is still ahead
-- and not closed; once closed, factories already have their jobs, so the order must be entered again.
insert into status_transitions (machine, from_status, to_status) values ('orders', 'cancelled', 'placed') on conflict do nothing;

create function guard_restore_cancelled() returns trigger language plpgsql as $$
begin
  if old.status = 'cancelled' and new.status = 'placed' then
    if new.production_date < (now() at time zone 'Asia/Ho_Chi_Minh')::date then
      raise exception 'Ngày sản xuất % đã qua; tạo đơn mới', new.production_date;
    end if;
    if exists (select 1 from production_days where date = new.production_date and status = 'closed') then
      raise exception 'Đơn ngày % đã gửi cho xưởng; tạo đơn mới', new.production_date;
    end if;
  end if;
  return new;
end $$;

create trigger orders_restore_guard before update of status on orders
  for each row execute function guard_restore_cancelled();
