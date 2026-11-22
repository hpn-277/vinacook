/**
 * Full order lifecycle against the running app + local Supabase.
 * Usage: npm run dev (in another shell), then `npm run e2e` (add `-- --no-reset` to keep current data).
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import type { Database } from "@noodle/core/database.types";
import { formatVnd } from "@noodle/core/domain/money";
import { JOB_TRANSITIONS, ORDER_TRANSITIONS } from "@noodle/core/domain/status";
import { addDays, type IsoDate } from "@noodle/core/domain/time";

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

/** Picks an action from an order row's "⋯" menu; the confirm dialog it opens is left to the caller. */
async function rowAction(page: Page, code: string, item: string | RegExp) {
  await page.locator(`[data-order-code="${code}"]`).getByRole("button", { name: `Thao tác ${code}` }).click();
  await page.getByRole("menuitem", { name: item }).click();
}

/** On the production page, ticks every factory still to receive and confirms them in one go. */
async function receiveAllFactories(page: Page) {
  const summary = page.getByTestId("sent-summary");
  const selectAll = summary.getByRole("checkbox", { name: "Chọn tất cả xưởng chưa nhận hàng" });
  if ((await selectAll.count()) === 0) return;
  await selectAll.click();
  await summary.getByRole("button", { name: /Xác nhận đã nhận hàng/ }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Xác nhận" }).click();
  await selectAll.waitFor({ state: "detached" });
}

async function newPage(browser: Browser, mobile = false): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext(mobile ? MOBILE : { viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
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

/** items: "<product> - <pack>" -> pack quantity. Returns the order code and the shop's cart total before checkout. */
async function customerCheckout(page: Page, items: Record<string, number>, info: { name: string; phone: string; address: string; district: string }) {
  for (const [pack, qty] of Object.entries(items)) {
    await page.goto(`${BASE}/`);
    await page.locator(`[data-product="${pack.split(" - ")[0]}"]`).click();
    await page.getByLabel(`Số lượng ${pack}`, { exact: true }).fill(String(qty));
  }
  const hint = await page.getByTestId("cart-total").innerText();
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
  return { code, hint, message: text };
}

async function items(code: string) {
  const { data, error } = await admin
    .from("order_items")
    .select("pack_id, pack_name, pack_qty, qty_kg, price_per_kg, line_total, products(name), orders!inner(code)")
    .eq("orders.code", code)
    .order("id");
  if (error) throw error;
  return data;
}

async function structuralChecks() {
  step("DB mirrors TS domain tables");
  const { data: edges } = await admin.from("status_transitions").select("machine, from_status, to_status");
  const fromTs = [
    ...Object.entries(ORDER_TRANSITIONS).flatMap(([f, tos]) => tos.map((t) => `orders:${f}->${t}`)),
    ...Object.entries(JOB_TRANSITIONS).flatMap(([f, tos]) => tos.map((t) => `production_jobs:${f}->${t}`)),
  ].sort();
  eq(edges!.map((e) => `${e.machine}:${e.from_status}->${e.to_status}`).sort(), fromTs, "status_transitions matches ORDER/JOB_TRANSITIONS");

  step("public API key cannot reach data or RPCs");
  const read = await anon.from("orders").select("id");
  eq(read.data, [], "anon reads no orders (RLS)");
  const rpc = await anon.rpc("close_production_day", { p_date: "2030-01-01" });
  assert(rpc.error?.code === "42501", `anon cannot call close_production_day (${rpc.error?.message})`);
  const pay = await anon.rpc("set_payment", { p_order_ids: [1], p_paid: true, p_staff_id: 1, p_note: "" });
  assert(pay.error?.code === "42501", `anon cannot call set_payment (${pay.error?.message})`);
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
    eq(await customer.page.title(), "VinaCook - Đặt hàng", "page title carries the VinaCook brand");
    eq((await customer.page.locator("header a").first().innerText()).trim(), "VinaCook", "shop header shows VinaCook");
    const placedA = await customerCheckout(
      customer.page,
      { "Mì trứng - Bao": 1, "Mì trứng - Kg": 5, "Bún tươi - Thùng": 2 },
      { name: "Chị Mai", phone: "0909111222", address: "100 Nguyễn Trãi", district: "Quận 5" },
    );
    const A = placedA.code;
    const a0 = await order(A);
    eq(a0.sale_id, sale1, "order A snapshots sale1");
    eq(placedA.hint, formatVnd(a0.total), "shop cart total matches the server-priced total");
    assert(placedA.message.includes(formatVnd(a0.total)), `confirmation shows the total: "${placedA.message}"`);
    eq(
      (await items(A)).map((i) => `${i.products!.name}:${i.pack_qty} ${i.pack_name}=${i.qty_kg}kg@${i.price_per_kg}`),
      ["Mì trứng:5 Kg=5kg@25000", "Mì trứng:1 Bao=25kg@25000", "Bún tươi:2 Thùng=20kg@15000"],
      "A keeps one line per pack, snapshots pack and converts to kg",
    );
    const confirmLines = await customer.page.locator("main").innerText();
    assert(confirmLines.includes("Mì trứng · 1 Bao (25 kg)") && confirmLines.includes("Bún tươi · 2 Thùng (20 kg)"), "checkout confirmation lists packs");
    const { data: cust } = await admin.from("customers").select("sale_id").eq("phone", "0909111222").single();
    eq(cust!.sale_id, sale1, "new customer bound to sale1");

    step("sale2 enters an order for the same phone");
    const s2 = await login(browser, "sale2@local", true);
    await s2.page.goto(`${BASE}/sale/orders/new?phone=0909111222`);
    assert((await s2.page.getByRole("note").innerText()).includes("NVKD 01"), "sale2 is warned the customer belongs to NVKD 01");
    await s2.page.getByLabel("Số lượng Mì trứng - Thùng", { exact: true }).fill("1");
    await s2.page.getByRole("button", { name: "Tạo đơn" }).click();
    const s2msg = await s2.page.getByRole("status").innerText();
    assert(s2msg.includes("thuộc nhân viên khác"), `sale2 sees ownership warning after save: "${s2msg}"`);
    const B = /DH\d{6}/.exec(s2msg)![0];
    const b0 = await order(B);
    eq([b0.sale_id, b0.created_by, b0.created_by_staff_id], [sale1, "sale", sale2], "order B saved, commission stays with sale1");
    assert(s2msg.includes(formatVnd(b0.total)), "sale sees the total in the confirmation");
    const { data: cust2 } = await admin.from("customers").select("sale_id").eq("phone", "0909111222").single();
    eq(cust2!.sale_id, sale1, "customer owner not overwritten");

    step("walk-in customer without ref in another district");
    const walkIn = await newPage(browser, true);
    const placedC = await customerCheckout(
      walkIn.page,
      { "Mì trứng - Thùng": 1, "Mì trứng - Kg": 5 },
      { name: "Anh Tùng", phone: "0909333444", address: "5 Hoàng Văn Thụ", district: "Tân Bình" },
    );
    const C = placedC.code;
    const c0 = await order(C);
    eq(c0.sale_id, null, "order C has no sale");
    eq(placedC.hint, formatVnd(c0.total), "walk-in cart total matches the server-priced total");

    const D = a0.production_date as IsoDate;
    eq([b0.production_date, (await order(C)).production_date], [D, D], `all orders share production date ${D}`);

    step("spam order to be cancelled before close");
    const spam = await newPage(browser, true);
    const { code: S } = await customerCheckout(spam.page, { "Mì quảng - Kg": 3 }, { name: "Khách lạ", phone: "0909777888", address: "1 Lê Duẩn", district: "Quận 1" });
    eq((await order(S)).production_date, D, "spam order lands on the same day");

    step("admin reviews placed orders without an approval step");
    const adm = await login(browser, "admin@local");
    await adm.page.goto(`${BASE}/admin/orders?date=${D}`);
    const cardA = await adm.page.locator(`[data-order-code="${A}"]`).innerText();
    assert(cardA.includes("Mì trứng · 1 Bao (25 kg)") && cardA.includes("Sỉ"), "admin card shows packs and the Sỉ badge");
    assert(cardA.includes("Đặt ") && !cardA.includes("Chờ xử lý"), "placed order shows booking time, no status badge");
    eq(await adm.page.getByRole("button", { name: /Duyệt/ }).count(), 0, "no approve buttons anywhere");
    eq(await adm.page.getByRole("link", { name: "Nhận hàng từ xưởng" }).count(), 0, "no receive link on an open day");
    const openReceive = await admin.rpc("receive_factories", { p_date: D, p_factory_ids: [1] });
    assert(openReceive.error?.message.includes("chưa gửi đơn"), `receive_factories refused on an open day: ${openReceive.error?.message}`);

    await rowAction(adm.page, S, "Hủy");
    const cancelDialog = adm.page.getByRole("alertdialog");
    assert((await cancelDialog.innerText()).includes(`Hủy đơn ${S}?`), "cancel asks for confirmation");
    await cancelDialog.getByRole("button", { name: "Xác nhận" }).click();
    await until(() => orderStatus(S), (s) => s === "cancelled", "spam order cancelled");

    step("admin closes the day splitting Mì trứng across two factories");
    await adm.page.goto(`${BASE}/admin/production/${D}`);
    eq(await adm.page.locator('[data-product="Mì quảng"]').count(), 0, "cancelled order is not in the allocation");
    const submit = adm.page.getByRole("button", { name: "Gửi đơn cho xưởng" });
    assert(await submit.isEnabled(), "default allocation (all to first factory) is complete");
    await adm.page.getByLabel("Mì trứng - Xưởng Bình Tân").fill("30");
    assert(await submit.isDisabled(), "send disabled while Mì trứng is under-allocated");
    await adm.page.getByLabel("Mì trứng - Xưởng Hóc Môn").fill("25");
    assert(await submit.isEnabled(), "send enabled once 30 + 25 = 55 kg (1 Bao + 5 Kg + 1 Thùng + 1 Thùng + 5 Kg)");
    await adm.page.getByLabel("Bún tươi - Xưởng Hóc Môn").fill("0");
    await submit.click();
    await adm.page.getByRole("heading", { name: /Đã gửi cho xưởng/ }).waitFor();
    const { data: jobs0 } = await admin.from("production_jobs").select("id, qty_kg, status, products(name), factories(name)").eq("date", D).order("id");
    eq(
      jobs0!.map((j) => `${j.products!.name}@${j.factories!.name}=${j.qty_kg}:${j.status}`).sort(),
      ["Bún tươi@Xưởng Bình Tân=20:producing", "Mì trứng@Xưởng Bình Tân=30:producing", "Mì trứng@Xưởng Hóc Môn=25:producing"],
      "producing jobs created per product x factory",
    );
    eq([await orderStatus(A), await orderStatus(B), await orderStatus(C)], ["in_production", "in_production", "in_production"], "every placed order -> in_production");
    eq(await orderStatus(S), "cancelled", "cancelled order stays cancelled");
    eq(await adm.page.locator("main").getByRole("button").count(), 0, "closed production page has no job actions");

    step("close day is idempotent");
    const again = await admin.rpc("close_production_day", { p_date: D, p_alloc: [{ product_id: 1, factory_id: 1, qty_kg: 55 }] });
    assert(again.error?.message.includes("đã gửi cho xưởng"), `second close refused: ${again.error?.message}`);
    const { count: jobCount } = await admin.from("production_jobs").select("id", { count: "exact", head: true }).eq("date", D);
    eq(jobCount, 3, "no duplicate jobs");

    step("late order after close rolls to next open day");
    const late = await newPage(browser, true);
    const { code: L } = await customerCheckout(late.page, { "Bún tươi - Túi": 1 }, { name: "Cô Ba", phone: "0909555666", address: "9 Lê Lợi", district: "Quận 1" });
    eq((await order(L)).production_date, addDays(D, 1), "order on closed day goes to next day");

    step("factories see only their own jobs, read-only");
    const f1 = await login(browser, "factory1@local", true);
    const f2 = await login(browser, "factory2@local", true);
    const jobId = (name: string, factory: string) => jobs0!.find((j) => j.products!.name === name && j.factories!.name === factory)!.id;
    const f1Jobs = [jobId("Mì trứng", "Xưởng Bình Tân"), jobId("Bún tươi", "Xưởng Bình Tân")];
    const f2Job = jobId("Mì trứng", "Xưởng Hóc Môn");
    const factoryView = async (page: Page) => {
      await page.goto(`${BASE}/factory`);
      const main = page.locator("main");
      eq([await main.getByRole("button").count(), await main.locator("input, select, textarea").count()], [0, 0], "factory portal has no buttons or inputs");
      const text = await main.innerText();
      assert(![A, B, C, "Chị Mai", "Anh Tùng", "0909111222"].some((x) => text.includes(x)) && !/\d\.\d{3}đ/.test(text), "factory portal shows no customers or prices");
      return page;
    };
    await factoryView(f1.page);
    eq(await f1.page.locator(`[data-job-id="${f1Jobs[0]}"]`).innerText().then((t) => t.replace(/\s+/g, " ").trim()), "Mì trứng 30 kg Đang sản xuất", "factory1 sees its Mì trứng job: product, kg, status");
    eq(await f1.page.locator(`[data-job-id="${f1Jobs[1]}"]`).count(), 1, "factory1 sees its Bún tươi job");
    assert((await f1.page.locator(`[data-factory-day="${D}"]`).innerText()).includes(D), "jobs are listed under their date");
    eq(await f1.page.locator(`[data-job-id="${f2Job}"]`).count(), 0, "factory1 cannot see factory2's job");
    await factoryView(f2.page);
    eq(await f2.page.locator(`[data-job-id="${f2Job}"]`).count(), 1, "factory2 sees its job");
    eq(await f2.page.locator(`[data-job-id="${f1Jobs[0]}"]`).count(), 0, "factory2 cannot see factory1's jobs");

    step("admin receives goods factory by factory");
    await adm.page.goto(`${BASE}/admin/orders?date=${D}`);
    await adm.page.getByRole("link", { name: "Nhận hàng từ xưởng" }).click();
    await adm.page.waitForURL(`**/admin/production/${D}`);
    const summary = adm.page.getByTestId("sent-summary");
    const factoryBoxes = summary.getByRole("checkbox", { name: /^Chọn (?!tất cả)/ });
    const factoryCount = await factoryBoxes.count();
    assert(factoryCount >= 2, `one checkbox per factory (${factoryCount})`);
    const confirmReceive = summary.getByRole("button", { name: /Xác nhận đã nhận hàng/ });
    assert(await confirmReceive.isDisabled(), "confirm disabled until a factory is ticked");
    await factoryBoxes.first().click();
    assert(await confirmReceive.isEnabled(), "ticking a factory enables confirm");
    await confirmReceive.click();
    assert((await adm.page.getByRole("alertdialog").innerText()).includes("Đã nhận đủ hàng"), "receive asks for confirmation");
    await adm.page.getByRole("alertdialog").getByRole("button", { name: "Xác nhận" }).click();
    await until(async () => (await admin.from("production_jobs").select("status").eq("date", D).eq("status", "received")).data?.length ?? 0, (n) => n > 0, "first factory received");
    const { data: halfJobs } = await admin.from("production_jobs").select("status").eq("date", D);
    assert(halfJobs!.some((j) => j.status === "producing"), "other factories still producing after one receive");
    await receiveAllFactories(adm.page);
    await until(() => orderStatus(A), (s) => s === "ready", "A ready");
    eq([await orderStatus(B), await orderStatus(C)], ["ready", "ready"], "all orders of the day -> ready once every factory delivered");
    const { data: receivedJobs } = await admin.from("production_jobs").select("status, qty_kg, received_kg").eq("date", D);
    assert(receivedJobs!.every((j) => j.status === "received" && j.received_kg === j.qty_kg), "every job received at its planned kg");
    eq(await factoryBoxes.count(), 0, "no factory left to tick once every factory delivered");
    await f1.page.reload();
    assert((await f1.page.locator(`[data-job-id="${f1Jobs[0]}"]`).innerText()).includes("Đã nhận hàng"), "factory1 sees its job received");

    step("admin assigns received orders to a driver from the orders page");
    await adm.page.goto(`${BASE}/admin/orders?date=${D}`);
    assert((await adm.page.getByTestId("dispatch-bar").innerText()).includes("3 đơn đã nhận hàng"), "dispatch bar counts the day's received orders");
    eq(await adm.page.getByLabel(`Chọn ${C}`).count(), 1, "every received order has a dispatch checkbox");
    await adm.page.getByLabel(`Chọn ${A}`).check();
    await adm.page.getByLabel(`Chọn ${B}`).check();
    await adm.page.getByLabel("Tài xế").selectOption({ label: "Tài xế 1" });
    await adm.page.getByRole("button", { name: "Giao cho tài xế" }).click();
    await until(() => orderStatus(B), (s) => s === "assigned", "B assigned");
    eq([(await order(A)).status, (await order(A)).driver_id, (await order(A)).departed_at], ["assigned", driver1, null], "A assigned to driver1, not yet departed");
    const skip = await admin.from("orders").update({ status: "delivered", delivered_at: new Date().toISOString() }).eq("code", A);
    assert(skip.error?.message.includes("Không thể chuyển"), `DB refuses assigned -> delivered without departure: ${skip.error?.message}`);

    step("drivers see only their own orders, waiting to be loaded");
    const section = (page: Page, title: string) => page.locator("section", { has: page.getByRole("heading", { name: new RegExp(`^${title} \\(`) }) });
    const d2 = await login(browser, "driver2@local", true);
    eq(await d2.page.locator(`[data-order-code="${A}"], [data-order-code="${B}"]`).count(), 0, "driver2 does not see driver1's orders");
    eq(await d2.page.getByRole("button", { name: /XÁC NHẬN HÀNG ĐÃ LÊN XE/ }).count(), 0, "driver2 has nothing to load");
    const d1 = await login(browser, "driver1@local", true);
    await d1.page.goto(`${BASE}/admin/orders`);
    assert(d1.page.url().endsWith("/driver"), "driver bounced from admin pages");
    const waiting = section(d1.page, "Chờ lên xe");
    eq([await waiting.locator(`[data-order-code="${A}"]`).count(), await waiting.locator(`[data-order-code="${B}"]`).count()], [1, 1], "driver1 sees A and B under Chờ lên xe");
    const driverCardA = await waiting.locator(`[data-order-code="${A}"]`).innerText();
    assert(driverCardA.includes("Chị Mai") && driverCardA.includes("100 Nguyễn Trãi, Quận 5") && driverCardA.includes("Tổng 50 kg") && driverCardA.includes(`Thu hộ ${formatVnd(a0.total)}`), "driver card shows customer, address, kg and COD");
    eq(
      await waiting.locator(`[data-order-code="${A}"]`).getByRole("link", { name: /Chỉ đường/ }).getAttribute("href"),
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent("100 Nguyễn Trãi, Quận 5, TP. Hồ Chí Minh")}`,
      "Maps button opens directions to the full address",
    );
    eq(await waiting.locator(`[data-order-code="${A}"]`).getByRole("link", { name: /Gọi/ }).getAttribute("href"), "tel:0909111222", "call button dials the customer");

    await customer.page.goto(`${BASE}/orders?phone=0909111222`);
    eq(await customer.page.getByTestId("on-the-way").count(), 0, "customer sees no on-the-way notice before departure");
    assert((await customer.page.locator(`[data-order-code="${A}"]`).innerText()).includes("Chờ lên xe"), "customer sees Chờ lên xe before departure");

    step("driver confirms all orders loaded");
    await d1.page.getByRole("button", { name: "XÁC NHẬN HÀNG ĐÃ LÊN XE (2 đơn)" }).click();
    const departDialog = d1.page.getByRole("alertdialog");
    assert((await departDialog.innerText()).includes("Xác nhận 2 đơn đã lên xe"), "departure asks for confirmation");
    await departDialog.getByRole("button", { name: "Xác nhận" }).click();
    await until(() => orderStatus(B), (s) => s === "out_for_delivery", "B out for delivery");
    const [aOut, bOut] = [await order(A), await order(B)];
    eq([aOut.status, bOut.status], ["out_for_delivery", "out_for_delivery"], "both orders out_for_delivery in one go");
    assert(aOut.departed_at && aOut.departed_at === bOut.departed_at, "departed_at set once for the whole load");
    const onTheRoad = section(d1.page, "Đang giao");
    await onTheRoad.locator(`[data-order-code="${A}"]`).waitFor();
    eq(await d1.page.getByRole("button", { name: /XÁC NHẬN HÀNG ĐÃ LÊN XE/ }).count(), 0, "departure button gone once loaded");

    step("every party sees the order on the road");
    await customer.page.reload();
    const onTheWay = await customer.page.locator(`[data-order-code="${A}"]`).getByTestId("on-the-way").innerText();
    assert(onTheWay.includes("Đơn hàng đang trên đường giao đến bạn") && onTheWay.includes("Tài xế 1") && onTheWay.includes("0910000001"), `customer sees on-the-way notice with driver phone: "${onTheWay}"`);
    const s1 = await login(browser, "sale1@local", true);
    assert((await s1.page.locator(`[data-order-code="${A}"]`).innerText()).includes("Đang giao"), "sale1 dashboard shows A Đang giao");
    await adm.page.goto(`${BASE}/admin/orders?date=${D}`);
    assert((await adm.page.locator(`[data-order-code="${A}"]`).innerText()).includes("Đã rời kho ·"), "admin orders page shows A Đã rời kho");

    step("a single late order is loaded on its own");
    await adm.page.getByLabel(`Chọn ${C}`).check();
    await adm.page.getByLabel("Tài xế").selectOption({ label: "Tài xế 1" });
    await adm.page.getByRole("button", { name: "Giao cho tài xế" }).click();
    await until(() => orderStatus(C), (s) => s === "assigned", "C assigned");
    await d1.page.reload();
    await d1.page.getByRole("button", { name: "XÁC NHẬN HÀNG ĐÃ LÊN XE (1 đơn)" }).waitFor();
    await section(d1.page, "Chờ lên xe").locator(`[data-order-code="${C}"]`).getByRole("button", { name: "Lên xe" }).click();
    await until(() => orderStatus(C), (s) => s === "out_for_delivery", "C out for delivery");
    eq([(await order(A)).departed_at, (await order(C)).departed_at !== aOut.departed_at], [aOut.departed_at, true], "Lên xe moves only C; A keeps its departure time");

    step("driver completes A with a proof photo, fails B");
    await onTheRoad.locator(`[data-order-code="${A}"]`).getByRole("button", { name: "HOÀN THÀNH GIAO HÀNG" }).click();
    const doneDialog = d1.page.getByRole("dialog");
    const bigPhoto = await d1.page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 2400;
      c.height = 1800;
      const g = c.getContext("2d")!;
      g.fillStyle = "#b91c1c";
      g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = "#fff";
      g.font = "200px sans-serif";
      g.fillText("Đã ký nhận", 300, 950);
      return c.toDataURL("image/png").split(",")[1];
    });
    await doneDialog.getByLabel("Ảnh bằng chứng giao hàng").setInputFiles({ name: "proof.png", mimeType: "image/png", buffer: Buffer.from(bigPhoto, "base64") });
    await doneDialog.getByRole("img", { name: "Ảnh bằng chứng giao hàng" }).waitFor();
    await doneDialog.getByRole("button", { name: "Xác nhận đã giao" }).click();
    await until(() => orderStatus(A), (s) => s === "delivered", "A delivered");
    const aDone = await order(A);
    assert(aDone.delivered_at && aDone.delivery_photo_path?.startsWith(`${aDone.id}/`), `delivered_at and photo path set (${aDone.delivery_photo_path})`);
    const photoUrl = `${BASE}/files/delivery/${aDone.delivery_photo_path}`;
    const stored = await d1.page.request.get(photoUrl);
    eq(stored.headers()["content-type"], "image/jpeg", "photo stored in R2 as a client-downscaled JPEG");
    eq((await fetch(photoUrl)).status, 404, "logged-out request cannot read delivery photos");
    const deliveredToday = section(d1.page, "Đã giao hôm nay");
    await deliveredToday.getByRole("img", { name: `Ảnh giao ${A}` }).waitFor();
    eq(await onTheRoad.locator(`[data-order-code="${A}"]`).count(), 0, "A moved from Đang giao to Đã giao hôm nay with its photo");

    const cardB = onTheRoad.locator(`[data-order-code="${B}"]`);
    await cardB.getByRole("button", { name: "Thất bại" }).click();
    eq(await orderStatus(B), "out_for_delivery", "fail without a reason is blocked");
    await cardB.getByPlaceholder("Lý do thất bại").fill("Khách vắng nhà");
    await cardB.getByRole("button", { name: "Thất bại" }).click();
    await until(() => orderStatus(B), (s) => s === "failed", "B failed");
    eq((await order(B)).fail_reason, "Khách vắng nhà", "fail reason stored");

    step("admin sees the proof photo and the departure in the timeline");
    await adm.page.goto(`${BASE}/admin/orders/${A}`);
    const proof = adm.page.getByTestId("delivery-photo").getByRole("img");
    await proof.waitFor();
    eq(await proof.evaluate((img: HTMLImageElement) => (img.complete ? [img.naturalWidth, img.naturalHeight] : null)), [1600, 1200], "admin detail renders the photo, downscaled to 1600px");
    assert((await adm.page.locator("main").innerText()).includes("Hàng đã lên xe ·"), "timeline shows when the goods left");

    step("admin sends failed B back to ready");
    await adm.page.goto(`${BASE}/admin/orders?date=${D}`);
    await rowAction(adm.page, B, "Giao lại");
    await adm.page.getByRole("alertdialog").getByRole("button", { name: "Xác nhận" }).click();
    await until(() => orderStatus(B), (s) => s === "ready", "B back to ready");
    eq([(await order(B)).driver_id, (await order(B)).departed_at], [null, null], "B driver and departure cleared for re-dispatch");

    step("manager sees orders, overview and staff read-only, but may mark payment");
    const mgr = await login(browser, "manager@local");
    eq(new URL(mgr.page.url()).pathname, "/admin/orders", "manager lands on today's orders");
    eq(await mgr.page.locator("aside nav a").allInnerTexts(), ["Đơn hàng", "Tổng quan", "Nhân viên"], "manager nav has only the read-only pages");
    await mgr.page.goto(`${BASE}/admin/orders?date=${D}`);
    const mgrRowA = mgr.page.locator(`[data-order-code="${A}"]`);
    assert((await mgrRowA.innerText()).includes("Chưa trả"), "manager sees A unpaid");
    await mgrRowA.getByRole("button", { name: `Thao tác ${A}` }).click();
    eq(await mgr.page.getByRole("menuitem").allInnerTexts(), ["Đã thu"], "manager's row menu only marks paid");
    await mgr.page.keyboard.press("Escape");
    eq(await mgr.page.getByTestId("dispatch-bar").count(), 0, "no dispatch bar for the manager");
    eq(await mgr.page.getByRole("link", { name: /Gửi đơn cho xưởng|Xem hàng đã đặt xưởng/ }).count(), 0, "no production link for the manager");
    await mgr.page.goto(`${BASE}/admin/orders/${A}`);
    await mgr.page.goto(`${BASE}/admin/staff`);
    eq(await mgr.page.locator("main").getByRole("button").count(), 0, "staff page has no create, edit or resend for the manager");
    await mgr.page.goto(`${BASE}/admin/products`);
    eq(new URL(mgr.page.url()).pathname, "/admin/orders", "manager is sent back from admin-only pages");
    const refused = await mgr.page.request.post(`${BASE}/api/v1/orders/${a0.id}/move`, { data: { to: "cancelled" } });
    eq(refused.status(), 403, "API refuses order moves from the manager");

    step("admin confirms A paid on the order page");
    const adminId = await staffId("admin@local");
    await adm.page.goto(`${BASE}/admin/orders/${A}`);
    const payPanel = adm.page.getByTestId("payment-panel");
    await payPanel.getByLabel("Ghi chú thu tiền").fill("Tiền mặt");
    await payPanel.getByRole("button", { name: "Xác nhận đã thu" }).click();
    assert((await adm.page.getByRole("alertdialog").innerText()).includes(formatVnd(a0.total)), "confirm dialog shows the total");
    await adm.page.getByRole("alertdialog").getByRole("button", { name: "Xác nhận" }).click();
    await until(async () => (await order(A)).payment_status, (s) => s === "paid", "A paid");
    eq((await order(A)).paid_by, adminId, "A paid_by the admin");
    const { data: payEvents } = await admin.from("payment_events").select("action, amount, staff_id, note").eq("order_id", a0.id);
    eq(payEvents, [{ action: "paid", amount: a0.total, staff_id: adminId, note: "Tiền mặt" }], "one payment event logged");
    await adm.page.reload();
    assert((await payPanel.innerText()).includes("Quản trị"), "payment box shows A collected by Quản trị");

    step("commission");
    const expected = Math.round((a0.total * 5) / 100);
    await s1.page.reload();
    eq(await s1.page.getByTestId("sale-commission").innerText(), formatVnd(expected), "sale1 commission = 5% of delivered A only");
    assert((await s1.page.getByTestId("ref-link").innerText()).endsWith("/r/NVKD01"), "sale1 sees own ref link");

    step("customer lookup by phone");
    await customer.page.goto(`${BASE}/orders?phone=0909111222`);
    const lookup = await customer.page.locator("main").innerText();
    assert(lookup.includes(A) && lookup.includes(B) && lookup.includes("Đã giao"), "lookup lists both orders with status");
    assert(lookup.includes("Bún tươi · 2 Thùng (20 kg)"), "lookup lists packs");

    step("one-tap reorder");
    await adm.page.goto(`${BASE}/admin/products`);
    await adm.page.getByLabel("Đang bán Bún tươi - Thùng").click();
    await adm.page.getByLabel("Tải ảnh Bún tươi - Thùng").setInputFiles({ name: "thung.png", mimeType: "image/png", buffer: Buffer.from(bigPhoto, "base64") });
    await adm.page.getByRole("button", { name: "Lưu Bún tươi - Thùng" }).click();
    const thungId = (await items(A)).find((i) => i.pack_name === "Thùng")!.pack_id;
    const thung = await until(async () => (await admin.from("product_packs").select("active, image_url").eq("id", thungId).single()).data!, (pk) => !pk.active, "pack deactivated in settings");
    assert(thung.image_url?.startsWith("/files/products/"), `uploaded pack image stored in R2 (${thung.image_url})`);
    const image = await fetch(`${BASE}${thung.image_url}`);
    eq([image.status, image.headers.get("content-type")], [200, "image/jpeg"], "product image is public and downscaled to JPEG");

    await customer.page.goto(`${BASE}/`);
    const lastCard = customer.page.getByTestId("last-order");
    await lastCard.waitFor();
    assert((await lastCard.innerText()).includes(B), "shop offers to reorder the phone's latest order (B)");
    eq(await customer.page.locator('[aria-label^="Số lượng Bún tươi - Thùng"]').count(), 0, "deactivated pack is gone from the shop");

    await customer.page.goto(`${BASE}/orders?phone=0909111222`);
    await customer.page.locator(`[data-order-code="${A}"]`).getByRole("button", { name: "Đặt lại" }).click();
    await customer.page.waitForURL("**/checkout?**");
    const notice = await customer.page.getByTestId("reorder-notice").innerText();
    assert(notice.includes(A) && notice.includes("Bún tươi · 2 Thùng (20 kg)"), `reorder notice names the order and the skipped pack: "${notice}"`);
    eq(
      [
        await customer.page.getByLabel("Họ tên").inputValue(),
        await customer.page.getByLabel("Số điện thoại").inputValue(),
        await customer.page.getByLabel("Địa chỉ").inputValue(),
        await customer.page.getByLabel("Quận/Huyện").inputValue(),
      ],
      ["Chị Mai", "0909111222", "100 Nguyễn Trãi", "Quận 5"],
      "reorder prefills the customer",
    );
    eq(await customer.page.getByTestId("checkout-total").innerText(), formatVnd(30 * 31300), "reorder of the remaining 30 kg is priced at today's retail");
    await customer.page.getByRole("button", { name: "Xác nhận đặt hàng" }).click();
    const R = /DH\d{6}/.exec(await customer.page.getByRole("status").innerText())![0];
    const r0 = await order(R);
    eq(
      (await items(R)).map((i) => `${i.pack_id}x${i.pack_qty}`),
      (await items(A)).filter((i) => i.pack_id !== thungId).map((i) => `${i.pack_id}x${i.pack_qty}`),
      "reorder repeats A's packs and quantities minus the inactive one",
    );
    eq(r0.sale_id, sale1, "reorder stays with sale1");
  } finally {
    await browser.close();
  }
  console.log(`\nE2E PASSED: ${passed} checks`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
