/**
 * Drives the full lifecycle through the UI and saves a JPEG at each step.
 * Usage: npm run dev (other shell), then `npm run qa:shots`. Env SHOTS_DIR overrides the output dir.
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import type { Database } from "../lib/database.types";
import type { IsoDate } from "../lib/domain/time";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT =
  process.env.SHOTS_DIR ??
  "/private/tmp/claude-502/-Users-paul-nguyen-safewill-com-Desktop-personal-projs-noodle-distrbition/e46b2a6e-a5c6-46f0-a90e-1869f7559a04/scratchpad/shots";
const PASSWORD = "password123";
const admin = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

let n = 0;
async function shot(page: Page, slug: string) {
  await page.waitForLoadState("networkidle");
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))));
  const file = `${OUT}/${String(++n).padStart(2, "0")}-${slug}.jpg`;
  await page.screenshot({ path: file, type: "jpeg", quality: 70, fullPage: true });
  console.log(`  shot ${file}`);
}

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

const MOBILE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
const DESKTOP = { viewport: { width: 1280, height: 800 } };

async function newPage(browser: Browser, mobile: boolean): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext(mobile ? MOBILE : DESKTOP);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.error("  page error:", e.message));
  return { ctx, page };
}

async function login(browser: Browser, email: string, mobile: boolean) {
  const s = await newPage(browser, mobile);
  await s.page.goto(`${BASE}/login`);
  await s.page.getByLabel("Email").fill(email);
  await s.page.getByLabel("Mật khẩu").fill(PASSWORD);
  await s.page.getByRole("button", { name: "Đăng nhập" }).click();
  await s.page.waitForURL((u) => !u.pathname.startsWith("/login"));
  return s;
}

type Info = { name: string; phone: string; address: string; district: string; note?: string };
async function customerCheckout(page: Page, items: Record<string, number>, info: Info, slug?: string) {
  await page.goto(`${BASE}/`);
  for (const [pack, qty] of Object.entries(items)) await page.getByLabel(`Số lượng ${pack}`, { exact: true }).fill(String(qty));
  if (slug) await shot(page, `${slug}-shop`);
  await page.getByRole("link", { name: "Đặt hàng" }).click();
  await page.waitForURL("**/checkout");
  await page.getByLabel("Họ tên").fill(info.name);
  await page.getByLabel("Số điện thoại").fill(info.phone);
  await page.getByLabel("Địa chỉ").fill(info.address);
  await page.getByLabel("Quận/Huyện").selectOption(info.district);
  if (info.note) await page.getByLabel("Ghi chú").fill(info.note);
  if (slug) await shot(page, `${slug}-checkout-filled`);
  await page.getByRole("button", { name: "Xác nhận đặt hàng" }).click();
  const text = await page.getByRole("status").innerText();
  const code = /DH\d{6}/.exec(text)?.[0];
  if (!code) throw new Error(`no order code in "${text}"`);
  if (slug) await shot(page, `${slug}-order-success`);
  return code;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log("resetting database...");
  execSync("npx supabase db reset", { stdio: "ignore" });

  const browser = await chromium.launch();
  try {
    const customer = await newPage(browser, true);
    await customer.page.goto(`${BASE}/r/NVKD01`);
    const A = await customerCheckout(
      customer.page,
      { "Mì trứng - Bao": 1, "Mì trứng - Kg": 5, "Bún tươi - Thùng": 2 },
      { name: "Chị Mai", phone: "0909111222", address: "100 Nguyễn Trãi", district: "Quận 5", note: "Giao buổi sáng, gọi trước khi đến" },
      "customer",
    );

    const s2 = await login(browser, "sale2@local", true);
    await s2.page.goto(`${BASE}/sale/orders/new?phone=0909111222`);
    await s2.page.getByLabel("Số lượng Mì trứng - Thùng", { exact: true }).fill("1");
    await shot(s2.page, "sale2-new-order-other-sale-warning");
    await s2.page.getByRole("button", { name: "Tạo đơn" }).click();
    const B = /DH\d{6}/.exec(await s2.page.getByRole("status").innerText())![0];
    await shot(s2.page, "sale2-order-saved");

    const walkIn = await newPage(browser, true);
    const C = await customerCheckout(
      walkIn.page,
      { "Mì trứng - Thùng": 1, "Mì trứng - Kg": 5 },
      { name: "Anh Tùng", phone: "0909333444", address: "5 Hoàng Văn Thụ", district: "Tân Bình" },
      "walkin-retail",
    );
    const D = (await order(A)).production_date as IsoDate;

    const s1 = await login(browser, "sale1@local", true);
    await s1.page.goto(`${BASE}/sale/customers`);
    await shot(s1.page, "sale1-customers");

    const mgrLogin = await newPage(browser, false);
    await mgrLogin.page.goto(`${BASE}/login`);
    await shot(mgrLogin.page, "manager-login");
    const mgr = await login(browser, "manager@local", false);

    await mgr.page.goto(`${BASE}/admin/orders?date=${D}`);
    await shot(mgr.page, "admin-orders-placed");
    await mgr.page.locator(`[data-order-code="${C}"]`).getByRole("link", { name: C }).click();
    await mgr.page.waitForURL(`**/admin/orders/${C}`);
    await shot(mgr.page, "admin-order-detail");

    await mgr.page.goto(`${BASE}/admin/production/${D}`);
    await shot(mgr.page, "admin-production-allocation-default");
    await mgr.page.getByLabel("Mì trứng - Xưởng Hóc Môn").fill("350");
    await shot(mgr.page, "admin-production-over-capacity-warning");
    await mgr.page.getByLabel("Mì trứng - Xưởng Bình Tân").fill("30");
    await mgr.page.getByLabel("Mì trứng - Xưởng Hóc Môn").fill("25");
    await mgr.page.getByLabel("Bún tươi - Xưởng Hóc Môn").fill("0");
    await shot(mgr.page, "admin-production-allocation-split");
    await mgr.page.getByRole("button", { name: "Chốt ngày và gửi xưởng" }).click();
    await mgr.page.getByRole("heading", { name: "Lệnh sản xuất" }).waitFor();
    await shot(mgr.page, "admin-production-closed-jobs");

    const f1 = await login(browser, "factory1@local", true);
    await f1.page.goto(`${BASE}/factory`);
    await shot(f1.page, "factory1-jobs-readonly");
    const f2 = await login(browser, "factory2@local", true);
    await f2.page.goto(`${BASE}/factory`);
    await shot(f2.page, "factory2-jobs-readonly");

    await mgr.page.goto(`${BASE}/admin/orders?date=${D}`);
    await shot(mgr.page, "admin-orders-closed-receive-button");
    await mgr.page.getByRole("button", { name: "Xác nhận đã nhận hàng" }).click();
    await mgr.page.getByRole("alertdialog").waitFor();
    await shot(mgr.page, "admin-orders-receive-confirm");
    await mgr.page.getByRole("alertdialog").getByRole("button", { name: "Xác nhận" }).click();
    await until(() => orderStatus(A), (s) => s === "ready", "day received");
    await mgr.page.reload();
    await shot(mgr.page, "admin-orders-received");
    await mgr.page.goto(`${BASE}/admin/orders/${A}`);
    await shot(mgr.page, "admin-order-detail-received");
    await f1.page.reload();
    await shot(f1.page, "factory1-jobs-received");

    await mgr.page.goto(`${BASE}/admin/orders?date=${D}`);
    await shot(mgr.page, "admin-orders-ready-to-dispatch");
    await mgr.page.getByLabel(`Chọn ${A}`).check();
    await mgr.page.getByLabel(`Chọn ${B}`).check();
    await mgr.page.getByLabel("Tài xế").selectOption({ label: "Tài xế 1" });
    await shot(mgr.page, "admin-orders-dispatch-selected");
    await mgr.page.getByRole("button", { name: "Giao cho tài xế" }).click();
    await until(() => orderStatus(B), (s) => s === "assigned", "B assigned");
    await mgr.page.reload();
    await shot(mgr.page, "admin-orders-assigned");

    const d1 = await login(browser, "driver1@local", true);
    await d1.page.goto(`${BASE}/driver`);
    await shot(d1.page, "driver1-waiting-to-load");
    await customer.page.goto(`${BASE}/orders?phone=0909111222`);
    await shot(customer.page, "customer-lookup-waiting-to-load");
    await d1.page.getByRole("button", { name: /XÁC NHẬN HÀNG ĐÃ LÊN XE/ }).click();
    await d1.page.getByRole("alertdialog").waitFor();
    await shot(d1.page, "driver1-departure-confirm");
    await d1.page.getByRole("alertdialog").getByRole("button", { name: "Xác nhận" }).click();
    await until(() => orderStatus(B), (s) => s === "out_for_delivery", "B out for delivery");
    await d1.page.reload();
    await shot(d1.page, "driver1-out-for-delivery");

    await customer.page.reload();
    await shot(customer.page, "customer-lookup-on-the-way");
    await s1.page.goto(`${BASE}/sale`);
    await shot(s1.page, "sale1-dashboard-out-for-delivery");
    await mgr.page.goto(`${BASE}/admin/orders?date=${D}`);
    await shot(mgr.page, "admin-orders-departed");

    await d1.page.locator(`[data-order-code="${A}"]`).getByRole("button", { name: "HOÀN THÀNH GIAO HÀNG" }).click();
    const done = d1.page.getByRole("dialog");
    await done.waitFor();
    await shot(d1.page, "driver1-complete-dialog-empty");
    const photo = await d1.page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 1200;
      c.height = 1600;
      const g = c.getContext("2d")!;
      g.fillStyle = "#fef3c7";
      g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = "#92400e";
      g.font = "bold 90px sans-serif";
      g.fillText("PHIẾU GIAO HÀNG", 160, 300);
      g.font = "60px sans-serif";
      g.fillText("Đã nhận đủ hàng", 260, 900);
      g.fillText("Ký tên: Mai", 360, 1200);
      return c.toDataURL("image/png").split(",")[1];
    });
    await done.getByLabel("Ảnh bằng chứng giao hàng").setInputFiles({ name: "phieu.png", mimeType: "image/png", buffer: Buffer.from(photo, "base64") });
    await done.getByRole("img", { name: "Ảnh bằng chứng giao hàng" }).waitFor();
    await shot(d1.page, "driver1-complete-dialog-photo");
    await done.getByRole("button", { name: "Xác nhận đã giao" }).click();
    await until(() => orderStatus(A), (s) => s === "delivered", "A delivered");
    const cardB = d1.page.locator(`[data-order-code="${B}"]`);
    await cardB.getByPlaceholder("Lý do thất bại").fill("Khách vắng nhà");
    await shot(d1.page, "driver1-fail-reason-filled");
    await cardB.getByRole("button", { name: "Thất bại" }).click();
    await until(() => orderStatus(B), (s) => s === "failed", "B failed");
    await d1.page.goto(`${BASE}/driver`);
    await d1.page.getByRole("img", { name: `Ảnh giao ${A}` }).waitFor();
    await shot(d1.page, "driver1-delivered-today");
    await mgr.page.goto(`${BASE}/admin/orders/${A}`);
    await mgr.page.getByTestId("delivery-photo").getByRole("img").waitFor();
    await shot(mgr.page, "admin-order-detail-delivery-photo");

    await d1.page.goto(`${BASE}/admin/orders`);
    await shot(d1.page, "driver1-forbidden-admin-orders-redirect");
    await d1.page.goto(`${BASE}/admin`);
    await shot(d1.page, "driver1-forbidden-admin-root");

    await mgr.page.goto(`${BASE}/admin/orders?date=${D}`);
    await shot(mgr.page, "admin-orders-failed-order");
    await mgr.page.locator(`[data-order-code="${B}"]`).getByRole("button", { name: "Giao lại" }).click();
    await until(() => orderStatus(B), (s) => s === "ready", "B back to ready");
    await mgr.page.reload();
    await shot(mgr.page, "admin-orders-failed-sent-back-ready");

    await mgr.page.goto(`${BASE}/admin/orders?date=${D}`);
    await mgr.page.locator(`[data-order-code="${A}"]`).getByRole("button", { name: "Đánh dấu đã trả" }).click();
    await until(async () => (await order(A)).payment_status, (s) => s === "paid", "A paid");
    await mgr.page.reload();
    await shot(mgr.page, "admin-orders-marked-paid");

    await mgr.page.goto(`${BASE}/admin/commission`);
    await shot(mgr.page, "admin-commission");
    await mgr.page.goto(`${BASE}/admin/settings`);
    await shot(mgr.page, "admin-settings");

    await s1.page.goto(`${BASE}/sale`);
    await shot(s1.page, "sale1-dashboard");

    await customer.page.goto(`${BASE}/orders?phone=0909111222`);
    await shot(customer.page, "customer-orders-lookup");
    await customer.page.goto(`${BASE}/`);
    await customer.page.getByTestId("last-order").waitFor();
    await shot(customer.page, "customer-shop-reorder-card");
    await customer.page.goto(`${BASE}/orders?phone=0909111222`);
    await customer.page.locator(`[data-order-code="${A}"]`).getByRole("button", { name: "Đặt lại" }).click();
    await customer.page.waitForURL("**/checkout?**");
    await shot(customer.page, "customer-reorder-checkout-prefilled");
  } finally {
    await browser.close();
  }
  console.log(`\nDone: ${n} shots in ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
