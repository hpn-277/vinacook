-- Factories and the product catalog come from the migrations (20261031000000_vinacook_catalog.sql); this file adds demo people and orders.
-- Every factory gets a login except VinaCook, whose production the manager runs directly.

create temp table seed_staff (email text, role staff_role, name text, phone text, ref_code text, pct numeric, factory text);
insert into seed_staff values
  ('admin@local', 'admin', 'Quản trị', '0900000009', null, null, null),
  ('manager@local', 'manager', 'Quản lý', '0900000000', null, null, null),
  ('sale1@local', 'sale', 'NVKD 01', '0900000001', 'NVKD01', 5, null),
  ('sale2@local', 'sale', 'NVKD 02', '0900000002', 'NVKD02', 7, null),
  ('factory1@local', 'factory', 'Xưởng Chu Hải', '0281000001', null, null, 'Chu Hải'),
  ('factory2@local', 'factory', 'Xưởng Minh Anh', '0281000002', null, null, 'Minh Anh'),
  ('factory3@local', 'factory', 'Xưởng Nguyễn Hải', '0281000003', null, null, 'Nguyễn Hải'),
  ('factory4@local', 'factory', 'Xưởng Vũ Thị Thắng', '0281000004', null, null, 'Vũ Thị Thắng'),
  ('factory5@local', 'factory', 'Xưởng Miễn Huyền', '0281000005', null, null, 'Miễn Huyền'),
  ('factory6@local', 'factory', 'Xưởng Phở Việt Gia Truyền', '0281000006', null, null, 'Phở Việt Gia Truyền'),
  ('factory7@local', 'factory', 'Xưởng Kim Ửng', '0281000007', null, null, 'Kim Ửng'),
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

-- Seeded sales already hold NVKD01/02; new codes continue after them.
select setval('staff_ref_seq', (select max(substring(ref_code from '^NVKD(\d+)$')::int) from staff) + 1, false);

insert into customers (phone, name, default_address, default_district, sale_id) values
  ('0901000001', 'Chị Lan', '12 Trần Hưng Đạo', 'Quận 5', (select id from staff where ref_code = 'NVKD01')),
  ('0901000002', 'Anh Minh', '45 Cộng Hòa', 'Tân Bình', (select id from staff where ref_code = 'NVKD02')),
  ('0901000003', 'Cô Hoa', '8 Ba Tháng Hai', 'Quận 10', null);

update customers set default_country = 'VN', default_region = 'TP. Hồ Chí Minh' where default_district is not null;

-- History lives in the previous month so it never mixes into the current month's commission.
-- 2 Cây Hủ tiếu dai vắt + 2 Cây Bún bò, each at its Cây 5 kg price.
insert into orders (customer_id, sale_id, created_by, production_date, country, region, address, district, phone, status, payment_status, total, driver_id, departed_at, delivered_at, created_at)
select c.id, c.sale_id, 'customer', (now() - interval '40 days')::date, c.default_country, c.default_region, c.default_address, c.default_district, c.phone,
  'delivered', 'paid', 0, (select id from staff where name = 'Tài xế 1'), now() - interval '40 days' - interval '1 hour', now() - interval '40 days', now() - interval '40 days'
from customers c where c.phone in ('0901000001', '0901000002');

insert into orders (customer_id, sale_id, created_by, production_date, country, region, address, district, phone, status, total, created_at)
select c.id, c.sale_id, 'customer', (now() - interval '38 days')::date, c.default_country, c.default_region, c.default_address, c.default_district, c.phone,
  'cancelled', 0, now() - interval '38 days'
from customers c where c.phone = '0901000003';

insert into order_items (order_id, product_id, pack_id, pack_name, kg_per_unit, pack_qty, price_per_kg, line_total)
select o.id, p.id, pk.id, pk.name, pk.kg_per_unit, l.qty, pk.price_per_kg, l.qty * pk.kg_per_unit * pk.price_per_kg
from orders o
cross join (values ('Hủ tiếu dai vắt Chu Hải', 'Cây', 5, 2), ('Bún bò Minh Anh', 'Cây', 5, 2)) as l(product, pack, kg, qty)
join products p on p.name = l.product
join product_packs pk on pk.product_id = p.id and pk.name = l.pack and pk.kg_per_unit = l.kg;

update orders o set total = (select sum(line_total) from order_items where order_id = o.id);
-- Seeded history predates reviews.
update orders set status = 'placed', reviewed_at = created_at where status = 'pending_review';
