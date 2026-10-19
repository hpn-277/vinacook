# Noodle Distribution MVP – Spec

## Stack
Next.js (App Router) + Supabase (Postgres + Auth for staff) + Vercel. UI Vietnamese only. Mobile-first.

## Roles
| Role | Login | Can |
|---|---|---|
| Customer | none (guest, phone = ID) | browse, order, lookup orders by phone |
| Sale | yes | share ref link, enter orders for own customers, see own customers/orders/commission |
| Manager (admin) | yes | products, factories, staff, commission %, cutoff, orders, production, receiving, dispatch. The only role that moves orders and production jobs. Sees payment state read-only |
| Cashier (Thủ quỹ) | yes | `/finance`: confirms payment (gạch nợ), one order or many at once, and undoes it with a reason. The manager may also do this (one click in the orders table, undo on the order page); the accountant may not. |
| Accountant (Kế toán) | yes | `/finance`: tracks debt and payment history, read-only; cannot confirm payment |
| Factory | yes | read-only: own jobs for today and tomorrow (date, product, kg, status) |
| Driver | yes | see own assigned deliveries, confirm the goods are loaded, mark delivered (optional proof photo) or failed |

## Data model
- `products` (id, name, image_url, price_per_kg = wholesale price, factory_id = the one factory that makes it, active)
- `product_packs` (id, product_id, name e.g. Kg/Thùng/Bao, kg_per_unit, active)
- `customers` (id, phone UNIQUE, name, default_address, default_district, sale_id NULL, created_at)
- `staff` (id, auth_user_id, role[manager|sale|factory|driver|cashier|accountant], name, phone, ref_code UNIQUE NULL, commission_pct NULL, factory_id NULL, active)
- `factories` (id, name, address, phone, active)
- `orders` (id, code, customer_id, sale_id NULL — snapshot at creation, created_by[customer|sale|manager], created_by_staff_id NULL, production_date, address, district, phone, note, status, payment_status[unpaid|paid], paid_at NULL, paid_by NULL → staff, total, driver_id NULL, fail_reason NULL, departed_at NULL, delivered_at NULL, delivery_photo_path NULL, created_at)
- `order_items` (id, order_id, product_id, pack_id, pack_name, kg_per_unit, pack_qty, qty_kg = pack_qty × kg_per_unit, wholesale_price_per_kg, price_per_kg, line_total — snapshots); `orders` also snapshot price_tier (si|le) and the pricing terms
- `payment_events` (id, order_id, staff_id, action[paid|unpaid], amount = order total at the time, note NULL, created_at): audit log, one row per real payment change
- `production_days` (date PK, status[open|closed])
- `production_jobs` (id, date, product_id, factory_id, qty_kg, status, received_kg NULL, timestamps)
- `settings` (cutoff_time = 17:00, Asia/Ho_Chi_Minh, retail_markup_pct = 25, wholesale_min_kg = 50, wholesale_min_total = 2.000.000đ)
- `district` = fixed list of HCMC districts (dropdown; used to filter dispatch)

## Order lifecycle
```
placed ──(manager closes day)──> in_production ──(manager receives day)──> ready ──(dispatch)──> assigned
   │                                                                                               │
cancelled (manager, from placed)                                              (driver confirms loaded)
                                                                                                   │
                                                                                          out_for_delivery
                                                                                                   │
                                                                          delivered  |  failed ──> back to ready / cancelled
```
Labels: placed "Chờ xử lý", in_production "Đang sản xuất", ready "Đã nhận hàng", assigned "Chờ lên xe", out_for_delivery "Đang giao", delivered "Đã giao", failed "Giao thất bại", cancelled "Đã hủy". There is no approval step.
`payment_status` is independent of status. Only `set_payment()` changes it (a trigger refuses any other UPDATE), and only for a cashier or the manager.

## Production job lifecycle
```
producing ──(manager receives day)──> received (received_kg = qty_kg)
```
Close day creates jobs as `producing` ("Đang sản xuất"); receive day marks them `received` ("Đã nhận hàng"). Factories never change a job.

