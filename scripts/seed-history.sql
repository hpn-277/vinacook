-- Six weeks of realistic past orders for demos: npm run seed:history (after `npx supabase db reset`).
-- Kept out of supabase/seed.sql because scripts/e2e.ts asserts this month's commission from a clean seed.
\set ON_ERROR_STOP on

do $$ begin
  if exists (select 1 from customers where phone like '0912%') then
    raise exception 'History already seeded. Run `npx supabase db reset` first.';
  end if;
end $$;

begin;
select setseed(0.42);

create temp table hist (phone text, name text, address text, district text, ref text, cycle int, items jsonb) on commit drop;
insert into hist values
  ('0912000001', 'Quán phở Bà Tư',            '21 Hùng Vương',        'Quận 5',     'NVKD01',  5, '{"Bánh phở tươi": 40, "Bún tươi": 15}'),
  ('0912000002', 'Bếp cơm Hạnh Phúc',         '102 Ba Tháng Hai',     'Quận 10',    'NVKD01', 10, '{"Mì trứng": 20, "Hủ tiếu dai": 15}'),
  ('0912000003', 'Nhà hàng Sen Vàng',         '7 Lê Thánh Tôn',       'Quận 1',     'NVKD02', 10, '{"Mì quảng": 25, "Mì vàng sợi nhỏ": 15}'),
  ('0912000004', 'Đại lý Hưng Thịnh',         '250 Xô Viết Nghệ Tĩnh','Bình Thạnh', 'NVKD01',  5, '{"Mì trứng": 80, "Mì vàng sợi nhỏ": 60, "Hủ tiếu dai": 40}'),
  ('0912000005', 'Tạp hóa Kim Ngân',          '15 Huỳnh Tấn Phát',    'Quận 7',     'NVKD02', 15, '{"Mì trứng": 15, "Bún tươi": 10}'),
  ('0912000006', 'Hủ tiếu Nam Vang Út',       '88 Cộng Hòa',          'Tân Bình',   'NVKD02',  5, '{"Hủ tiếu dai": 35}'),
  ('0912000007', 'Bún bò Cô Ba',              '3 Quang Trung',        'Gò Vấp',     null,      5, '{"Bún tươi": 45}'),
  ('0912000008', 'Căn tin trường Bình Thọ',   '1 Võ Văn Ngân',        'Thủ Đức',    'NVKD01', 15, '{"Mì trứng": 30, "Bún tươi": 30}'),
  ('0912000009', 'Chị Hằng',                  '40 Nguyễn Đình Chiểu', 'Quận 3',     null,     15, '{"Mì trứng": 5}'),
  ('0912000010', 'Mì Quảng Bà Mua',           '19 Phan Xích Long',    'Phú Nhuận',  'NVKD02', 10, '{"Mì quảng": 40}'),
  ('0912000011', 'Đại lý Phát Đạt',           '560 Phạm Thế Hiển',    'Quận 8',     'NVKD01', 10, '{"Mì vàng sợi nhỏ": 50, "Bánh phở tươi": 40}'),
  ('0912000012', 'Bún riêu Thảo',             '12 Tên Lửa',           'Bình Tân',   null,     10, '{"Bún tươi": 25, "Bánh phở tươi": 10}');

create temp table today on commit drop as select (now() at time zone 'Asia/Ho_Chi_Minh')::date as d;

insert into customers (phone, name, default_address, default_district, sale_id, created_at)
select h.phone, h.name, h.address, h.district, s.id, (select d from today) - 50
from hist h left join staff s on s.ref_code = h.ref;

create temp table plan on commit drop as
select c.id as customer_id, c.sale_id, c.phone, c.default_address, c.default_district, h.items,
       g::date as pdate, random() as r1, random() as r2, random() as r3
from hist h
join customers c using (phone)
cross join lateral generate_series((select d from today) - 42 + (c.id % h.cycle)::int, (select d from today) - 1, make_interval(days => h.cycle)) g
order by g, c.id;

-- ~5% cancelled; older than a week all paid, recent ones ~60% paid; deliveries happen the morning after production.
insert into orders (customer_id, sale_id, created_by, created_by_staff_id, production_date, address, district, phone,
                    status, payment_status, total, driver_id, delivered_at, created_at)
select p.customer_id, p.sale_id,
       case when p.sale_id is not null and p.r1 < 0.4 then 'sale' else 'customer' end::order_creator,
       case when p.sale_id is not null and p.r1 < 0.4 then p.sale_id end,
       p.pdate, p.default_address, p.default_district, p.phone,
       case when p.r2 < 0.05 then 'cancelled' else 'delivered' end::order_status,
       case when p.r2 >= 0.05 and (p.pdate < (select d from today) - 7 or p.r3 < 0.6) then 'paid' else 'unpaid' end::payment_status,
       0,
       case when p.r2 >= 0.05 then (select id from staff where name = case when p.r3 < 0.5 then 'Tài xế 1' else 'Tài xế 2' end) end,
       case when p.r2 >= 0.05 then ((p.pdate + 1) + time '08:00' + p.r1 * interval '6 hours') at time zone 'Asia/Ho_Chi_Minh' end,
       (p.pdate + time '07:00' + p.r3 * interval '9 hours') at time zone 'Asia/Ho_Chi_Minh'
from plan p
order by p.pdate, p.customer_id;

insert into order_items (order_id, product_id, qty_kg, unit_price)
select o.id, pr.id, greatest(1, round(i.value::numeric * (0.8 + random() * 0.4))), pr.price_per_kg
from plan p
join orders o on o.customer_id = p.customer_id and o.production_date = p.pdate
cross join lateral jsonb_each_text(p.items) i
join products pr on pr.name = i.key;

update orders o set total = t.total
from (select order_id, sum(round(qty_kg * unit_price))::bigint as total from order_items group by order_id) t
where t.order_id = o.id and o.customer_id in (select customer_id from plan);

insert into production_days (date, status, closed_at)
select distinct pdate, 'closed'::day_status, (pdate + time '17:00') at time zone 'Asia/Ho_Chi_Minh'
from plan
on conflict (date) do nothing;

-- Big days are split 60/40 across the two factories, like a manager would.
insert into production_jobs (date, product_id, factory_id, qty_kg, status, received_kg, created_at, updated_at)
select j.date, j.product_id, f.id, j.qty, 'received', j.qty,
       (j.date + time '17:00') at time zone 'Asia/Ho_Chi_Minh', ((j.date + 1) + time '06:00') at time zone 'Asia/Ho_Chi_Minh'
from (
  select d.date, d.product_id, s.factory, s.qty
  from (
    select o.production_date as date, i.product_id, sum(i.qty_kg) as total
    from orders o join order_items i on i.order_id = o.id
    where o.status = 'delivered' and o.customer_id in (select customer_id from plan)
    group by 1, 2
  ) d
  cross join lateral (values
    ('Xưởng Bình Tân', case when d.total > 50 then round(d.total * 0.6) else d.total end),
    ('Xưởng Hóc Môn',  case when d.total > 50 then d.total - round(d.total * 0.6) else 0 end)
  ) s(factory, qty)
  where s.qty > 0
) j
join factories f on f.name = j.factory;

commit;

select count(*) as orders, sum(total) as revenue_vnd, min(production_date) as from_date, max(production_date) as to_date
from orders where phone like '0912%';
