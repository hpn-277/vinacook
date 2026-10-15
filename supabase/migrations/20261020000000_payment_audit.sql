-- Gạch nợ: only the cashier (Thủ quỹ) confirms payment; the accountant (Kế toán) reads debt but cannot settle it.
-- Every payment change goes through set_payment(), which logs one payment_events row per order it actually changes.

alter type staff_role add value if not exists 'cashier';
alter type staff_role add value if not exists 'accountant';

create type payment_action as enum ('paid', 'unpaid');

-- Orders paid before this migration keep paid_at/paid_by null: there is no record of who took the money.
alter table orders
  add column paid_at timestamptz,
  add column paid_by bigint references staff (id);

create table payment_events (
  id bigint generated always as identity primary key,
  order_id bigint not null references orders (id),
  staff_id bigint not null references staff (id),
  action payment_action not null,
  amount bigint not null check (amount >= 0),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);
create index on payment_events (created_at);
create index on payment_events (order_id);
alter table payment_events enable row level security;

-- Any other writer of payment columns fails, including a stray UPDATE from the app.
create function guard_payment_change() returns trigger language plpgsql as $$
begin
  if (new.payment_status, new.paid_at, new.paid_by) is distinct from (old.payment_status, old.paid_at, old.paid_by)
     and current_setting('app.set_payment', true) is distinct from 'on' then
    raise exception 'Chỉ thủ quỹ được gạch nợ';
  end if;
  return new;
end $$;

create trigger orders_payment_guard before update of payment_status, paid_at, paid_by on orders
  for each row execute function guard_payment_change();

-- Atomic and idempotent: only orders whose state really changes are updated and logged, so a retry or a
-- concurrent second click finds nothing to change (the row lock re-checks payment_status) and logs nothing.
create function set_payment(p_order_ids bigint[], p_paid boolean, p_staff_id bigint, p_note text) returns integer language plpgsql as $$
declare
  v_to payment_status := case when p_paid then 'paid' else 'unpaid' end;
  v_note text := nullif(trim(p_note), '');
  v_changed integer;
begin
  if not exists (select 1 from staff where id = p_staff_id and role::text = 'cashier' and active) then
    raise exception 'Chỉ thủ quỹ được gạch nợ';
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

revoke execute on all functions in schema public from public, anon, authenticated;
