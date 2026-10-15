-- Orders: ... ready -> assigned ("Chờ lên xe") -> out_for_delivery (driver confirms departure) -> delivered | failed.
-- Delivery proof photos live in the private `delivery-photos` bucket; the app reads them through signed URLs.

drop trigger orders_status_guard on orders;

alter table orders
  drop constraint orders_check,
  drop constraint orders_check1,
  alter column status drop default;
alter type order_status rename to order_status_old;
create type order_status as enum ('placed', 'in_production', 'ready', 'assigned', 'out_for_delivery', 'delivered', 'failed', 'cancelled');
alter table orders alter column status type order_status using status::text::order_status;
drop type order_status_old;

alter table orders
  add column departed_at timestamptz,
  add column delivery_photo_path text;

-- Orders that left before departures were recorded get their delivery time (or now) as departure.
update orders set departed_at = coalesce(delivered_at, now()) where status in ('delivered', 'failed') and departed_at is null;

alter table orders
  alter column status set default 'placed',
  add constraint orders_check check ((status = 'delivered') = (delivered_at is not null)),
  add constraint orders_check1 check (status not in ('assigned', 'out_for_delivery', 'delivered', 'failed') or driver_id is not null),
  add constraint orders_departed_check check (status not in ('out_for_delivery', 'delivered', 'failed') or departed_at is not null),
  add constraint orders_photo_check check (delivery_photo_path is null or status = 'delivered');

delete from status_transitions where machine = 'orders' and from_status = 'assigned';
insert into status_transitions (machine, from_status, to_status) values
  ('orders', 'assigned', 'out_for_delivery'),
  ('orders', 'out_for_delivery', 'delivered'),
  ('orders', 'out_for_delivery', 'failed');

create trigger orders_status_guard before update of status on orders
  for each row execute function guard_status_transition();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('delivery-photos', 'delivery-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
