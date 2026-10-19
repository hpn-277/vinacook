-- VinaCook's real fresh-product catalog (bảng báo giá Quý III/2026, áp dụng từ 01/09/2026).
-- price_per_kg is the "theo bao 30–50 kg" price: the wholesale tier, which the app applies to bulk orders
-- (>= wholesale_min_kg or >= wholesale_min_total); smaller orders pay retail = wholesale + retail_markup_pct.
-- Dry products (priced per carton with quantity tiers) are not imported yet.
-- Idempotent: factories and products are matched by name and never duplicated or overwritten.

insert into factories (name, address, phone)
select f.name, f.address, f.phone
from (values
  ('Chu Hải', null, null),
  ('Miễn Huyền', null, null),
  ('Kim Ửng', null, null),
  ('Phở Việt Gia Truyền', null, null),
  ('Nguyễn Hải', null, null),
  ('Vũ Thị Thắng', null, null),
  ('Minh Anh', null, null),
  ('VinaCook', '022B Lưu Chí Hiếu, Tây Thạnh, TP.HCM', '0949954178')
) as f(name, address, phone)
where not exists (select 1 from factories x where x.name = f.name);

create temp table catalog (sort int, name text, method text, factory text, price integer) on commit drop;
insert into catalog values
  (1,  'Hủ tiếu dai vắt Chu Hải',            'Sấy ráo',   'Chu Hải',             29000),
  (2,  'Hủ tiếu dai rời Chu Hải',            'Sấy ráo',   'Chu Hải',             28000),
  (3,  'Hủ tiếu gói giấy Chu Hải',           'Sấy ráo',   'Chu Hải',             25000),
  (4,  'Phở tươi Chu Hải',                   'Tráng hấp', 'Chu Hải',             13500),
  (5,  'Phở sấy ráo Chu Hải',                'Sấy ráo',   'Chu Hải',             28000),
  (6,  'Hủ tiếu gõ Mai Khánh',               'Sấy ráo',   'Miễn Huyền',          23000),
  (7,  'Hủ tiếu Sadec Kim Ửng',              'Phơi phên', 'Kim Ửng',             20000),
  (8,  'Phở tươi Phở Việt Gia Truyền',       'Tráng hấp', 'Phở Việt Gia Truyền', 13500),
  (9,  'Phở lá Phở Việt Gia Truyền',         'Tráng hấp', 'Phở Việt Gia Truyền', 13500),
  (10, 'Mì quảng trắng Phở Việt Gia Truyền', 'Tráng hấp', 'Phở Việt Gia Truyền', 13500),
  (11, 'Mì quảng vàng',                      'Tráng hấp', 'VinaCook',            13500),
  (12, 'Bánh canh lọc Nguyễn Hải',           'Ép hấp',    'Nguyễn Hải',          10800),
  (13, 'Bánh canh gạo Vũ Thị Thắng',         'Ép hấp',    'Vũ Thị Thắng',        14000),
  (14, 'Bún nhuyễn Minh Anh',                'Ép hấp',    'Minh Anh',            11700),
  (15, 'Bún trung Minh Anh',                 'Ép hấp',    'Minh Anh',            11700),
  (16, 'Bún bò Minh Anh',                    'Ép hấp',    'Minh Anh',            11700),
  (17, 'Bún lá Minh Anh',                    'Ép hấp',    'Minh Anh',            16500),
  (18, 'Mì Tàu trứng',                       'Ép hấp',    'VinaCook',            52000);

insert into products (name, price_per_kg, description, factory_id, status, active)
select c.name, c.price, c.method || '. Đơn vị sản xuất: ' || c.factory || '.', f.id, 'approved', true
from catalog c
join factories f on f.name = c.factory
where not exists (select 1 from products p where p.name = c.name)
order by c.sort;

-- Fresh products sell by the stick (Cây 5 kg) or the sack (Bao 30 kg, Bao 50 kg).
insert into product_packs (product_id, name, kg_per_unit, image_url)
select p.id, pk.name, pk.kg, pk.image
from catalog c
join products p on p.name = c.name
cross join (values ('Cây', 5, '/packs/cay.svg'), ('Bao', 30, '/packs/bao.svg'), ('Bao', 50, '/packs/bao.svg')) as pk(name, kg, image)
on conflict (product_id, name, kg_per_unit) do nothing;
