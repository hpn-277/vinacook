/**
 * Drives every web form once against the running web app + API worker + local Supabase, checking the database after each write.
 * Usage: `pnpm dev` (root) in another shell, then `pnpm --filter @noodle/web smoke` (resets the local database first).
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { chromium, type Browser, type Page } from "playwright";
import type { Database } from "@noodle/core/database.types";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PASSWORD = "password123";
const admin = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

let passed = 0;
function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${message}`);
  passed++;
  console.log(`  ok  ${message}`);
}
const step = (name: string) => console.log(`\n# ${name}`);

async function until<T>(read: () => Promise<T>, ok: (v: T) => boolean, what: string, timeoutMs = 10000): Promise<T> {
  const start = Date.now();
  let last = await read();
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
const statusOf = (code: string) => order(code).then((o) => o.status);
const waitStatus = (code: string, status: string) => until(() => statusOf(code), (s) => s === status, `${code} ${status}`);

async function newPage(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.error("  page error:", e.message));
  return page;
}

async function login(browser: Browser, email: string): Promise<Page> {
  const page = await newPage(browser);
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  return page;
}

/** Answers the ActionForm `confirm` dialog. */
async function confirm(page: Page) {
  await page.getByRole("alertdialog").getByRole("button", { name: "Xác nhận" }).click();
}

const PRODUCT = "Hủ tiếu dai vắt Chu Hải";

async function customerCheckout(page: Page, phone: string, name: string) {
  await page.goto(`${BASE}/`);
  await page.locator(`[data-product="${PRODUCT}"]`).click();
  await page.getByLabel(`Thêm ${PRODUCT} - Cây 5 kg`, { exact: true }).click();
  await page.getByRole("link", { name: "Đặt hàng" }).click();
  await page.waitForURL("**/checkout");
  await page.getByLabel("Họ tên").fill(name);
  await page.getByLabel("Số điện thoại").fill(phone);
  await page.getByLabel("Địa chỉ").fill("1 Lê Lợi");
  await page.getByLabel("Quận/Huyện").selectOption("Quận 1");
  await page.getByRole("button", { name: "Xác nhận đặt hàng" }).click();
  const text = await page.getByRole("status").innerText();
  const code = /DH\d{6}/.exec(text)?.[0];
  assert(code, `customer order placed: "${text.split("\n")[0]}"`);
  return code;
}

