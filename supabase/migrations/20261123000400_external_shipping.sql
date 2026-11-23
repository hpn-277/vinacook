-- "Ship ngoài": the admin or manager hands a received order to an outside carrier (Grab, Ahamove...) instead of a driver.
-- Booking it takes the carrier's booking screenshot and sends the order out (ready -> out_for_delivery, no driver);
-- delivered takes the delivery photo. Carrier, fee and note are kept for the books; both photos are the proof.

alter table orders
  add column ship_carrier text check (char_length(ship_carrier) between 1 and 100),
  add column ship_fee integer check (ship_fee >= 0),
  add column ship_note text check (char_length(ship_note) <= 500),
  add column ship_booking_photo_path text,
  add constraint orders_ship_check check (ship_carrier is not null or (ship_fee is null and ship_note is null and ship_booking_photo_path is null)),
  add constraint orders_ship_or_driver check (ship_carrier is null or driver_id is null),
  drop constraint orders_check1,
  add constraint orders_check1 check (
    status not in ('assigned', 'out_for_delivery', 'delivered', 'failed') or driver_id is not null or (status <> 'assigned' and ship_carrier is not null)
  );

insert into status_transitions (machine, from_status, to_status) values ('orders', 'ready', 'out_for_delivery') on conflict do nothing;
