import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { ADMIN_ORDER_SELECT, type AdminOrder } from "@/components/AdminOrderCard";
import { AdminOrderTable } from "@/components/AdminOrderTable";
import { Card, CardContent } from "@/components/ui/card";
import { PageTitle } from "@/components/page-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { unwrap } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatKg } from "@/lib/domain/money";
import { ORDER_STATUS_LABEL, ORDER_STATUSES, type OrderStatus } from "@/lib/domain/status";
import { parseIsoDate } from "@/lib/domain/time";
import { today } from "@/lib/period";
import { receiveDay } from "./actions";

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireRole("manager");
  const sp = await searchParams;
  const date = parseIsoDate(typeof sp.date === "string" ? sp.date : null) ?? today();

  const [orders, day] = await Promise.all([
    db().from("orders").select(ADMIN_ORDER_SELECT).eq("production_date", date).order("created_at", { ascending: false }).order("id", { ascending: false }).order("id", { referencedTable: "order_items" }).then(unwrap) as Promise<AdminOrder[]>,
    db().from("production_days").select("status").eq("date", date).maybeSingle(),
  ]);
  const counts = new Map<OrderStatus, number>();
  for (const o of orders) counts.set(o.status, (counts.get(o.status) ?? 0) + 1);

  const kgByProduct = new Map<string, number>();
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    for (const i of o.order_items) kgByProduct.set(i.products?.name ?? "?", (kgByProduct.get(i.products?.name ?? "?") ?? 0) + i.qty_kg);
  }

  return (
    <>
      <PageTitle>Đơn hàng ngày {date}</PageTitle>
      <Link href={`/admin?month=${date.slice(0, 7)}`} className="mb-3 inline-block text-sm text-muted-foreground hover:text-foreground">
        ‹ Tổng quan tháng {date.slice(0, 7)}
      </Link>
      <div className="mb-3 flex flex-wrap gap-2">
        {ORDER_STATUSES.filter((s) => counts.get(s)).map((s) => (
          <Badge key={s} variant="outline" className="h-7 bg-card px-2.5 text-sm font-normal">
            {ORDER_STATUS_LABEL[s]}: <b>{counts.get(s)}</b>
          </Badge>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button asChild>
          <Link href={`/admin/production/${date}`}>{day.data?.status === "closed" ? "Xem lệnh sản xuất" : "Chốt sản xuất ngày này"}</Link>
        </Button>
        {(counts.get("in_production") ?? 0) > 0 && (
          <ActionForm action={receiveDay} confirm={`Xác nhận đã nhận đủ hàng ngày ${date}?`}>
            <input type="hidden" name="date" value={date} />
            <Button>Xác nhận đã nhận hàng</Button>
          </ActionForm>
        )}
      </div>
      {kgByProduct.size > 0 && (
        <p className="mb-3 text-sm text-muted-foreground">
          Tổng kg (không tính đơn hủy):{" "}
          {[...kgByProduct].map(([name, kg]) => `${name} ${formatKg(kg)}`).join(" · ")}
        </p>
      )}
      {orders.length === 0 ? (
        <p className="text-muted-foreground">Không có đơn.</p>
      ) : (
        <Card size="sm">
          <CardContent>
            <AdminOrderTable orders={orders} />
          </CardContent>
        </Card>
      )}
    </>
  );
}
