-- One price per pack, as on VinaCook's price list: Cây 5 kg and Bao 30/50 kg each have their own đ/kg.
-- Replaces the order-wide Sỉ/Lẻ tiers (retail markup, wholesale thresholds); old orders keep their line prices.

alter table product_packs add column price_per_kg integer check (price_per_kg > 0);

update product_packs pk set price_per_kg = p.price_per_kg
from products p where p.id = pk.product_id;

-- "Đơn giá sỉ theo cây 5kg" from bảng báo giá Quý III/2026; the bao price was already products.price_per_kg.
update product_packs pk set price_per_kg = c.price
from products p, (values
  ('Hủ tiếu dai vắt Chu Hải', 32000),
  ('Hủ tiếu dai rời Chu Hải', 29000),
  ('Hủ tiếu gói giấy Chu Hải', 26000),
  ('Phở tươi Chu Hải', 15000),
  ('Phở sấy ráo Chu Hải', 29000),
  ('Hủ tiếu gõ Mai Khánh', 24000),
  ('Hủ tiếu Sadec Kim Ửng', 22000),
  ('Phở tươi Phở Việt Gia Truyền', 15000),
  ('Phở lá Phở Việt Gia Truyền', 15000),
  ('Mì quảng trắng Phở Việt Gia Truyền', 15000),
  ('Mì quảng vàng', 15000),
  ('Bánh canh lọc Nguyễn Hải', 11000),
  ('Bánh canh gạo Vũ Thị Thắng', 15000),
  ('Bún nhuyễn Minh Anh', 13000),
  ('Bún trung Minh Anh', 13000),
  ('Bún bò Minh Anh', 13000),
  ('Bún lá Minh Anh', 18000),
  ('Mì Tàu trứng', 55000)
) as c(name, price)
where p.id = pk.product_id and p.name = c.name and pk.kg_per_unit < 30;

alter table product_packs alter column price_per_kg set not null;

drop function place_order(text, text, text, text, text, jsonb, price_tier, numeric, numeric, bigint, date, order_creator, bigint, bigint);

alter table products drop column price_per_kg;
alter table order_items drop column wholesale_price_per_kg;
alter table orders drop column price_tier, drop column retail_markup_pct, drop column wholesale_min_kg, drop column wholesale_min_total;
alter table settings drop column retail_markup_pct, drop column wholesale_min_kg, drop column wholesale_min_total;
drop type price_tier;

create function place_order(
  p_phone text, p_name text, p_address text, p_district text, p_note text, p_items jsonb,
  p_production_date date, p_created_by order_creator, p_created_by_staff_id bigint default null, p_claim_sale_id bigint default null
) returns jsonb language plpgsql as $$
declare
  v_date date := p_production_date;
  v_customer customers;
  v_order orders;
  v_wanted int;
  v_inserted int;
begin
  create temp table items on commit drop as
  select * from jsonb_to_recordset(p_items) as i(
    pack_id bigint, pack_qty numeric, kg_per_unit numeric, price_per_kg integer, line_total bigint
  ) where i.pack_qty > 0;
  select count(*) into v_wanted from items;
  if v_wanted = 0 then
    raise exception 'Đơn hàng chưa có sản phẩm';
  end if;
  if exists (
    select 1 from items i
    left join product_packs pk on pk.id = i.pack_id
    left join products p on p.id = pk.product_id
    where not coalesce(pk.active and p.active, false)
  ) then
    raise exception 'Có sản phẩm không còn bán';
  end if;

  while exists (select 1 from production_days d where d.date = v_date and d.status = 'closed') loop
    v_date := v_date + 1;
  end loop;

  insert into customers as c (phone, name, default_address, default_district, sale_id)
  values (p_phone, p_name, p_address, p_district, p_claim_sale_id)
  on conflict (phone) do update set
    name = excluded.name,
    default_address = excluded.default_address,
    default_district = excluded.default_district,
    sale_id = coalesce(c.sale_id, excluded.sale_id)
  returning * into v_customer;

  insert into orders (customer_id, sale_id, created_by, created_by_staff_id, production_date, address, district, phone, note, total)
  values (v_customer.id, v_customer.sale_id, p_created_by, p_created_by_staff_id, v_date, p_address, p_district, p_phone, nullif(p_note, ''), 0)
  returning * into v_order;

  insert into order_items (order_id, product_id, pack_id, pack_name, kg_per_unit, pack_qty, price_per_kg, line_total)
  select v_order.id, pk.product_id, pk.id, pk.name, pk.kg_per_unit, i.pack_qty, i.price_per_kg, i.line_total
  from items i
  join product_packs pk on pk.id = i.pack_id and pk.kg_per_unit = i.kg_per_unit and pk.price_per_kg = i.price_per_kg;
  get diagnostics v_inserted = row_count;
  if v_inserted <> v_wanted then
    raise exception 'Giá hoặc quy cách vừa thay đổi, vui lòng tải lại trang và đặt lại';
  end if;

  perform recompute_order_total(v_order.id);
  select * into v_order from orders where id = v_order.id;

  return jsonb_build_object(
    'order_id', v_order.id,
    'code', v_order.code,
    'production_date', v_date,
    'total', v_order.total,
    'sale_id', v_customer.sale_id,
    'claimed_by_other', p_claim_sale_id is not null and v_customer.sale_id is distinct from p_claim_sale_id
  );
end $$;

revoke execute on function place_order(text, text, text, text, text, jsonb, date, order_creator, bigint, bigint) from public, anon, authenticated;
