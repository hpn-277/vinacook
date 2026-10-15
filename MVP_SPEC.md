# Noodle Distribution MVP – Spec

## Stack
Next.js (App Router) + Supabase (Postgres + Auth for staff) + Vercel. UI Vietnamese only. Mobile-first.

## Roles
| Role | Login | Can |
|---|---|---|
| Customer | none (guest, phone = ID) | browse, order, lookup orders by phone |
| Sale | yes | share ref link, enter orders for own customers, see own customers/orders/commission |
| Manager (admin) | yes | everything: products, factories, sales, drivers, commission %, cutoff, orders, production, receiving, dispatch, mark paid. The only role that moves orders and production jobs |
| Factory | yes | read-only: own jobs for today and tomorrow (date, product, kg, status) |
| Driver | yes | see assigned deliveries, mark delivered/failed |

## Data model
- `products` (id, name, image_url, price_per_kg = wholesale price, active)
- `product_packs` (id, product_id, name e.g. Kg/Thùng/Bao, kg_per_unit, active)
- `customers` (id, phone UNIQUE, name, default_address, default_district, sale_id NULL, created_at)
- `staff` (id, auth_user_id, role[manager|sale|factory|driver], name, phone, ref_code UNIQUE NULL, commission_pct NULL, factory_id NULL, active)
- `factories` (id, name, address, phone, capacity_kg_per_day, active)
- `orders` (id, code, customer_id, sale_id NULL — snapshot at creation, created_by[customer|sale|manager], created_by_staff_id NULL, production_date, address, district, phone, note, status, payment_status[unpaid|paid], total, driver_id NULL, fail_reason NULL, delivered_at NULL, created_at)
- `order_items` (id, order_id, product_id, pack_id, pack_name, kg_per_unit, pack_qty, qty_kg = pack_qty × kg_per_unit, wholesale_price_per_kg, price_per_kg, line_total — snapshots); `orders` also snapshot price_tier (si|le) and the pricing terms
- `production_days` (date PK, status[open|closed])
- `production_jobs` (id, date, product_id, factory_id, qty_kg, status, received_kg NULL, timestamps)
- `settings` (cutoff_time = 17:00, Asia/Ho_Chi_Minh, retail_markup_pct = 25, wholesale_min_kg = 50, wholesale_min_total = 2.000.000đ)
- `district` = fixed list of HCMC districts (dropdown; used to filter dispatch)

## Order lifecycle
```
placed ──(manager closes day)──> in_production ──(manager receives day)──> ready ──(dispatch)──> assigned
   │                                                                                               │
cancelled (manager, from placed)                                          delivered  |  failed ──> back to ready / cancelled
```
Labels: placed "Chờ xử lý", in_production "Đang sản xuất", ready "Đã nhận hàng", assigned "Đang giao", delivered "Đã giao", failed "Giao thất bại", cancelled "Đã hủy". There is no approval step.
`payment_status` independent; manager toggles `paid`.

## Production job lifecycle
```
producing ──(manager receives day)──> received (received_kg = qty_kg)
```
Close day creates jobs as `producing` ("Đang sản xuất"); receive day marks them `received` ("Đã nhận hàng"). Factories never change a job.

## Flows
1. **Customer order** – `/` product list → cart (pack + quantity per line, converted to kg; wholesale or retail for the whole order) → name, phone, address, note → submit. If `?ref=CODE` (stored in cookie) and customer phone has no sale → bind sale (sticky forever). Existing owner never overwritten. production_date = today if before cutoff else tomorrow.
2. **Sale order** – sale picks/creates customer by phone. If phone owned by another sale → order saved, `sale_id` = existing owner, warning shown.
3. **Review** (manager) – `placed` orders need no approval; the manager cancels unwanted ones before closing the day.
4. **Close day** (manager) – every `placed` order of the date; shows totals kg per product for date. Manager splits each product across factories (inputs per factory, capacity warning if sum per factory > capacity). Must allocate 100% before send. Send → jobs `producing`, orders → `in_production`, day `closed`, orders locked.
5. **Factory** – read-only list of its own jobs for today and tomorrow. No buttons; never shows customers or prices.
6. **Receive** (manager) – on `/admin/orders` for a closed day with orders in production, one "Xác nhận đã nhận hàng" button (with confirmation): all jobs received at planned kg, orders → ready ("Đã nhận hàng"). Refused on an open day. Factories are expected to produce exactly what is required.
7. **Dispatch** (manager) – list `ready` orders, filter by district, assign driver.
8. **Driver** – list assigned, call/Maps buttons, Delivered or Failed(reason).
9. **Mark paid** (manager) – toggle on order.
10. **Customer lookup** – `/orders` enter phone → list orders + status; "Đặt lại" refills the cart with the same packs (inactive ones skipped) and opens checkout prefilled, at current prices. The shop shows the last order of the phone this browser remembered.

## Commission
Per sale, per month: `sum(order.total where status=delivered and delivered_at in month) × commission_pct`. Sale dashboard shows today / month sales + estimated commission. Manager sees table for all sales.

## Screens
- Public: `/`, `/checkout`, `/orders` (lookup), `/r/[code]` (sets ref cookie → `/`)
- Sale: `/sale` (dashboard + ref link), `/sale/orders/new`, `/sale/customers`
- Manager: `/admin/orders` (by date, filters), `/admin/production/[date]` (close + split), `/admin/dispatch`, `/admin/commission`, `/admin/settings` (products, factories, staff, cutoff)
- Factory: `/factory`
- Driver: `/driver`

## Out of scope (MVP)
OTP, per-customer price lists, online payment, e-invoice/MISA, Zalo OA, forecasting, color matrix (just status badges), new-customer bonus, Excel export, batch traceability, route auto-planning, PWA install (nice-to-have), auto shortfall allocation.

## Known risks
- Phone lookup without OTP exposes order history to anyone knowing the phone.
- Guest checkout allows spam orders → manager cancels them before closing the day; anything still `placed` at close goes to production.
- The manager receives a whole day at the planned kg; a factory shortfall is handled manually outside the app.

## Seed data (local)
- Products (wholesale per kg; packs Kg 1 kg plus Thùng/Bao/Túi): Mì trứng 25.000đ/kg, Mì vàng sợi nhỏ 24.000đ/kg, Hủ tiếu dai 22.000đ/kg, Bánh phở tươi 18.000đ/kg, Bún tươi 15.000đ/kg, Mì quảng 26.000đ/kg
- Factories: Xưởng Bình Tân (cap 500kg/day), Xưởng Hóc Môn (cap 300kg/day, inactive-ready second factory for split testing)
- Staff: manager@local, sale1@local (ref NVKD01, 5%), sale2@local (ref NVKD02, 7%), factory1@local, factory2@local, driver1@local, driver2@local — password `password123`

## Local setup
Supabase CLI via `npx supabase` + Docker. All data access server-side (server actions / route handlers) with role check from `staff`; no client-side DB access, so RLS not relied on in MVP.
