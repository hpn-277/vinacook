-- A driver can hand back an order before loading it (assigned -> ready, an existing edge); the manager reassigns it.
-- The order keeps who returned it and why until it is assigned again; admin_events keeps the history.
alter table orders
  add column returned_by bigint references staff (id),
  add column return_reason text check (char_length(return_reason) <= 500);

alter table admin_events drop constraint admin_events_action_check;
alter table admin_events add constraint admin_events_action_check
  check (action in ('unassign', 'reopen_day', 'edit_contact', 'driver_return'));
