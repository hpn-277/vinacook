import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { ADMIN_ORDER_SELECT, AdminOrderCard, type AdminOrder } from "@/components/AdminOrderCard";
import { Button, inputClass, PageTitle } from "@/components/ui";
import { unwrap } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatKg } from "@/lib/domain/money";
import { ORDER_STATUS_LABEL, ORDER_STATUSES, type OrderStatus } from "@/lib/domain/status";
import { parseIsoDate } from "@/lib/domain/time";
import { today } from "@/lib/period";
import { approveAllPlaced } from "./actions";

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireRole("manager");
  const sp = await searchParams;
  const date = parseIsoDate(typeof sp.date === "string" ? sp.date : null) ?? today();
  const status = ORDER_STATUSES.find((s) => s === sp.status);

  let query = db().from("orders").select(ADMIN_ORDER_SELECT).eq("production_date", date).order("id");
  if (status) query = query.eq("status", status);
  const [orders, day] = await Promise.all([
    query.then(unwrap) as Promise<AdminOrder[]>,
    db().from("production_days").select("status").eq("date", date).maybeSingle(),
  ]);
  const all = status ? unwrap(await db().from("orders").select("status").eq("production_date", date)) : orders;
  const counts = new Map<OrderStatus, number>();
  for (const o of all) counts.set(o.status, (counts.get(o.status) ?? 0) + 1);

  const kgByProduct = new Map<string, number>();
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    for (const i of o.order_items) kgByProduct.set(i.products?.name ?? "?", (kgByProduct.get(i.products?.name ?? "?") ?? 0) + i.qty_kg);
  }

  return (
    <>
      <PageTitle>Đơn hàng ngày {date}</PageTitle>
      <form className="mb-3 flex flex-wrap gap-2">
        <input type="date" name="date" defaultValue={date} className={`${inputClass} w-auto`} />
        <select name="status" defaultValue={status ?? ""} className={`${inputClass} w-auto`}>
          <option value="">Tất cả trạng thái</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <Button tone="secondary">Lọc</Button>
      </form>
      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        {ORDER_STATUSES.filter((s) => counts.get(s)).map((s) => (
          <Link key={s} href={`/admin/orders?date=${date}&status=${s}`} className="rounded bg-white px-2 py-1 shadow-sm">
            {ORDER_STATUS_LABEL[s]}: <b>{counts.get(s)}</b>
          </Link>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href={`/admin/production/${date}`} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
          {day.data?.status === "closed" ? "Xem lệnh sản xuất" : "Chốt sản xuất ngày này"}
        </Link>
        {(counts.get("placed") ?? 0) > 0 && (
          <ActionForm action={approveAllPlaced} confirm={`Duyệt tất cả ${counts.get("placed")} đơn mới?`}>
            <input type="hidden" name="date" value={date} />
            <Button>Duyệt tất cả đơn mới ({counts.get("placed")})</Button>
          </ActionForm>
        )}
      </div>
      {kgByProduct.size > 0 && (
        <p className="mb-3 text-sm text-gray-600">
          Tổng kg (không tính đơn hủy):{" "}
          {[...kgByProduct].map(([name, kg]) => `${name} ${formatKg(kg)}`).join(" · ")}
        </p>
      )}
      <div className="space-y-3">
        {orders.length === 0 && <p>Không có đơn.</p>}
        {orders.map((o) => (
          <AdminOrderCard key={o.id} order={o} />
        ))}
      </div>
    </>
  );
}
