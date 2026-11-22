import Link from "next/link";
import { deliveryArea } from "@noodle/core/domain/destination";
import { ActionForm } from "@/components/ActionForm";
import { ADMIN_ORDER_SELECT, type AdminOrder } from "@/components/AdminOrderCard";
import { AdminOrderTable } from "./AdminOrderTable";
import { Card, CardContent } from "@/components/ui/card";
import { PageTitle } from "@/components/page-title";
import { DispatchSelect } from "./DispatchSelect";
import { DriverFilter } from "./DriverFilter";
import { Badge } from "@/components/ui/badge";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { unwrap } from "@noodle/core/action";
import { requireRole } from "@/lib/auth";
import { db } from "@noodle/core/db";
import { ORDER_STATUS_LABEL, ORDER_STATUSES, type OrderStatus } from "@noodle/core/domain/status";
import { parseIsoDate } from "@noodle/core/domain/time";
import { today } from "@noodle/core/period";

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const me = await requireRole("admin", "manager");
  const admin = me.role === "admin";
  const sp = await searchParams;
  const date = parseIsoDate(typeof sp.date === "string" ? sp.date : null) ?? today();

  const [orders, day, drivers] = await Promise.all([
    db().from("orders").select(ADMIN_ORDER_SELECT).eq("production_date", date).order("created_at", { ascending: false }).order("id", { ascending: false }).order("id", { referencedTable: "order_items" }).then(unwrap) as Promise<AdminOrder[]>,
    db().from("production_days").select("status").eq("date", date).maybeSingle(),
    db().from("staff").select("id, name").eq("role", "driver").eq("active", true).order("name").then(unwrap),
  ]);
  const ready = orders.filter((o) => o.status === "ready");
  const readyCount = ready.length;
  const readyDistricts = [...Map.groupBy(ready, deliveryArea)].map(([name, os]) => ({ name, count: os.length })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "vi"));
  const counts = new Map<OrderStatus, number>();
  for (const o of orders) counts.set(o.status, (counts.get(o.status) ?? 0) + 1);
  const dispatched = orders.filter((o) => ["assigned", "out_for_delivery", "delivered", "failed"].includes(o.status)).length;
  const reopenable = (counts.get("in_production") ?? 0) + readyCount;
  const waitingToLoad = counts.get("assigned") ?? 0;

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
      {admin && (
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button asChild>
          <Link href={`/admin/production/${date}`}>{day.data?.status !== "closed" ? "Gửi đơn cho xưởng" : (counts.get("in_production") ?? 0) > 0 ? "Nhận hàng từ xưởng" : "Xem hàng đã đặt xưởng"}</Link>
        </Button>
        {day.data?.status === "closed" &&
          (dispatched === 0 ? (
            <ActionForm
              action="reopenDay"
              confirm={`Rút lại đơn đã gửi xưởng ngày ${date}? ${reopenable} đơn sẽ quay về "Chờ xử lý".`}
            >
              <input type="hidden" name="date" value={date} />
              <Button variant="outline">Rút lại đơn xưởng</Button>
            </ActionForm>
          ) : (
            <Button variant="outline" disabled title="Hủy phân công các đơn đã giao cho tài xế trước khi rút lại đơn xưởng">
              Rút lại đơn xưởng
            </Button>
          ))}
      </div>
      )}
      {admin && readyCount > 0 && (
        <Card size="sm" className="mb-3 border-primary/30 bg-primary/5" data-testid="dispatch-bar">
          <CardContent>
            <ActionForm id="dispatch-form" action="assignDriver" className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium">Giao hàng · {readyCount} đơn đã nhận hàng</span>
              <DispatchSelect key={ready.map((o) => o.id).join(",")} form="dispatch-form" districts={readyDistricts} />
              <span className="text-xs text-muted-foreground">hoặc tick từng đơn, rồi chọn tài xế</span>
              <div className="ml-auto flex gap-2">
                <NativeSelect name="driver_id" required aria-label="Tài xế">
                  {drivers.map((d) => (
                    <NativeSelectOption key={d.id} value={d.id}>
                      {d.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <Button>Giao cho tài xế</Button>
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      )}
      {orders.some((o) => o.driver) && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Lọc:</span>
          <DriverFilter
            drivers={[...Map.groupBy(orders.filter((o) => o.driver), (o) => o.driver!.id)].map(([id, os]) => ({ id, name: os[0].driver!.name, count: os.length })).sort((a, b) => a.name.localeCompare(b.name, "vi"))}
            unassigned={orders.filter((o) => !o.driver).length}
          />
          {admin && waitingToLoad > 0 && (
            <ActionForm action="unassignDay" confirm={`Hủy phân công ${waitingToLoad} đơn đang chờ lên xe? Các đơn quay về "Đã nhận hàng".`} className="ml-auto">
              <input type="hidden" name="date" value={date} />
              <Button variant="outline" size="sm">
                Hủy phân công tất cả ({waitingToLoad})
              </Button>
            </ActionForm>
          )}
        </div>
      )}
      {orders.length === 0 ? (
        <p className="text-muted-foreground">Không có đơn.</p>
      ) : (
        <Card size="sm">
          <CardContent>
            <AdminOrderTable orders={orders} readOnly={!admin} />
          </CardContent>
        </Card>
      )}
    </>
  );
}
