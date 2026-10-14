# Noodle Distribution MVP

Ordering, production and delivery app for a fresh-noodle distributor in Ho Chi Minh City. The UI is Vietnamese. See `MVP_SPEC.md` for scope.

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

Customers do not log in. Open `/r/NVKD01` to order as a customer referred by sale1.

## Tests

```sh
npm test        # vitest: state-machine tables and the 17:00 production-date cutoff
npm run e2e     # full lifecycle in a real browser; needs `npm run dev` running
```

`npm run e2e` resets the database first. Pass `-- --no-reset` to keep the current data. The script drives the whole flow through the UI: referral order, a second sale entering an order for the same phone, approval, closing the day with a split across two factories, a factory rejection and reassignment, receiving with a shortfall, dispatch, delivery and failure, payment, and commission. It checks every step against the database.

After a schema change, run `npm run gen:types` to regenerate `lib/database.types.ts`.

## Where the rules live

- `lib/domain/status.ts` holds the order and production-job state machines. Every single-row status change goes through `transition()` in `lib/transition.ts`.
- `status_transitions` and a trigger in the first migration hold the same tables in the database, so bulk moves inside SQL functions are checked too. The e2e script asserts that the two copies match.
- `close_production_day`, `reassign_job` and `receive_job` in `supabase/migrations` are atomic. Running close-day again on a closed day raises an error and creates no jobs.
