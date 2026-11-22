/**
 * Puts the local stack into the state the mobile e2e tests expect, using only the public API:
 * a fresh seed database, three of sale1's orders produced, received and assigned to driver1.
 * Writes the order codes to e2e/.seed.json. Needs `pnpm dev` (web + API) and local Supabase running.
 */
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BASE = process.env.API_BASE ?? "http://localhost:3001";
const ROOT = fileURLToPath(new URL("../../..", import.meta.url));

async function call<T>(token: string | null, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    method,
    headers: { "content-type": "application/json", ...(token && { authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(`${method} ${path} ${res.status}: ${json.error}`);
  return json;
}

const signIn = (email: string) =>
  call<{ access_token: string; staff: { id: number } }>(null, "POST", "/auth/session", { email, password: "password123" });

async function main() {
  console.log("resetting database...");
  execSync("npx supabase db reset", { cwd: ROOT, stdio: "ignore" });

  const [sale, manager, driver] = await Promise.all([signIn("sale1@local"), signIn("manager@local"), signIn("driver1@local")]);
  const form = await call<{ catalog: { packs: { id: number }[] }[] }>(sale.access_token, "GET", "/sale/order-form");
  const pack = form.catalog[0].packs[0].id;

  const customers = [
    { name: "Chị Lan", phone: "0911000001", address: "12 Lê Lợi" },
    { name: "Anh Minh", phone: "0911000002", address: "34 Hai Bà Trưng" },
    { name: "Cô Hoa", phone: "0911000003", address: "56 Nguyễn Huệ" },
  ];
  const codes: string[] = [];
  for (const c of customers) {
    const { message } = await call<{ message: string }>(sale.access_token, "POST", "/shop/staff-orders", {
      ...c,
      district: "Quận 1",
      note: "",
      items: [{ pack_id: pack, pack_qty: 2 }],
    });
    codes.push(/DH\d{6}/.exec(message)![0]);
  }
  const orders = await Promise.all(
    codes.map((code) => call<{ order: { id: number; production_date: string } }>(sale.access_token, "GET", `/sale/orders/${code}`).then((d) => d.order)),
  );
  const date = orders[0].production_date;

  await call(manager.access_token, "POST", `/days/${date}/close`);
  await call(manager.access_token, "POST", `/days/${date}/receive`);
  await call(manager.access_token, "POST", "/orders/assign", { driver_id: driver.staff.id, order_ids: orders.map((o) => o.id) });

  writeFileSync(new URL(".seed.json", import.meta.url), JSON.stringify({ date, codes }, null, 2) + "\n");
  console.log(`seeded ${codes.join(", ")} for ${date}, assigned to driver1`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
