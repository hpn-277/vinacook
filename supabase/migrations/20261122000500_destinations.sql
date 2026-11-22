-- Orders from anywhere in Việt Nam and from Australia, not only TP. Hồ Chí Minh's districts.
-- An order's destination: country, region (tỉnh/thành or AU state), district (quận/huyện, phường/xã or AU suburb),
-- postcode (AU only), street address and an optional company. HCMC orders still pick district from the app's list,
-- which drivers are dispatched by; the API checks that, so the districts table and its foreign keys go.
-- bl_no / loading_port: the admin records the bill of lading and port/airport once a shipment is booked.

alter table orders drop constraint orders_district_fkey;
alter table customers drop constraint customers_default_district_fkey;
drop table districts;

alter table orders
  add column country text not null default 'VN' check (country in ('VN', 'AU')),
  add column region text not null default 'TP. Hồ Chí Minh' check (char_length(region) <= 100),
  add column postcode text check (postcode ~ '^\d{4}$'),
  add column company text check (char_length(company) <= 200),
  add column bl_no text check (char_length(bl_no) <= 100),
  add column loading_port text check (char_length(loading_port) <= 200),
  add constraint orders_district_length check (char_length(district) <= 100),
  add constraint orders_au_postcode check (country <> 'AU' or postcode is not null);
alter table orders alter column country drop default, alter column region drop default;

alter table customers
  add column default_country text check (default_country in ('VN', 'AU')),
  add column default_region text,
  add column default_postcode text,
  add column company text;
update customers set default_country = 'VN', default_region = 'TP. Hồ Chí Minh' where default_district is not null;

drop function place_order(text, text, text, text, text, jsonb, date, order_creator, bigint, bigint);

create function place_order(
  p_phone text, p_name text, p_note text, p_items jsonb,
  p_country text, p_region text, p_district text, p_address text,
  p_production_date date, p_created_by order_creator, p_created_by_staff_id bigint default null, p_claim_sale_id bigint default null,
  p_postcode text default null, p_company text default null
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

  insert into customers as c (phone, name, default_address, default_district, default_country, default_region, default_postcode, company, sale_id)
  values (p_phone, p_name, p_address, p_district, p_country, p_region, p_postcode, p_company, p_claim_sale_id)
  on conflict (phone) do update set
    name = excluded.name,
    default_address = excluded.default_address,
    default_district = excluded.default_district,
    default_country = excluded.default_country,
    default_region = excluded.default_region,
    default_postcode = excluded.default_postcode,
    company = excluded.company,
    sale_id = coalesce(c.sale_id, excluded.sale_id)
  returning * into v_customer;

  insert into orders (customer_id, sale_id, created_by, created_by_staff_id, production_date,
                      country, region, district, postcode, address, company, phone, note, total)
  values (v_customer.id, v_customer.sale_id, p_created_by, p_created_by_staff_id, v_date,
          p_country, p_region, p_district, p_postcode, p_address, p_company, p_phone, nullif(p_note, ''), 0)
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

revoke execute on function place_order(text, text, text, jsonb, text, text, text, text, date, order_creator, bigint, bigint, text, text) from public, anon, authenticated;
