-- price_per_kg is the wholesale price; retail adds settings.retail_markup_pct (25%).
insert into products (name, price_per_kg, image_url, description) values
  ('Mì trứng', 25000, '/products/mi-trung.svg', 'Mì trứng tươi làm từ bột mì và trứng gà, sợi vàng dai. Hợp xào, trụng nước lèo. Dùng trong 2 ngày, bảo quản mát.'),
  ('Mì vàng sợi nhỏ', 24000, '/products/mi-vang-soi-nho.svg', 'Sợi mì vàng nhỏ, mềm, chín nhanh. Hợp mì nước, mì hoành thánh. Dùng trong 2 ngày, bảo quản mát.'),
  ('Hủ tiếu dai', 22000, '/products/hu-tieu-dai.svg', 'Hủ tiếu bột gạo sợi dai, không bở khi trụng. Hợp hủ tiếu Nam Vang, hủ tiếu xào. Dùng trong 2 ngày, bảo quản mát.'),
  ('Bánh phở tươi', 18000, '/products/banh-pho-tuoi.svg', 'Bánh phở gạo tươi tráng mỗi sáng, sợi mềm. Hợp phở bò, phở gà, phở xào. Dùng trong 2 ngày, bảo quản mát.'),
  ('Bún tươi', 15000, '/products/bun-tuoi.svg', 'Bún gạo tươi sợi vừa, trắng mềm. Hợp bún chả, bún thịt nướng, bún riêu. Dùng trong 2 ngày, bảo quản mát.'),
  ('Mì quảng', 26000, '/products/mi-quang.svg', 'Sợi mì quảng bản to, màu vàng nghệ. Hợp mì quảng gà, tôm thịt. Dùng trong 2 ngày, bảo quản mát.');

insert into product_packs (product_id, name, kg_per_unit, image_url)
select p.id, pk.name, pk.kg, '/packs/' || case pk.name when 'Thùng' then 'thung' when 'Túi' then 'tui' else lower(pk.name) end || '.svg'
from (values
  ('Mì trứng', 'Kg', 1), ('Mì trứng', 'Thùng', 10), ('Mì trứng', 'Bao', 25),
  ('Mì vàng sợi nhỏ', 'Kg', 1), ('Mì vàng sợi nhỏ', 'Thùng', 10), ('Mì vàng sợi nhỏ', 'Bao', 25),
  ('Hủ tiếu dai', 'Kg', 1), ('Hủ tiếu dai', 'Thùng', 10), ('Hủ tiếu dai', 'Bao', 20),
  ('Bánh phở tươi', 'Kg', 1), ('Bánh phở tươi', 'Túi', 5), ('Bánh phở tươi', 'Thùng', 10),
  ('Bún tươi', 'Kg', 1), ('Bún tươi', 'Túi', 5), ('Bún tươi', 'Thùng', 10),
  ('Mì quảng', 'Kg', 1), ('Mì quảng', 'Thùng', 10), ('Mì quảng', 'Bao', 20)
) as pk(product, name, kg)
join products p on p.name = pk.product
order by p.id, pk.kg;

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
  ('driver2@local', 'driver', 'Tài xế 2', '0910000002', null, null, null),
  ('cashier@local', 'cashier', 'Thủ quỹ', '0920000001', null, null, null),
  ('accountant@local', 'accountant', 'Kế toán', '0920000002', null, null, null);

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
-- 1 Thùng Mì trứng + 10 Kg Bún tươi = 20 kg, under both wholesale thresholds, so retail: 10 × 31.300 + 10 × 18.800.
insert into orders (customer_id, sale_id, created_by, production_date, address, district, phone, status, payment_status, total, driver_id, departed_at, delivered_at, created_at,
                    price_tier, retail_markup_pct, wholesale_min_kg, wholesale_min_total)
select c.id, c.sale_id, 'customer', (now() - interval '40 days')::date, c.default_address, c.default_district, c.phone,
  'delivered', 'paid', 0, (select id from staff where name = 'Tài xế 1'), now() - interval '40 days' - interval '1 hour', now() - interval '40 days', now() - interval '40 days',
  'le', 25, 50, 2000000
from customers c where c.phone in ('0901000001', '0901000002');

insert into orders (customer_id, sale_id, created_by, production_date, address, district, phone, status, total, created_at,
                    price_tier, retail_markup_pct, wholesale_min_kg, wholesale_min_total)
select c.id, c.sale_id, 'customer', (now() - interval '38 days')::date, c.default_address, c.default_district, c.phone,
  'cancelled', 0, now() - interval '38 days', 'le', 25, 50, 2000000
from customers c where c.phone = '0901000003';

insert into order_items (order_id, product_id, pack_id, pack_name, kg_per_unit, pack_qty, wholesale_price_per_kg, price_per_kg, line_total)
select o.id, p.id, pk.id, pk.name, pk.kg_per_unit, l.qty, p.price_per_kg, l.retail, l.qty * pk.kg_per_unit * l.retail
from orders o
cross join (values ('Mì trứng', 'Thùng', 1, 31300), ('Bún tươi', 'Kg', 10, 18800)) as l(product, pack, qty, retail)
join products p on p.name = l.product
join product_packs pk on pk.product_id = p.id and pk.name = l.pack;

update orders o set total = (select sum(line_total) from order_items where order_id = o.id);
