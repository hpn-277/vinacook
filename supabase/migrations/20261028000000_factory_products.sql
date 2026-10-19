-- Factories propose the products they make; the manager approves them before customers can order them.
create type product_status as enum ('pending', 'approved', 'rejected');

alter table products
  add column status product_status not null default 'approved',
  add column reject_reason text check (char_length(reject_reason) <= 500),
  add column submitted_by bigint references staff (id);
alter table products alter column status set default 'pending';

-- Only an approved product can be on sale, so every existing "active" check (shop, place_order, reorder)
-- already means "approved and on sale".
alter table products add constraint products_active_needs_approval check (not active or status = 'approved');
