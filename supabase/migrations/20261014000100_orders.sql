create function recompute_order_total(p_order_id bigint) returns void language sql as $$
  update orders
  set total = (select coalesce(sum(round(qty_kg * unit_price)), 0) from order_items where order_id = p_order_id)
  where id = p_order_id;
$$;

-- Atomic: upsert customer (sticky sale), snapshot sale + prices, skip closed production days.
create function place_order(
  p_phone text,
  p_name text,
  p_address text,
  p_district text,
  p_note text,
  p_items jsonb,
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
  select count(*) into v_wanted from jsonb_to_recordset(p_items) as i(product_id bigint, qty_kg numeric) where i.qty_kg > 0;
  if v_wanted = 0 then
    raise exception 'Đơn hàng chưa có sản phẩm';
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

  insert into order_items (order_id, product_id, qty_kg, unit_price)
  select v_order.id, p.id, i.qty_kg, p.price_per_kg
  from jsonb_to_recordset(p_items) as i(product_id bigint, qty_kg numeric)
  join products p on p.id = i.product_id and p.active
  where i.qty_kg > 0;
  get diagnostics v_inserted = row_count;
  if v_inserted <> v_wanted then
    raise exception 'Có sản phẩm không còn bán';
  end if;

  perform recompute_order_total(v_order.id);

  return jsonb_build_object(
    'order_id', v_order.id,
    'code', v_order.code,
    'production_date', v_date,
    'sale_id', v_customer.sale_id,
    'claimed_by_other', p_claim_sale_id is not null and v_customer.sale_id is distinct from p_claim_sale_id
  );
end $$;

-- qty 0 removes a line; prices of kept lines stay snapshotted.
create function edit_order(
  p_order_id bigint,
  p_items jsonb,
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

  update order_items oi set qty_kg = i.qty_kg
  from jsonb_to_recordset(p_items) as i(product_id bigint, qty_kg numeric)
  where oi.order_id = p_order_id and oi.product_id = i.product_id and i.qty_kg > 0;

  delete from order_items oi
  using jsonb_to_recordset(p_items) as i(product_id bigint, qty_kg numeric)
  where oi.order_id = p_order_id and oi.product_id = i.product_id and i.qty_kg <= 0;

  if not exists (select 1 from order_items where order_id = p_order_id) then
    raise exception 'Đơn phải còn ít nhất 1 sản phẩm; hãy hủy đơn thay vì xóa hết';
  end if;

  update orders set address = p_address, district = p_district, note = nullif(p_note, '') where id = p_order_id;
  perform recompute_order_total(p_order_id);
end $$;

-- Server-only app: the public API keys must not reach these functions.
revoke execute on all functions in schema public from public, anon, authenticated;
