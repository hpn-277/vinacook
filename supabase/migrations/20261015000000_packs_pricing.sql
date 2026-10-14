-- Packs (Kg, Thùng, Bao...) and wholesale/retail pricing.
-- Prices are computed by lib/domain/pricing.ts on the server; these functions only check and store the snapshots.

create type price_tier as enum ('si', 'le');

-- products.price_per_kg is the wholesale (sỉ) price; retail (lẻ) = wholesale × (1 + retail_markup_pct / 100), rounded to 100đ.
alter table settings
  add column retail_markup_pct numeric(5, 2) not null default 25 check (retail_markup_pct >= 0),
  add column wholesale_min_kg numeric(10, 2) not null default 50 check (wholesale_min_kg >= 0),
  add column wholesale_min_total bigint not null default 2000000 check (wholesale_min_total >= 0);

create table product_packs (
  id bigint generated always as identity primary key,
  product_id bigint not null references products (id),
  name text not null,
  kg_per_unit numeric(10, 2) not null check (kg_per_unit > 0),
  active boolean not null default true,
  unique (product_id, name),
  unique (id, product_id)
);
alter table product_packs enable row level security;

insert into product_packs (product_id, name, kg_per_unit) select id, 'Kg', 1 from products;

-- Each order keeps the pricing terms it was priced with, so a manager edit re-derives the tier without repricing at today's prices.
alter table orders
  add column price_tier price_tier not null default 'si',
  add column retail_markup_pct numeric(5, 2) not null default 25,
  add column wholesale_min_kg numeric(10, 2) not null default 50,
  add column wholesale_min_total bigint not null default 2000000;
alter table orders
  alter column price_tier drop default,
  alter column retail_markup_pct drop default,
  alter column wholesale_min_kg drop default,
  alter column wholesale_min_total drop default;

-- One line per (order, pack): the same product may appear in several packs. qty_kg stays the production quantity.
alter table order_items drop constraint order_items_pkey;
alter table order_items rename column unit_price to price_per_kg;
alter table order_items
  add column id bigint generated always as identity primary key,
  add column pack_id bigint,
  add column pack_name text,
  add column kg_per_unit numeric(10, 2),
  add column pack_qty numeric(10, 2),
  add column wholesale_price_per_kg integer,
  add column line_total bigint;

update order_items oi
set pack_id = pp.id, pack_name = pp.name, kg_per_unit = 1, pack_qty = oi.qty_kg,
    wholesale_price_per_kg = oi.price_per_kg, line_total = round(oi.qty_kg * oi.price_per_kg)
from product_packs pp
where pp.product_id = oi.product_id and pp.name = 'Kg';

alter table order_items
  alter column pack_id set not null,
  alter column pack_name set not null,
  alter column kg_per_unit set not null,
  alter column pack_qty set not null,
  alter column wholesale_price_per_kg set not null,
  alter column line_total set not null,
  add constraint order_items_pack_fkey foreign key (pack_id, product_id) references product_packs (id, product_id),
  add constraint order_items_order_pack_key unique (order_id, pack_id),
  add check (kg_per_unit > 0),
  add check (pack_qty > 0),
  add check (wholesale_price_per_kg > 0),
  add check (line_total >= 0),
  drop column qty_kg;
alter table order_items add column qty_kg numeric(12, 2) generated always as (pack_qty * kg_per_unit) stored not null check (qty_kg > 0);

create or replace function recompute_order_total(p_order_id bigint) returns void language sql as $$
  update orders
  set total = (select coalesce(sum(line_total), 0) from order_items where order_id = p_order_id)
  where id = p_order_id;
$$;

drop function place_order(text, text, text, text, text, jsonb, date, order_creator, bigint, bigint);

-- p_items: [{pack_id, pack_qty, kg_per_unit, wholesale_price_per_kg, price_per_kg, line_total}] priced by priceLines().
-- kg_per_unit and wholesale_price_per_kg must still match the catalog, so a price change mid-checkout is refused, not stored.
create function place_order(
  p_phone text,
  p_name text,
  p_address text,
  p_district text,
  p_note text,
  p_items jsonb,
  p_price_tier price_tier,
  p_retail_markup_pct numeric,
  p_wholesale_min_kg numeric,
  p_wholesale_min_total bigint,
  p_production_date date,
  p_created_by order_creator,
  p_created_by_staff_id bigint default null,
  p_claim_sale_id bigint default null
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
    pack_id bigint, pack_qty numeric, kg_per_unit numeric, wholesale_price_per_kg integer, price_per_kg integer, line_total bigint
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

  insert into orders (customer_id, sale_id, created_by, created_by_staff_id, production_date, address, district, phone, note, total,
                      price_tier, retail_markup_pct, wholesale_min_kg, wholesale_min_total)
  values (v_customer.id, v_customer.sale_id, p_created_by, p_created_by_staff_id, v_date, p_address, p_district, p_phone, nullif(p_note, ''), 0,
          p_price_tier, p_retail_markup_pct, p_wholesale_min_kg, p_wholesale_min_total)
  returning * into v_order;

  insert into order_items (order_id, product_id, pack_id, pack_name, kg_per_unit, pack_qty, wholesale_price_per_kg, price_per_kg, line_total)
  select v_order.id, pk.product_id, pk.id, pk.name, pk.kg_per_unit, i.pack_qty, p.price_per_kg, i.price_per_kg, i.line_total
  from items i
  join product_packs pk on pk.id = i.pack_id and pk.kg_per_unit = i.kg_per_unit
  join products p on p.id = pk.product_id and p.price_per_kg = i.wholesale_price_per_kg;
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

drop function edit_order(bigint, jsonb, text, text, text);

-- p_lines: every current line [{id, pack_qty, price_per_kg, line_total}] repriced by priceLines(); pack_qty 0 removes a line.
create function edit_order(
  p_order_id bigint,
  p_lines jsonb,
  p_price_tier price_tier,
  p_address text,
  p_district text,
  p_note text
) returns void language plpgsql as $$
declare
  v_order orders;
begin
  select * into v_order from orders where id = p_order_id for update;
  if v_order.status not in ('placed', 'approved', 'in_production', 'ready') then
    raise exception 'Đơn % không thể sửa ở trạng thái %', v_order.code, v_order.status;
  end if;

  create temp table lines on commit drop as
  select * from jsonb_to_recordset(p_lines) as i(id bigint, pack_qty numeric, price_per_kg integer, line_total bigint);
  if (select array_agg(id order by id) from order_items where order_id = p_order_id)
     is distinct from (select array_agg(id order by id) from lines) then
    raise exception 'Đơn % vừa thay đổi, vui lòng tải lại trang', v_order.code;
  end if;

  update order_items oi set pack_qty = l.pack_qty, price_per_kg = l.price_per_kg, line_total = l.line_total
  from lines l
  where oi.id = l.id and l.pack_qty > 0;

  delete from order_items oi using lines l where oi.id = l.id and l.pack_qty <= 0;

  if not exists (select 1 from order_items where order_id = p_order_id) then
    raise exception 'Đơn phải còn ít nhất 1 sản phẩm; hãy hủy đơn thay vì xóa hết';
  end if;

  update orders set price_tier = p_price_tier, address = p_address, district = p_district, note = nullif(p_note, '')
  where id = p_order_id;
  perform recompute_order_total(p_order_id);
end $$;

-- Server-only app: the public API keys must not reach these functions.
revoke execute on all functions in schema public from public, anon, authenticated;
