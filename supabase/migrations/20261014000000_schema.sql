create type staff_role as enum ('manager', 'sale', 'factory', 'driver');
create type order_status as enum ('placed', 'approved', 'in_production', 'ready', 'assigned', 'delivered', 'failed', 'cancelled');
create type job_status as enum ('assigned', 'accepted', 'rejected', 'shipped', 'received');
create type payment_status as enum ('unpaid', 'paid');
create type order_creator as enum ('customer', 'sale', 'manager');
create type day_status as enum ('open', 'closed');

-- Mirrors DISTRICTS in lib/domain/districts.ts; scripts/e2e.ts asserts they match.
create table districts (name text primary key);
insert into districts (name) values
  ('Quận 1'), ('Quận 3'), ('Quận 4'), ('Quận 5'), ('Quận 6'), ('Quận 7'), ('Quận 8'),
  ('Quận 10'), ('Quận 11'), ('Quận 12'), ('Bình Thạnh'), ('Gò Vấp'), ('Phú Nhuận'),
  ('Tân Bình'), ('Tân Phú'), ('Bình Tân'), ('Thủ Đức'), ('Hóc Môn'), ('Củ Chi'),
  ('Bình Chánh'), ('Nhà Bè'), ('Cần Giờ');

create table settings (
  id boolean primary key default true check (id),
  cutoff_time time not null default '17:00',
  timezone text not null default 'Asia/Ho_Chi_Minh'
);
insert into settings default values;

create table products (
  id bigint generated always as identity primary key,
  name text not null,
  image_url text,
  price_per_kg integer not null check (price_per_kg > 0),
  active boolean not null default true
);

create table factories (
  id bigint generated always as identity primary key,
  name text not null,
  address text,
  phone text,
  capacity_kg_per_day numeric(10, 2) not null check (capacity_kg_per_day >= 0),
  active boolean not null default true
);

create table staff (
  id bigint generated always as identity primary key,
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  role staff_role not null,
  name text not null,
  phone text,
  ref_code text unique,
  commission_pct numeric(5, 2) check (commission_pct between 0 and 100),
  factory_id bigint references factories (id),
  active boolean not null default true,
  check ((role = 'factory') = (factory_id is not null)),
  check (role = 'sale' or (ref_code is null and commission_pct is null))
);

create table customers (
  id bigint generated always as identity primary key,
  phone text not null unique,
  name text not null,
  default_address text,
  default_district text references districts (name),
  sale_id bigint references staff (id),
  created_at timestamptz not null default now()
);

create sequence order_code_seq;

create table orders (
  id bigint generated always as identity primary key,
  code text not null unique default ('DH' || lpad(nextval('order_code_seq')::text, 6, '0')),
  customer_id bigint not null references customers (id),
  sale_id bigint references staff (id),
  created_by order_creator not null,
  created_by_staff_id bigint references staff (id),
  production_date date not null,
  address text not null,
  district text not null references districts (name),
  phone text not null,
  note text,
  status order_status not null default 'placed',
  payment_status payment_status not null default 'unpaid',
  total bigint not null check (total >= 0),
  driver_id bigint references staff (id),
  fail_reason text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  check ((status = 'delivered') = (delivered_at is not null)),
  check (status not in ('assigned', 'delivered', 'failed') or driver_id is not null)
);
create index on orders (production_date, status);
create index on orders (sale_id, delivered_at);

create table order_items (
  order_id bigint not null references orders (id) on delete cascade,
  product_id bigint not null references products (id),
  qty_kg numeric(10, 2) not null check (qty_kg > 0),
  unit_price integer not null check (unit_price > 0),
  primary key (order_id, product_id)
);

create table production_days (
  date date primary key,
  status day_status not null default 'open',
  closed_at timestamptz
);

create table production_jobs (
  id bigint generated always as identity primary key,
  date date not null references production_days (date),
  product_id bigint not null references products (id),
  factory_id bigint not null references factories (id),
  qty_kg numeric(10, 2) not null check (qty_kg > 0),
  status job_status not null default 'assigned',
  received_kg numeric(10, 2) check (received_kg >= 0),
  rejected_reason text,
  replaced_by bigint references production_jobs (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'received') = (received_kg is not null)),
  check (replaced_by is null or status = 'rejected')
);
create index on production_jobs (date);
create index on production_jobs (factory_id, date);

-- Mirrors ORDER_TRANSITIONS / JOB_TRANSITIONS in lib/domain; scripts/e2e.ts asserts they match.
-- The trigger makes the DB reject illegal moves even from bulk RPC updates.
create table status_transitions (
  machine text not null,
  from_status text not null,
  to_status text not null,
  primary key (machine, from_status, to_status)
);
insert into status_transitions (machine, from_status, to_status) values
  ('orders', 'placed', 'approved'),
  ('orders', 'placed', 'cancelled'),
  ('orders', 'approved', 'in_production'),
  ('orders', 'approved', 'cancelled'),
  ('orders', 'in_production', 'ready'),
  ('orders', 'ready', 'assigned'),
  ('orders', 'assigned', 'delivered'),
  ('orders', 'assigned', 'failed'),
  ('orders', 'failed', 'ready'),
  ('orders', 'failed', 'cancelled'),
  ('production_jobs', 'assigned', 'accepted'),
  ('production_jobs', 'assigned', 'rejected'),
  ('production_jobs', 'accepted', 'shipped'),
  ('production_jobs', 'shipped', 'received');

create function guard_status_transition() returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status and not exists (
    select 1 from status_transitions
    where machine = tg_table_name and from_status = old.status::text and to_status = new.status::text
  ) then
    raise exception 'Không thể chuyển trạng thái % -> %', old.status, new.status;
  end if;
  return new;
end $$;

create trigger orders_status_guard before update of status on orders
  for each row execute function guard_status_transition();
create trigger jobs_status_guard before update of status on production_jobs
  for each row execute function guard_status_transition();

create function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger jobs_touch before update on production_jobs
  for each row execute function touch_updated_at();

-- Server-only app: lock everything down from anon/authenticated; the app uses the secret key.
alter table districts enable row level security;
alter table settings enable row level security;
alter table products enable row level security;
alter table factories enable row level security;
alter table staff enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table production_days enable row level security;
alter table production_jobs enable row level security;
alter table status_transitions enable row level security;

-- Server-only app: the public API keys must not reach these functions.
revoke execute on all functions in schema public from public, anon, authenticated;
