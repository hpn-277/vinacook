-- A sale collects cash from their own customers, so they can mark those orders paid ("Đã thu") from /sale.
-- Undoing a payment stays with admin and manager.
create or replace function set_payment(p_order_ids bigint[], p_paid boolean, p_staff_id bigint, p_note text) returns integer language plpgsql as $$
declare
  v_to payment_status := case when p_paid then 'paid' else 'unpaid' end;
  v_note text := nullif(trim(p_note), '');
  v_role text;
  v_changed integer;
begin
  select role::text into v_role from staff where id = p_staff_id and active;
  if v_role = 'sale' then
    if not p_paid then
      raise exception 'Chỉ quản trị hoặc quản lý được bỏ đánh dấu đã thu';
    end if;
    if exists (select 1 from orders where id = any (p_order_ids) and sale_id is distinct from p_staff_id) then
      raise exception 'Không tìm thấy hoặc bạn không có quyền';
    end if;
  elsif v_role is null or v_role not in ('admin', 'manager') then
    raise exception 'Chỉ quản trị, quản lý hoặc NVKD được gạch nợ';
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
