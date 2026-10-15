-- The owner runs the business as manager too, so the manager may also confirm payment. The accountant still cannot.
create or replace function guard_payment_change() returns trigger language plpgsql as $$
begin
  if (new.payment_status, new.paid_at, new.paid_by) is distinct from (old.payment_status, old.paid_at, old.paid_by)
     and current_setting('app.set_payment', true) is distinct from 'on' then
    raise exception 'Chỉ thủ quỹ hoặc quản lý được gạch nợ';
  end if;
  return new;
end $$;

create or replace function set_payment(p_order_ids bigint[], p_paid boolean, p_staff_id bigint, p_note text) returns integer language plpgsql as $$
declare
  v_to payment_status := case when p_paid then 'paid' else 'unpaid' end;
  v_note text := nullif(trim(p_note), '');
  v_changed integer;
begin
  if not exists (select 1 from staff where id = p_staff_id and role::text in ('cashier', 'manager') and active) then
    raise exception 'Chỉ thủ quỹ hoặc quản lý được gạch nợ';
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

revoke execute on function set_payment(bigint[], boolean, bigint, text) from public, anon, authenticated;
