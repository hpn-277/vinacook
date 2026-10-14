insert into products (name, price_per_kg, image_url) values
  ('Mì trứng', 25000, null),
  ('Mì vàng sợi nhỏ', 24000, null),
  ('Hủ tiếu dai', 22000, null),
  ('Bánh phở tươi', 18000, null),
  ('Bún tươi', 15000, null),
  ('Mì quảng', 26000, null);

insert into factories (name, address, phone, capacity_kg_per_day) values
  ('Xưởng Bình Tân', 'Bình Tân, TP.HCM', '0281000001', 500),
  ('Xưởng Hóc Môn', 'Hóc Môn, TP.HCM', '0281000002', 300);

create temp table seed_staff (email text, role staff_role, name text, phone text, ref_code text, pct numeric, factory text);
insert into seed_staff values
  ('manager@local', 'manager', 'Quản lý', '0900000000', null, null, null),
  ('sale1@local', 'sale', 'NVKD 01', '0900000001', 'NVKD01', 5, null),
  ('sale2@local', 'sale', 'NVKD 02', '0900000002', 'NVKD02', 7, null),
  ('factory1@local', 'factory', 'Xưởng Bình Tân', '0281000001', null, null, 'Xưởng Bình Tân'),
  ('factory2@local', 'factory', 'Xưởng Hóc Môn', '0281000002', null, null, 'Xưởng Hóc Môn'),
  ('driver1@local', 'driver', 'Tài xế 1', '0910000001', null, null, null),
  ('driver2@local', 'driver', 'Tài xế 2', '0910000002', null, null, null);

-- Token columns must be '' not NULL or GoTrue fails to load the user on sign-in.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
)
select
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', email,
  extensions.crypt('password123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(),
  '', '', '', '', '', '', '', ''
from seed_staff;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), 'email', now(), now(), now()
from auth.users u join seed_staff s on s.email = u.email;

insert into staff (auth_user_id, role, name, phone, ref_code, commission_pct, factory_id)
select u.id, s.role, s.name, s.phone, s.ref_code, s.pct, f.id
from seed_staff s
join auth.users u on u.email = s.email
left join factories f on f.name = s.factory;

insert into customers (phone, name, default_address, default_district, sale_id) values
  ('0901000001', 'Chị Lan', '12 Trần Hưng Đạo', 'Quận 5', (select id from staff where ref_code = 'NVKD01')),
  ('0901000002', 'Anh Minh', '45 Cộng Hòa', 'Tân Bình', (select id from staff where ref_code = 'NVKD02')),
  ('0901000003', 'Cô Hoa', '8 Ba Tháng Hai', 'Quận 10', null);

-- History lives in the previous month so it never mixes into the current month's commission.
insert into orders (customer_id, sale_id, created_by, production_date, address, district, phone, status, payment_status, total, driver_id, delivered_at, created_at)
select c.id, c.sale_id, 'customer', (now() - interval '40 days')::date, c.default_address, c.default_district, c.phone,
  'delivered', 'paid', 0, (select id from staff where name = 'Tài xế 1'), now() - interval '40 days', now() - interval '40 days'
from customers c where c.phone in ('0901000001', '0901000002');

insert into orders (customer_id, sale_id, created_by, production_date, address, district, phone, status, total, created_at)
select c.id, c.sale_id, 'customer', (now() - interval '38 days')::date, c.default_address, c.default_district, c.phone,
  'cancelled', 0, now() - interval '38 days'
from customers c where c.phone = '0901000003';

insert into order_items (order_id, product_id, qty_kg, unit_price)
select o.id, p.id, 10, p.price_per_kg
from orders o join products p on p.name in ('Mì trứng', 'Bún tươi');

update orders o set total = (select sum(round(qty_kg * unit_price)) from order_items where order_id = o.id);
