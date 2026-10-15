# VinaCook

VinaCook is the ordering, production and delivery app for a fresh-noodle distributor in Ho Chi Minh City. The UI is Vietnamese. See `MVP_SPEC.md` for scope.

Stack: Next.js (App Router) and local Supabase (Postgres and Auth). All data access runs on the server with the Supabase secret key, after a role check in `lib/auth.ts` (`requireRole`).

## Prerequisites

- Node.js 20 or later
- Docker, running

## Run locally

```sh
npm install
npx supabase start          # first run pulls Docker images
npx supabase db reset       # applies supabase/migrations and supabase/seed.sql
npm run env                 # writes .env.local from `supabase status`
npm run dev                 # http://localhost:3000
npm run seed:history        # optional: 6 weeks of past orders for demos (run right after db reset)
```

`.env.local` holds `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`. All three are server-only.

## Logins

Every staff password is `password123`.

| Email | Role | Home |
|---|---|---|
| manager@local | Manager | /admin/orders |
| sale1@local | Sale, ref `NVKD01`, 5% | /sale |
| sale2@local | Sale, ref `NVKD02`, 7% | /sale |
| factory1@local | Factory, Xưởng Bình Tân | /factory |
| factory2@local | Factory, Xưởng Hóc Môn | /factory |
| driver1@local | Driver | /driver |
| driver2@local | Driver | /driver |
| cashier@local | Cashier (Thủ quỹ), confirms payment (so can the manager; the accountant cannot) | /finance |
| accountant@local | Accountant (Kế toán), debt read-only | /finance |

Customers do not log in. Open `/r/NVKD01` to order as a customer referred by sale1.

## Tests

```sh
npm test        # vitest: state-machine tables, the 17:00 production-date cutoff, wholesale/retail pricing, and debt aging
npm run e2e     # full lifecycle in a real browser; needs `npm run dev` running
```

`npm run e2e` resets the database first. Pass `-- --no-reset` to keep the current data. The script drives the whole flow through the UI: referral order picked by pack (Kg, Thùng, Bao), wholesale at exactly 50 kg and retail below it, a second sale entering an order for the same phone, cancelling a spam order, closing the day with a split across two factories, each factory's read-only job list, one-click receiving of the whole day (refused while the day is open), dispatch, each driver seeing only their own orders, confirming the load (all at once and one by one), the customer, sale and manager each seeing the order on the road, delivery with a proof photo stored in a private bucket, failure, the accountant unable to mark payment, the cashier confirming payment with an audit event, commission, and a one-tap reorder from `/orders` with a deactivated pack skipped. It checks every step against the database.

After a schema change, run `npm run gen:types` to regenerate `lib/database.types.ts`.

## Where the rules live

- `lib/domain/status.ts` holds the order and production-job state machines. Every single-row status change goes through `transition()` in `lib/transition.ts`.
- `status_transitions` and a trigger in `supabase/migrations` hold the same tables in the database, so bulk moves inside SQL functions are checked too. The e2e script asserts that the two copies match.
- `lib/domain/pricing.ts` is the only pricing rule. `products.price_per_kg` is the wholesale price; retail adds `settings.retail_markup_pct` rounded to 100đ. An order gets wholesale when it reaches `wholesale_min_kg` or a retail total of `wholesale_min_total`. Server actions price every order with it and pass the snapshots to `place_order`, which refuses a snapshot whose pack size or wholesale price no longer matches the catalog. Each order stores its tier and the terms it was priced with. Orders can be cancelled but not edited.
- Customers order packs (`product_packs`, managed in `/admin/settings`). `order_items.qty_kg` is generated from pack quantity × kg per pack, so production and dispatch still work in kg.
- Only the manager moves orders and jobs. Closing a day sends every `placed` order to production and creates `producing` jobs; receiving the day marks them `received` and the orders `ready` ("Đã nhận hàng"). Factories only read their jobs.
- Drivers move orders themselves: `assigned` ("Chờ lên xe") to `out_for_delivery` when the goods are loaded (one UPDATE for the whole load, guarded by the trigger), then `delivered` or `failed`. Proof photos go to the private Storage bucket `delivery-photos` through a server action (`lib/delivery-photos.ts`); pages show them through one-hour signed URLs.
- Payment (gạch nợ) goes only through `set_payment()` in `supabase/migrations`, called by the server action in `app/finance/actions.ts` (cashier or manager). It updates `payment_status`, `paid_at` and `paid_by` and writes one `payment_events` row per changed order. A trigger refuses any other change to those columns. Debt age and payment totals are pure helpers in `lib/domain/debt.ts`.
- `close_production_day` and `receive_day` in `supabase/migrations` are atomic. Running close-day again on a closed day raises an error and creates no jobs.
