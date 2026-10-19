-- Managers can correct an order's phone and delivery address; each edit is logged with the old and new values.
alter table admin_events drop constraint admin_events_action_check;
alter table admin_events add constraint admin_events_action_check check (action in ('unassign', 'reopen_day', 'edit_contact'));
