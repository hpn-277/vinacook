/**
 * Full order lifecycle against the running app + local Supabase.
 * Usage: npm run dev (in another shell), then `npm run e2e` (add `-- --no-reset` to keep current data).
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import type { Database } from "../lib/database.types";
import { DISTRICTS } from "../lib/domain/districts";
import { formatVnd } from "../lib/domain/money";
import { JOB_TRANSITIONS, ORDER_TRANSITIONS } from "../lib/domain/status";
import { addDays, type IsoDate } from "../lib/domain/time";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PASSWORD = "password123";
const admin = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const anon = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });

let passed = 0;
function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${message}`);
  passed++;
  console.log(`  ok  ${message}`);
}
function eq<T>(actual: T, expected: T, message: string) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
}
const step = (name: string) => console.log(`\n# ${name}`);

async function until<T>(read: () => Promise<T>, ok: (v: T) => boolean, what: string, timeoutMs = 10000): Promise<T> {
  const start = Date.now();
  let last: T = await read();
  while (!ok(last)) {
    if (Date.now() - start > timeoutMs) throw new Error(`Timed out waiting for ${what}; last value ${JSON.stringify(last)}`);
    await new Promise((r) => setTimeout(r, 200));
    last = await read();
  }
  return last;
}

async function order(code: string) {
  const { data, error } = await admin.from("orders").select("*").eq("code", code).single();
  if (error) throw error;
  return data;
}
const orderStatus = (code: string) => order(code).then((o) => o.status);
async function staffId(email: string) {
  const { data: users } = await admin.auth.admin.listUsers();
  const user = users.users.find((u) => u.email === email)!;
  const { data } = await admin.from("staff").select("id").eq("auth_user_id", user.id).single();
  return data!.id;
}

const MOBILE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

async function newPage(browser: Browser, mobile = false): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext(mobile ? MOBILE : { viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.accept());
  page.on("pageerror", (e) => console.error("  page error:", e.message));
  return { ctx, page };
}

async function login(browser: Browser, email: string, mobile = false) {
  const s = await newPage(browser, mobile);
  await s.page.goto(`${BASE}/login`);
  await s.page.getByLabel("Email").fill(email);
  await s.page.getByLabel("Mật khẩu").fill(PASSWORD);
  await s.page.getByRole("button", { name: "Đăng nhập" }).click();
  await s.page.waitForURL((u) => !u.pathname.startsWith("/login"));
  return s;
}

async function customerCheckout(page: Page, items: Record<string, number>, info: { name: string; phone: string; address: string; district: string }) {
  await page.goto(`${BASE}/`);
  for (const [product, kg] of Object.entries(items)) await page.getByLabel(`Số kg ${product}`).fill(String(kg));
  await page.getByRole("link", { name: "Đặt hàng" }).click();
  await page.waitForURL("**/checkout");
  await page.getByLabel("Họ tên").fill(info.name);
  await page.getByLabel("Số điện thoại").fill(info.phone);
  await page.getByLabel("Địa chỉ").fill(info.address);
  await page.getByLabel("Quận/Huyện").selectOption(info.district);
  await page.getByRole("button", { name: "Xác nhận đặt hàng" }).click();
  const text = await page.getByRole("status").innerText();
  const code = /DH\d{6}/.exec(text)?.[0];
  assert(code, `customer order placed: "${text}"`);
  return code;
}

