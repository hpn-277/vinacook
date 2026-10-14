import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { ADMIN_ORDER_SELECT, AdminOrderCard, type AdminOrder } from "@/components/AdminOrderCard";
import { PageTitle } from "@/components/page-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
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
        <Input type="date" name="date" defaultValue={date} className="w-auto" />
        <NativeSelect name="status" defaultValue={status ?? ""}>
          <NativeSelectOption value="">Tất cả trạng thái</NativeSelectOption>
          {ORDER_STATUSES.map((s) => (
            <NativeSelectOption key={s} value={s}>
              {ORDER_STATUS_LABEL[s]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button variant="outline">Lọc</Button>
      </form>
      <div className="mb-3 flex flex-wrap gap-2">
        {ORDER_STATUSES.filter((s) => counts.get(s)).map((s) => (
          <Badge key={s} asChild variant="outline" className="h-7 bg-card px-2.5 text-sm font-normal">
            <Link href={`/admin/orders?date=${date}&status=${s}`}>
              {ORDER_STATUS_LABEL[s]}: <b>{counts.get(s)}</b>
            </Link>
          </Badge>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button asChild>
          <Link href={`/admin/production/${date}`}>{day.data?.status === "closed" ? "Xem lệnh sản xuất" : "Chốt sản xuất ngày này"}</Link>
        </Button>
        {(counts.get("placed") ?? 0) > 0 && (
          <ActionForm action={approveAllPlaced} confirm={`Duyệt tất cả ${counts.get("placed")} đơn mới?`}>
            <input type="hidden" name="date" value={date} />
            <Button variant="outline">Duyệt tất cả đơn mới ({counts.get("placed")})</Button>
          </ActionForm>
        )}
      </div>
      {kgByProduct.size > 0 && (
        <p className="mb-3 text-sm text-muted-foreground">
          Tổng kg (không tính đơn hủy):{" "}
          {[...kgByProduct].map(([name, kg]) => `${name} ${formatKg(kg)}`).join(" · ")}
        </p>
      )}
      <div className="space-y-3">
        {orders.length === 0 && <p className="text-muted-foreground">Không có đơn.</p>}
        {orders.map((o) => (
          <AdminOrderCard key={o.id} order={o} />
        ))}
      </div>
    </>
  );
}