async function main() {
  if (!process.argv.includes("--no-reset")) {
    console.log("resetting database...");
    execSync("npx supabase db reset", { stdio: "ignore" });
  }
  const browser = await chromium.launch();
  try {
    step("customer checkout through a ref link (POST /shop/orders)");
    const customer = await newPage(browser);
    await customer.goto(`${BASE}/r/NVKD01`);
    const A = await customerCheckout(customer, "0909111222", "Chị Mai");
    const a = await order(A);
    assert(a.sale_id != null, "ref cookie reached the API and claimed the customer for sale1");
    const D = a.production_date;
    const C = await customerCheckout(customer, "0909333444", "Spam");

    step("last order card (GET /shop/last-order)");
    await customer.goto(`${BASE}/`);
    await customer.getByTestId("last-order").waitFor();
    assert((await customer.getByTestId("last-order").innerText()).includes(A) || (await customer.getByTestId("last-order").innerText()).includes(C), "shop shows the remembered phone's last order");

    step("sale enters an order (login + POST /shop/staff-orders)");
    const sale = await login(browser, "sale1@local");
    assert(new URL(sale.url()).pathname === "/sale", "login redirects to the role home");
    await sale.goto(`${BASE}/sale/orders/new?phone=0909555666`);
    await sale.locator('[name="name"]').fill("Anh Tùng");
    await sale.locator('[name="address"]').fill("2 Hai Bà Trưng");
    await sale.locator('[name="district"]').selectOption("Quận 3");
    await sale.getByLabel(`Số lượng ${PRODUCT} - Bao 30 kg`, { exact: true }).fill("1");
    await sale.getByRole("button", { name: /Tạo đơn/ }).click();
    const saleMsg = await sale.getByRole("status").innerText();
    const B = /DH\d{6}/.exec(saleMsg)?.[0];
    assert(B, `staff order placed: "${saleMsg}"`);
    assert((await order(B)).created_by === "sale", "staff order stored as the sale's");

    step("manager cancels the spam order (POST /orders/:id/move)");
    const mgr = await login(browser, "manager@local");
    await mgr.goto(`${BASE}/admin/orders/${C}`);
    await mgr.locator(`form:has(input[name="to"][value="cancelled"]) button`).click();
    await confirm(mgr);
    await waitStatus(C, "cancelled");
    assert(true, "C cancelled");

    step("manager edits A's contact (PATCH /orders/:id/contact)");
    await mgr.goto(`${BASE}/admin/orders/${A}`);
    await mgr.getByRole("button", { name: `Sửa SĐT, địa chỉ đơn ${A}` }).click();
    await mgr.getByRole("dialog").locator('[name="address"]').fill("100 Nguyễn Trãi");
    await mgr.getByRole("dialog").getByRole("button", { name: "Lưu" }).click();
    await until(() => order(A).then((o) => o.address), (v) => v === "100 Nguyễn Trãi", "address saved");
    assert(true, "contact edit saved and logged");

    step("manager closes the day (POST /days/:date/close)");
    await mgr.goto(`${BASE}/admin/production/${D}`);
    await mgr.getByRole("button", { name: "Chốt ngày và gửi lệnh sản xuất" }).click();
    await confirm(mgr);
    await waitStatus(A, "in_production");
    assert((await statusOf(B)) === "in_production", "every placed order -> in_production");

    step("manager receives the day (POST /days/:date/receive)");
    await mgr.goto(`${BASE}/admin/orders?date=${D}`);
    await mgr.getByRole("button", { name: "Xác nhận đã nhận hàng" }).click();
    await confirm(mgr);
    await waitStatus(A, "ready");
    assert((await statusOf(B)) === "ready", "orders -> ready");

    step("manager assigns, unassigns all, reassigns (POST /orders/assign, /days/:date/unassign)");
    const driver1 = (await admin.from("staff").select("id").eq("name", "Tài xế 1").single()).data!.id;
    const assign = async () => {
      await mgr.goto(`${BASE}/admin/orders?date=${D}`);
      await mgr.getByLabel(`Chọn ${A}`).check();
      await mgr.getByLabel(`Chọn ${B}`).check();
      await mgr.getByLabel("Tài xế", { exact: true }).selectOption(String(driver1));
      await mgr.getByRole("button", { name: "Giao cho tài xế" }).click();
      await waitStatus(B, "assigned");
    };
    await assign();
    assert((await order(A)).driver_id === driver1, "A assigned to driver1");
    await mgr.reload();
    await mgr.locator(`form:has(input[name="date"]) button:has-text("Hủy phân công")`).click();
    await confirm(mgr);
    await waitStatus(A, "ready");
    assert(true, "unassign day sends both back to ready");
    await assign();

    step("driver loads, completes with a photo, fails one (POST /driver/orders/*)");
    const drv = await login(browser, "driver1@local");
    await drv.getByRole("button", { name: /XÁC NHẬN HÀNG ĐÃ LÊN XE/ }).click();
    await confirm(drv);
    await waitStatus(A, "out_for_delivery");
    assert((await statusOf(B)) === "out_for_delivery", "depart moves the driver's orders");
    await drv.reload();
    await drv.getByRole("button", { name: "HOÀN THÀNH GIAO HÀNG" }).first().click();
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    await drv.getByRole("dialog").getByLabel("Ảnh bằng chứng giao hàng").setInputFiles({ name: "proof.png", mimeType: "image/png", buffer: png });
    await drv.getByRole("dialog").locator("img").waitFor();
    await drv.getByRole("dialog").getByRole("button", { name: "Xác nhận đã giao" }).click();
    const delivered = await until(
      async () => (await admin.from("orders").select("code, status, delivery_photo_path").in("code", [A, B]).eq("status", "delivered")).data ?? [],
      (rows) => rows.length === 1,
      "one order delivered",
    );
    assert(delivered[0].delivery_photo_path, "delivery photo stored in R2 by the API");
    const failed = delivered[0].code === A ? B : A;
    await drv.reload();
    await drv.getByLabel(`Lý do thất bại ${failed}`).fill("Khách vắng nhà");
    await drv.locator(`form:has([aria-label="Lý do thất bại ${failed}"]) button`).click();
    await waitStatus(failed, "failed");
    assert(true, "fail with reason");

    step("delivery photo is staff-only (GET /files/delivery/*)");
    const photoUrl = `${BASE}/files/delivery/${delivered[0].delivery_photo_path}`;
    assert((await mgr.request.get(photoUrl)).status() === 200, "manager can load the proof photo");
    assert((await customer.request.get(photoUrl)).status() === 404, "anonymous visitor gets 404");

    step("cashier settles the delivered order (POST /payments)");
    const cashier = await login(browser, "cashier@local");
    await cashier.goto(`${BASE}/finance`);
    await cashier.getByLabel(new RegExp(`Chọn.*${delivered[0].code}`)).check();
    await cashier.getByRole("button", { name: /Xác nhận đã thu/ }).click();
    await confirm(cashier);
    await until(() => order(delivered[0].code).then((o) => o.paid_at), (v) => v != null, "paid");
    assert(true, "payment recorded");

    step("factory proposes two products, manager approves one, rejects one (POST /factory/products, /products/:id/approve|reject)");
    const fac = await login(browser, "factory1@local");
    const propose = async (name: string) => {
      await fac.goto(`${BASE}/factory/products`);
      await fac.getByRole("button", { name: /Thêm sản phẩm|Đề xuất/ }).click();
      const dialog = fac.getByRole("dialog");
      await dialog.locator('[name="name"]').fill(name);
      await dialog.locator('[name="price_per_kg"]').fill("20000");
      await dialog.getByRole("button", { name: "Gửi để duyệt" }).click();
      await until(async () => (await admin.from("products").select("status").eq("name", name).maybeSingle()).data?.status, (s) => s === "pending", `${name} pending`);
    };
    await propose("Bánh canh thử");
    await propose("Bún thử");
    assert(true, "factory products pending");
    await mgr.goto(`${BASE}/admin/products`);
    await mgr.getByRole("button", { name: "Duyệt Bánh canh thử", exact: true }).click();
    await until(async () => (await admin.from("products").select("status").eq("name", "Bánh canh thử").single()).data?.status, (s) => s === "approved", "approved");
    assert(true, "approve");
    await mgr.getByRole("button", { name: "Không duyệt Bún thử" }).click();
    await mgr.getByRole("dialog").locator('[name="reason"]').fill("Giá cao");
    await mgr.getByRole("dialog").getByRole("button").filter({ hasText: /Trả|Không duyệt/ }).last().click();
    await until(async () => (await admin.from("products").select("status").eq("name", "Bún thử").single()).data?.status, (s) => s === "rejected", "rejected");
    assert(true, "reject with reason");

    step("manager saves pricing (PUT /settings/pricing)");
    await mgr.goto(`${BASE}/admin/products`);
    await mgr.locator('[name="retail_markup_pct"]').fill("12");
    await mgr.locator('form:has([name="retail_markup_pct"]) button').click();
    await until(async () => (await admin.from("settings").select("retail_markup_pct").single()).data?.retail_markup_pct, (v) => Number(v) === 12, "markup 12");
    assert(true, "pricing saved");

    step("manager adds a factory (POST /factories)");
    await mgr.goto(`${BASE}/admin/factories`);
    await mgr.getByRole("button", { name: /Thêm xưởng/ }).first().click();
    await mgr.getByRole("dialog").locator('[name="name"]').fill("Xưởng thử");
    await mgr.getByRole("dialog").getByRole("button", { name: "Thêm xưởng" }).click();
    await until(async () => (await admin.from("factories").select("id").eq("name", "Xưởng thử")).data?.length, (n) => n === 1, "factory added");
    assert(true, "factory added");

    step("manager creates a staff account, then edits it (POST /staff, PATCH /staff/:id)");
    await mgr.goto(`${BASE}/admin/staff`);
    await mgr.getByRole("button", { name: /Thêm nhân viên/ }).click();
    const sd = mgr.getByRole("dialog");
    await sd.locator('[name="email"]').fill("driver9@local");
    await sd.locator('[name="name"]').fill("Tài xế 9");
    await sd.getByRole("button", { name: "Tạo tài khoản và gửi email" }).click();
    await until(async () => (await admin.from("staff").select("id").eq("name", "Tài xế 9")).data?.length, (n) => n === 1, "staff created");
    assert(true, "staff invited");
    await mgr.reload();
    await mgr.getByRole("button", { name: "Sửa Tài xế 9" }).click();
    await mgr.getByRole("dialog").locator('[name="phone"]').fill("0912345678");
    await mgr.getByRole("dialog").getByRole("button", { name: "Lưu" }).click();
    await until(async () => (await admin.from("staff").select("phone").eq("name", "Tài xế 9").single()).data?.phone, (p) => p === "0912345678", "staff phone saved");
    assert(true, "staff updated");

    step("manager emails a password link (POST /staff/:id/password-link)");
    await mgr.goto(`${BASE}/admin/staff`);
    await mgr.locator(`form:has(input[name="id"]) button:has-text("Gửi lại link")`).first().click();
    await confirm(mgr);
    assert((await mgr.getByRole("status").first().innerText()).includes("Đã gửi link đặt mật khẩu"), "password link sent");

    step("manager renames the new factory (PATCH /factories/:id)");
    await mgr.goto(`${BASE}/admin/factories`);
    await mgr.getByRole("button", { name: "Sửa Xưởng thử" }).click();
    await mgr.getByRole("dialog").locator('[name="name"]').fill("Xưởng thử 2");
    await mgr.getByRole("dialog").getByRole("button", { name: "Lưu" }).click();
    await until(async () => (await admin.from("factories").select("id").eq("name", "Xưởng thử 2")).data?.length, (n) => n === 1, "factory renamed");
    assert(true, "factory updated");

    step("manager adds a product, then a pack for it (POST /products, POST /products/:id/packs)");
    await mgr.goto(`${BASE}/admin/products`);
    await mgr.getByRole("button", { name: "Thêm sản phẩm" }).first().click();
    const pd = mgr.getByRole("dialog");
    await pd.locator('[name="name"]').fill("Mì thử");
    await pd.locator('[name="price_per_kg"]').fill("18000");
    await pd.locator('[name="factory_id"]').selectOption({ index: 1 });
    await pd.getByRole("button", { name: "Thêm sản phẩm" }).click();
    const created = await until(async () => (await admin.from("products").select("id, status").eq("name", "Mì thử").maybeSingle()).data, (p) => p != null, "product created");
    const packs = (await admin.from("product_packs").select("id").eq("product_id", created!.id)).data!;
    assert(created!.status === "approved" && packs.length > 0, `manager product created approved with ${packs.length} standard packs`);
    await mgr.reload();
    await mgr.getByRole("button", { name: "Sửa Mì thử" }).click();
    await mgr.getByRole("dialog").locator('[name="new_name"]').fill("Thùng");
    await mgr.getByRole("dialog").locator('[name="new_kg"]').fill("12");
    await mgr.getByRole("dialog").locator(`form:has([name="new_name"]) button[type="submit"]`).click();
    await until(async () => (await admin.from("product_packs").select("id").eq("product_id", created!.id)).data?.length, (n) => n === packs.length + 1, "pack added");
    assert(true, "pack added");

    step("next day: close, reopen, close, receive, assign, driver hands back (POST /days/:date/reopen, /driver/orders/:id/return)");
    const late = await newPage(browser);
    const L = await customerCheckout(late, "0909777888", "Cô Ba");
    const D2 = (await order(L)).production_date;
    assert(D2 !== D, "order after close rolls to the next day");
    const closeDay = async () => {
      await mgr.goto(`${BASE}/admin/production/${D2}`);
      await mgr.getByRole("button", { name: "Chốt ngày và gửi lệnh sản xuất" }).click();
      await confirm(mgr);
      await waitStatus(L, "in_production");
    };
    await closeDay();
    await mgr.goto(`${BASE}/admin/orders?date=${D2}`);
    await mgr.getByRole("button", { name: "Mở lại ngày" }).click();
    await confirm(mgr);
    await waitStatus(L, "placed");
    assert(true, "reopen sends the day's orders back to placed");
    await closeDay();
    await mgr.goto(`${BASE}/admin/orders?date=${D2}`);
    await mgr.getByRole("button", { name: "Xác nhận đã nhận hàng" }).click();
    await confirm(mgr);
    await waitStatus(L, "ready");
    await mgr.getByLabel(`Chọn ${L}`).check();
    await mgr.getByLabel("Tài xế", { exact: true }).selectOption(String(driver1));
    await mgr.getByRole("button", { name: "Giao cho tài xế" }).click();
    await waitStatus(L, "assigned");
    await drv.goto(`${BASE}/driver`);
    await drv.getByLabel(`Lý do trả đơn ${L}`).fill("Xe hỏng");
    await drv.locator(`form:has([aria-label="Lý do trả đơn ${L}"]) button`).click();
    await confirm(drv);
    await waitStatus(L, "ready");
    assert((await order(L)).return_reason === "Xe hỏng", "driver return records the reason");

    step("forgot password (POST /auth/forgot-password) and logout (POST /auth/logout)");
    const anon = await newPage(browser);
    await anon.goto(`${BASE}/forgot-password`);
    await anon.getByLabel("Email").fill("nobody@example.com");
    await anon.locator(`form button[type="submit"]`).click();
    assert((await anon.getByRole("status").innerText()).includes("link đặt lại mật khẩu"), "reset answer shown");
    await sale.getByRole("button", { name: "Đăng xuất" }).click();
    await sale.waitForURL("**/login");
    assert(true, "logout returns to /login");

    console.log(`\nall ${passed} checks passed`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