async function structuralChecks() {
  step("DB mirrors TS domain tables");
  const { data: districts } = await admin.from("districts").select("name");
  eq(districts!.map((d) => d.name).sort(), [...DISTRICTS].sort(), "districts table matches DISTRICTS");
  const { data: edges } = await admin.from("status_transitions").select("machine, from_status, to_status");
  const fromTs = [
    ...Object.entries(ORDER_TRANSITIONS).flatMap(([f, tos]) => tos.map((t) => `orders:${f}->${t}`)),
    ...Object.entries(JOB_TRANSITIONS).flatMap(([f, tos]) => tos.map((t) => `production_jobs:${f}->${t}`)),
  ].sort();
  eq(edges!.map((e) => `${e.machine}:${e.from_status}->${e.to_status}`).sort(), fromTs, "status_transitions matches ORDER/JOB_TRANSITIONS");

  step("public API key cannot reach data or RPCs");
  const read = await anon.from("orders").select("id");
  eq(read.data, [], "anon reads no orders (RLS)");
  const rpc = await anon.rpc("close_production_day", { p_date: "2030-01-01", p_alloc: [] });
  assert(rpc.error?.code === "42501", `anon cannot call close_production_day (${rpc.error?.message})`);
}

async function main() {
  if (!process.argv.includes("--no-reset")) {
    console.log("resetting database...");
    execSync("npx supabase db reset", { stdio: "ignore" });
  }
  await structuralChecks();

  const [sale1, sale2, driver1] = await Promise.all([staffId("sale1@local"), staffId("sale2@local"), staffId("driver1@local")]);
  const browser = await chromium.launch();
  try {
    step("customer orders through sale1's ref link");
    const customer = await newPage(browser, true);
    await customer.page.goto(`${BASE}/r/NVKD01`);
    const ref = (await customer.ctx.cookies()).find((c) => c.name === "ref");
    eq(ref?.value, "NVKD01", "ref cookie stored");
    const A = await customerCheckout(customer.page, { "Mì trứng": 30, "Bún tươi": 20 }, { name: "Chị Mai", phone: "0909111222", address: "100 Nguyễn Trãi", district: "Quận 5" });
    const a0 = await order(A);
    eq(a0.sale_id, sale1, "order A snapshots sale1");
    eq(a0.total, 30 * 25000 + 20 * 15000, "order A total in VND from snapshot prices");
    const { data: cust } = await admin.from("customers").select("sale_id").eq("phone", "0909111222").single();
    eq(cust!.sale_id, sale1, "new customer bound to sale1");

    step("sale2 enters an order for the same phone");
    const s2 = await login(browser, "sale2@local", true);
    await s2.page.goto(`${BASE}/sale/orders/new?phone=0909111222`);
    assert((await s2.page.getByRole("note").innerText()).includes("NVKD 01"), "sale2 is warned the customer belongs to NVKD 01");
    await s2.page.getByLabel("Số kg Mì trứng").fill("10");
    await s2.page.getByRole("button", { name: "Tạo đơn" }).click();
    const s2msg = await s2.page.getByRole("status").innerText();
    assert(s2msg.includes("thuộc nhân viên khác"), `sale2 sees ownership warning after save: "${s2msg}"`);
    const B = /DH\d{6}/.exec(s2msg)![0];
    const b0 = await order(B);
    eq([b0.sale_id, b0.created_by, b0.created_by_staff_id], [sale1, "sale", sale2], "order B saved, commission stays with sale1");
    const { data: cust2 } = await admin.from("customers").select("sale_id").eq("phone", "0909111222").single();
    eq(cust2!.sale_id, sale1, "customer owner not overwritten");

    step("walk-in customer without ref in another district");
    const walkIn = await newPage(browser, true);
    const C = await customerCheckout(walkIn.page, { "Mì trứng": 15 }, { name: "Anh Tùng", phone: "0909333444", address: "5 Hoàng Văn Thụ", district: "Tân Bình" });
    eq((await order(C)).sale_id, null, "order C has no sale");

    const D = a0.production_date as IsoDate;
    eq([b0.production_date, (await order(C)).production_date], [D, D], `all orders share production date ${D}`);

    step("manager review: close blocked while orders are placed");
    const mgr = await login(browser, "manager@local");
    await mgr.page.goto(`${BASE}/admin/production/${D}`);
    assert((await mgr.page.getByText("đơn chưa duyệt").innerText()).includes("3"), "close blocked: 3 placed orders");
    const early = await admin.rpc("close_production_day", { p_date: D, p_alloc: [] });
    assert(early.error?.message.includes("chưa duyệt"), `RPC also refuses: ${early.error?.message}`);

    step("manager approves");
    await mgr.page.goto(`${BASE}/admin/orders?date=${D}`);
    await mgr.page.locator(`[data-order-code="${A}"]`).getByRole("button", { name: "Duyệt" }).click();
    await until(() => orderStatus(A), (s) => s === "approved", "A approved");
    await mgr.page.getByRole("button", { name: /Duyệt tất cả đơn mới/ }).click();
    await until(() => orderStatus(C), (s) => s === "approved", "C approved");
    eq(await orderStatus(B), "approved", "B approved");

    step("manager closes the day splitting Mì trứng across two factories");
    await mgr.page.goto(`${BASE}/admin/production/${D}`);
    const submit = mgr.page.getByRole("button", { name: "Chốt ngày và gửi xưởng" });
    assert(await submit.isEnabled(), "default allocation (all to first factory) is complete");
    await mgr.page.getByLabel("Mì trứng - Xưởng Bình Tân").fill("30");
    assert(await submit.isDisabled(), "send disabled while Mì trứng is under-allocated");
    await mgr.page.getByLabel("Mì trứng - Xưởng Hóc Môn").fill("25");
    assert(await submit.isEnabled(), "send enabled once 30 + 25 = 55 kg");
    await mgr.page.getByLabel("Bún tươi - Xưởng Hóc Môn").fill("0");
    await submit.click();
    await mgr.page.getByRole("heading", { name: "Lệnh sản xuất" }).waitFor();
    const { data: jobs0 } = await admin.from("production_jobs").select("id, qty_kg, products(name), factories(name)").eq("date", D).order("id");
    eq(
      jobs0!.map((j) => `${j.products!.name}@${j.factories!.name}=${j.qty_kg}`).sort(),
      ["Bún tươi@Xưởng Bình Tân=20", "Mì trứng@Xưởng Bình Tân=30", "Mì trứng@Xưởng Hóc Môn=25"],
      "jobs created per product x factory",
    );
    eq([await orderStatus(A), await orderStatus(B), await orderStatus(C)], ["in_production", "in_production", "in_production"], "approved orders -> in_production");

    step("close day is idempotent");
    const again = await admin.rpc("close_production_day", { p_date: D, p_alloc: [{ product_id: 1, factory_id: 1, qty_kg: 55 }] });
    assert(again.error?.message.includes("đã chốt"), `second close refused: ${again.error?.message}`);
    const { count: jobCount } = await admin.from("production_jobs").select("id", { count: "exact", head: true }).eq("date", D);
    eq(jobCount, 3, "no duplicate jobs");

    step("late order after close rolls to next open day");
    const late = await newPage(browser, true);
    const L = await customerCheckout(late.page, { "Bún tươi": 5 }, { name: "Cô Ba", phone: "0909555666", address: "9 Lê Lợi", district: "Quận 1" });
    eq((await order(L)).production_date, addDays(D, 1), "order on closed day goes to next day");

    step("factory1 accepts and ships; factory2 rejects");
    const f1 = await login(browser, "factory1@local", true);
    const f2 = await login(browser, "factory2@local", true);
    const jobId = (name: string, factory: string) => jobs0!.find((j) => j.products!.name === name && j.factories!.name === factory)!.id;
    const jobStatus = async (id: number) => (await admin.from("production_jobs").select("status").eq("id", id).single()).data!.status;
    const factoryDo = async (page: Page, id: number, button: string, reason?: string) => {
      await page.goto(`${BASE}/factory`);
      const card = page.locator(`[data-job-id="${id}"]`);
      if (reason) await card.getByPlaceholder("Lý do từ chối").fill(reason);
      await card.getByRole("button", { name: button }).click();
    };
    for (const id of [jobId("Mì trứng", "Xưởng Bình Tân"), jobId("Bún tươi", "Xưởng Bình Tân")]) {
      await factoryDo(f1.page, id, "Nhận lệnh");
      await until(() => jobStatus(id), (s) => s === "accepted", `job ${id} accepted`);
      await factoryDo(f1.page, id, "Đã xuất hàng");
      await until(() => jobStatus(id), (s) => s === "shipped", `job ${id} shipped`);
    }
    const rejected = jobId("Mì trứng", "Xưởng Hóc Môn");
    await f1.page.goto(`${BASE}/factory`);
    eq(await f1.page.locator(`[data-job-id="${rejected}"]`).count(), 0, "factory1 cannot see factory2's job");
    await factoryDo(f2.page, rejected, "Từ chối", "Hết bột");
    await until(() => jobStatus(rejected), (s) => s === "rejected", "factory2 rejected");

    step("manager reassigns the rejected qty to factory1");
    await mgr.page.goto(`${BASE}/admin/production/${D}`);
    await mgr.page.getByLabel("Xưởng nhận lại").selectOption({ label: "Xưởng Bình Tân" });
    await mgr.page.getByRole("button", { name: "Giao lại" }).click();
    const old = await until(
      async () => (await admin.from("production_jobs").select("replaced_by").eq("id", rejected).single()).data!.replaced_by,
      (v) => v != null,
      "rejected job replaced",
    );
    const { data: replacement } = await admin.from("production_jobs").select("qty_kg, status, factories(name)").eq("id", old!).single();
    eq([replacement!.qty_kg, replacement!.status, replacement!.factories!.name], [25, "assigned", "Xưởng Bình Tân"], "replacement job for 25 kg at factory1");
    await factoryDo(f1.page, old!, "Nhận lệnh");
    await until(() => jobStatus(old!), (s) => s === "accepted", "replacement accepted");
    await factoryDo(f1.page, old!, "Đã xuất hàng");
    await until(() => jobStatus(old!), (s) => s === "shipped", "replacement shipped");

    step("manager receives with a shortfall");
    const receive = async (id: number, kg?: number) => {
      await mgr.page.goto(`${BASE}/admin/receiving?date=${D}`);
      if (kg != null) await mgr.page.getByLabel(`Thực nhận lệnh ${id}`).fill(String(kg));
      await mgr.page.getByLabel(`Thực nhận lệnh ${id}`).locator("xpath=..").getByRole("button", { name: "Nhận" }).click();
      await until(() => jobStatus(id), (s) => s === "received", `job ${id} received`);
    };
    await receive(jobId("Mì trứng", "Xưởng Bình Tân"), 28);
    eq(await orderStatus(A), "in_production", "orders wait while jobs are outstanding");
    await receive(jobId("Bún tươi", "Xưởng Bình Tân"));
    await receive(old!);
    eq([await orderStatus(A), await orderStatus(B), await orderStatus(C)], ["ready", "ready", "ready"], "all jobs received -> orders ready");
    await mgr.page.goto(`${BASE}/admin/receiving?date=${D}`);
    eq((await mgr.page.locator('[data-shortfall-product="Mì trứng"] [data-testid="shortfall"]').innerText()).trim(), "Thiếu 2 kg", "Mì trứng shortfall shown (55 planned, 53 received)");
    eq(await mgr.page.locator('[data-shortfall-product="Bún tươi"]').getByText("Đủ").count(), 1, "Bún tươi complete");

    step("manager trims the walk-in order to absorb the shortfall");
    await mgr.page.goto(`${BASE}/admin/orders?date=${D}`);
    const cardC = mgr.page.locator(`[data-order-code="${C}"]`);
    await cardC.getByText("Sửa đơn").click();
    await cardC.locator('input[name^="qty_"]').fill("13");
    await cardC.getByRole("button", { name: "Lưu" }).click();
    await until(async () => (await order(C)).total, (t) => t === 13 * 25000, "C total recomputed");

    step("dispatch filtered by district");
    await mgr.page.goto(`${BASE}/admin/dispatch`);
    await mgr.page.getByLabel("Lọc quận").selectOption("Quận 5");
    await mgr.page.getByRole("button", { name: "Lọc" }).click();
    await mgr.page.waitForURL("**district=*");
    eq(await mgr.page.getByLabel(`Chọn ${C}`).count(), 0, "Tân Bình order hidden by Quận 5 filter");
    await mgr.page.getByLabel(`Chọn ${A}`).check();
    await mgr.page.getByLabel(`Chọn ${B}`).check();
    await mgr.page.getByLabel("Tài xế").selectOption({ label: "Tài xế 1" });
    await mgr.page.getByRole("button", { name: "Giao cho tài xế" }).click();
    await until(() => orderStatus(B), (s) => s === "assigned", "B assigned");
    eq([(await order(A)).status, (await order(A)).driver_id], ["assigned", driver1], "A assigned to driver1");

    step("driver delivers A, fails B");
    const d2 = await login(browser, "driver2@local", true);
    eq(await d2.page.locator(`[data-order-code="${A}"]`).count(), 0, "driver2 does not see driver1's orders");
    const d1 = await login(browser, "driver1@local", true);
    await d1.page.goto(`${BASE}/admin/orders`);
    assert(d1.page.url().endsWith("/driver"), "driver bounced from admin pages");
    await d1.page.locator(`[data-order-code="${A}"]`).getByRole("button", { name: "Đã giao" }).click();
    await until(() => orderStatus(A), (s) => s === "delivered", "A delivered");
    assert((await order(A)).delivered_at, "delivered_at set");
    const cardB = d1.page.locator(`[data-order-code="${B}"]`);
    await cardB.getByPlaceholder("Lý do thất bại").fill("Khách vắng nhà");
    await cardB.getByRole("button", { name: "Thất bại" }).click();
    await until(() => orderStatus(B), (s) => s === "failed", "B failed");
    eq((await order(B)).fail_reason, "Khách vắng nhà", "fail reason stored");

    step("manager sends failed B back to ready and marks A paid");
    await mgr.page.goto(`${BASE}/admin/dispatch`);
    await mgr.page.locator(`[data-order-code="${B}"]`).getByRole("button", { name: "Giao lại" }).click();
    await until(() => orderStatus(B), (s) => s === "ready", "B back to ready");
    eq((await order(B)).driver_id, null, "B driver cleared for re-dispatch");
    await mgr.page.goto(`${BASE}/admin/orders?date=${D}`);
    await mgr.page.locator(`[data-order-code="${A}"]`).getByRole("button", { name: "Đánh dấu đã trả" }).click();
    await until(async () => (await order(A)).payment_status, (s) => s === "paid", "A paid");

    step("commission");
    const expected = Math.round((a0.total * 5) / 100);
    await mgr.page.goto(`${BASE}/admin/commission`);
    eq(await mgr.page.getByTestId("commission-NVKD01").innerText(), formatVnd(expected), "sale1 commission = 5% of delivered A only");
    eq(await mgr.page.getByTestId("commission-NVKD02").innerText(), formatVnd(0), "sale2 earns nothing for B");
    const s1 = await login(browser, "sale1@local", true);
    eq(await s1.page.getByTestId("sale-commission").innerText(), formatVnd(expected), "sale1 dashboard shows same estimate");
    assert((await s1.page.getByTestId("ref-link").innerText()).endsWith("/r/NVKD01"), "sale1 sees own ref link");

    step("customer lookup by phone");
    await customer.page.goto(`${BASE}/orders?phone=0909111222`);
    const lookup = await customer.page.locator("main").innerText();
    assert(lookup.includes(A) && lookup.includes(B) && lookup.includes("Đã giao"), "lookup lists both orders with status");
  } finally {
    await browser.close();
  }
  console.log(`\nE2E PASSED: ${passed} checks`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