## Flows
1. **Customer order** – `/` product list → cart (pack + quantity per line, converted to kg; wholesale or retail for the whole order) → name, phone, address, note → submit. If `?ref=CODE` (stored in cookie) and customer phone has no sale → bind sale (sticky forever). Existing owner never overwritten. production_date = today if before cutoff else tomorrow.
2. **Sale order** – sale picks/creates customer by phone. If phone owned by another sale → order saved, `sale_id` = existing owner, warning shown.
3. **Review** (manager) – `placed` orders need no approval; the manager cancels unwanted ones before closing the day.
4. **Close day** (manager) – every `placed` order of the date; shows kg per product grouped under the factory that makes it (`products.factory_id`). Manager only checks and cancels invalid orders; no manual split. Send → jobs `producing`, orders → `in_production`, day `closed`, orders locked.
5. **Factory** – read-only list of its own jobs for today and tomorrow. No buttons; never shows customers or prices.
6. **Receive** (manager) – on `/admin/orders` for a closed day with orders in production, one "Xác nhận đã nhận hàng" button (with confirmation): all jobs received at planned kg, orders → ready ("Đã nhận hàng"). Refused on an open day. Factories are expected to produce exactly what is required.
7. **Dispatch** (manager) – on `/admin/orders?date=`, tick received orders (or "Chọn tất cả") and pick a driver → "Giao cho tài xế".
8. **Driver** – `/driver` lists only the driver's own orders in three sections: "Chờ lên xe", "Đang giao", "Đã giao hôm nay". Each card shows customer, phone (call button), address (Google Maps directions), note, packs and kg, and the COD amount ("Thu hộ") or "Đã thanh toán". "XÁC NHẬN HÀNG ĐÃ LÊN XE" moves every listed waiting order to `out_for_delivery` in one atomic update and stamps `departed_at`; each card also has "Lên xe" for one order. "HOÀN THÀNH GIAO HÀNG" opens a dialog with an optional proof photo (downscaled on the phone to 1600 px JPEG, stored in the private `delivery-photos` bucket) and marks the order delivered. "Thất bại" needs a reason.
   Every party sees the departure at once: the customer lookup shows "Đơn hàng đang trên đường giao đến bạn" with the driver's name and phone, sales see "Đang giao", and the manager's dispatch page shows "Đã rời kho · HH:mm". The order detail page shows the departure in the timeline and the proof photo.
9. **Gạch nợ** (cashier) – `/finance` (Công nợ) lists unpaid, non-cancelled orders grouped by customer with debt age (days since delivery, else since production date; amber > 7 days, red > 14). The cashier ticks orders (or a whole customer), adds an optional note, and confirms "Xác nhận đã thu (n đơn · tổng)" in a dialog. `set_payment()` marks them paid atomically, stamps `paid_at`/`paid_by`, and logs one `payment_events` row per order that actually changed, so a retry logs nothing. The order page `/finance/orders/[code]` shows the payment log; the cashier can undo there with a required reason. The accountant sees the same pages with every control disabled ("Kế toán không có quyền gạch nợ"). `/finance/payments` (Lịch sử thu) lists a month's events with money in, money reversed and the net.
10. **Customer lookup** – `/orders` enter phone → list orders + status; "Đặt lại" refills the cart with the same packs (inactive ones skipped) and opens checkout prefilled, at current prices. The shop shows the last order of the phone this browser remembered.

### Undo (manager)
- **Hủy phân công** – an order in "Chờ lên xe" (assigned, not yet loaded) goes back to "Đã nhận hàng" with its driver cleared: per row, or "Hủy phân công tất cả (n)" for the day. Not possible once the driver confirmed loading.
- **Mở lại ngày** – on a closed day with no order assigned to a driver yet: deletes the day's factory jobs and sends its "Đang sản xuất"/"Đã nhận hàng" orders back to "Chờ xử lý" (`reopen_production_day()`, atomic). Payment status is kept.
- Both are logged in `admin_events` (who, when, which orders/day).

## Commission
Per sale, per month: `sum(order.total where status=delivered and delivered_at in month) × commission_pct`. Sale dashboard shows today / month sales + estimated commission. Manager sees table for all sales.

## Screens
- Public: `/`, `/checkout`, `/orders` (lookup), `/r/[code]` (sets ref cookie → `/`)
- Sale: `/sale` (dashboard + ref link), `/sale/orders/new`, `/sale/customers`
- Manager: `/admin` (month overview), `/admin/orders?date=` (day table: cancel, receive day, assign driver; payment shown read-only), `/admin/orders/[code]` (detail), `/admin/production/[date]` (review + close), `/admin/commission` (+ per sale), `/admin/settings` (products, factories, staff, cutoff)
- Finance (cashier, accountant): `/finance` (Công nợ), `/finance/payments` (Lịch sử thu), `/finance/orders/[code]` (detail + payment log)
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
- Factories: Xưởng Bình Tân, Xưởng Hóc Môn. Mì trứng, Mì vàng, Hủ tiếu → Bình Tân; Bánh phở, Bún, Mì quảng → Hóc Môn
- Staff: manager@local, sale1@local (ref NVKD01, 5%), sale2@local (ref NVKD02, 7%), factory1@local, factory2@local, driver1@local, driver2@local, cashier@local (Thủ quỹ), accountant@local (Kế toán) — password `password123`

## Local setup
Supabase CLI via `npx supabase` + Docker. All data access server-side (server actions / route handlers) with role check from `staff`; no client-side DB access, so RLS not relied on in MVP.
