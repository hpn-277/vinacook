import { api } from "@/lib/api";
import type { District } from "@noodle/core/domain/districts";
import type { OrderStatus } from "@noodle/core/domain/status";
import type { StaffRole } from "@noodle/core/staff";

const text = (fd: FormData, name: string) => String(fd.get(name) ?? "");
const num = (fd: FormData, name: string) => Number(fd.get(name));
const optNum = (fd: FormData, name: string) => (fd.get(name) == null || fd.get(name) === "" ? null : Number(fd.get(name)));
const ids = (fd: FormData, name: string) => fd.getAll(name).map(Number);
const checked = (fd: FormData, name: string) => fd.get(name) === "on";
const param = (fd: FormData, name = "order_id") => ({ id: text(fd, name) });
const day = (fd: FormData) => ({ date: text(fd, "date") });
const multipart = (url: URL, method: "POST" | "PATCH", fd: FormData) => fetch(url, { method, body: fd });

const staffFields = (fd: FormData) => ({
  role: text(fd, "role") as StaffRole,
  name: text(fd, "name"),
  phone: text(fd, "phone") || null,
  commission_pct: optNum(fd, "commission_pct"),
  factory_id: optNum(fd, "factory_id"),
});

const contact = (fd: FormData) => ({
  name: text(fd, "name"),
  phone: text(fd, "phone"),
  address: text(fd, "address"),
  district: text(fd, "district") as District,
  note: text(fd, "note"),
});

/**
 * Every web form's write, keyed by name so server components can pass one to <ActionForm>.
 * Each maps the form's fields onto its API call; the API owns validation and the messages.
 */
export const mutations = {
  login: (fd: FormData) => api.auth.login.$post({ json: { email: text(fd, "email"), password: text(fd, "password") } }),
  logout: () => api.auth.logout.$post(),
  requestReset: (fd: FormData) => api.auth["forgot-password"].$post({ json: { email: text(fd, "email") } }),
  setPassword: (fd: FormData) => api.auth["set-password"].$post({ json: { password: text(fd, "password"), confirm: text(fd, "confirm") } }),

  placeCustomerOrder: (fd: FormData) => api.shop.orders.$post({ json: { ...contact(fd), items: JSON.parse(text(fd, "items") || "[]") } }),
  /** Quantities come as `qty_<packId>` inputs; blanks and zeros are not ordered. */
  placeStaffOrder: (fd: FormData) =>
    api.shop["staff-orders"].$post({
      json: {
        ...contact(fd),
        items: [...fd.entries()]
          .filter(([k, v]) => k.startsWith("qty_") && typeof v === "string" && v.trim() !== "" && Number(v) !== 0)
          .map(([k, v]) => ({ pack_id: Number(k.slice(4)), pack_qty: Number(v) })),
      },
    }),

  moveOrder: (fd: FormData) => api.orders[":id"].move.$post({ param: param(fd), json: { to: text(fd, "to") as OrderStatus } }),
  editContact: (fd: FormData) =>
    api.orders[":id"].contact.$patch({ param: param(fd), json: { phone: text(fd, "phone"), address: text(fd, "address"), district: text(fd, "district") as District } }),
  assignDriver: (fd: FormData) => api.orders.assign.$post({ json: { driver_id: num(fd, "driver_id"), order_ids: ids(fd, "order_id") } }),

  closeDay: (fd: FormData) => api.days[":date"].close.$post({ param: day(fd) }),
  receiveDay: (fd: FormData) => api.days[":date"].receive.$post({ param: day(fd) }),
  unassignDay: (fd: FormData) => api.days[":date"].unassign.$post({ param: day(fd) }),
  reopenDay: (fd: FormData) => api.days[":date"].reopen.$post({ param: day(fd) }),

  saveProduct: (fd: FormData) =>
    fd.get("id") ? multipart(api.products[":id"].$url({ param: param(fd, "id") }), "PATCH", fd) : multipart(api.products.$url(), "POST", fd),
  savePacks: (fd: FormData) => multipart(api.products[":id"].packs.$url({ param: param(fd, "product_id") }), "POST", fd),
  approveProduct: (fd: FormData) => api.products[":id"].approve.$post({ param: param(fd, "id") }),
  rejectProduct: (fd: FormData) => api.products[":id"].reject.$post({ param: param(fd, "id"), json: { reason: text(fd, "reason") } }),
  savePricing: (fd: FormData) =>
    api.settings.pricing.$put({
      json: { retail_markup_pct: num(fd, "retail_markup_pct"), wholesale_min_kg: num(fd, "wholesale_min_kg"), wholesale_min_total: num(fd, "wholesale_min_total") },
    }),

  saveFactory: (fd: FormData) => {
    const json = { name: text(fd, "name"), address: text(fd, "address"), phone: text(fd, "phone"), active: checked(fd, "active") };
    return fd.get("id") ? api.factories[":id"].$patch({ param: param(fd, "id"), json }) : api.factories.$post({ json });
  },

  createStaff: (fd: FormData) => api.staff.$post({ json: { email: text(fd, "email"), ...staffFields(fd) } }),
  updateStaff: (fd: FormData) => api.staff[":id"].$patch({ param: param(fd, "id"), json: { active: checked(fd, "active"), ...staffFields(fd) } }),
  sendPasswordLink: (fd: FormData) => api.staff[":id"]["password-link"].$post({ param: param(fd, "id") }),

  departOrders: (fd: FormData) => api.driver.orders.depart.$post({ json: { order_ids: ids(fd, "order_id") } }),
  completeDelivery: (fd: FormData) => multipart(api.driver.orders[":id"].complete.$url({ param: param(fd) }), "POST", fd),
  failDelivery: (fd: FormData) => api.driver.orders[":id"].fail.$post({ param: param(fd), json: { reason: text(fd, "reason") } }),
  returnOrder: (fd: FormData) => api.driver.orders[":id"].return.$post({ param: param(fd), json: { reason: text(fd, "reason") } }),

  submitProduct: (fd: FormData) =>
    fd.get("id") ? multipart(api.factory.products[":id"].$url({ param: param(fd, "id") }), "PATCH", fd) : multipart(api.factory.products.$url(), "POST", fd),

  setPayment: (fd: FormData) =>
    api.payments.$post({ json: { order_ids: ids(fd, "order_id"), paid: text(fd, "paid") === "paid", note: text(fd, "note") || undefined } }),
} satisfies Record<string, (fd: FormData) => Promise<Response>>;

export type Mutation = keyof typeof mutations;

export type MutationResult = { ok: true; message?: string; redirect?: string } | { ok: false; error: string } | null;

export async function submit(mutation: Mutation, fd: FormData): Promise<NonNullable<MutationResult>> {
  try {
    const res = await mutations[mutation](fd);
    const body = (await res.json().catch(() => ({}))) as { message?: string; redirect?: string; error?: string };
    if (!res.ok) return { ok: false, error: body.error ?? "Có lỗi xảy ra, vui lòng thử lại" };
    return { ok: true, message: body.message, redirect: body.redirect };
  } catch {
    return { ok: false, error: "Không kết nối được máy chủ, vui lòng thử lại" };
  }
}
