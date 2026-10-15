import { ActionForm } from "@/components/ActionForm";
import { ADMIN_ORDER_SELECT, AdminOrderCard, type AdminOrder } from "@/components/AdminOrderCard";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { unwrap } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { DISTRICTS, isDistrict } from "@/lib/domain/districts";
import { itemLabel } from "@/lib/domain/catalog";
import { formatVnd } from "@/lib/domain/money";
import { TIER_LABEL } from "@/lib/domain/pricing";
import { assignDriver } from "./actions";

export default async function DispatchPage({ searchParams }: PageProps<"/admin/dispatch">) {
  await requireRole("manager");
  const raw = (await searchParams).district;
  const district = typeof raw === "string" && isDistrict(raw) ? raw : null;

  let readyQuery = db().from("orders").select(ADMIN_ORDER_SELECT).eq("status", "ready").order("district").order("id").order("id", { referencedTable: "order_items" });
  if (district) readyQuery = readyQuery.eq("district", district);
  const [ready, inFlight, drivers] = await Promise.all([
    readyQuery.then(unwrap) as Promise<AdminOrder[]>,
    db().from("orders").select(ADMIN_ORDER_SELECT).in("status", ["assigned", "failed"]).order("status").order("id").order("id", { referencedTable: "order_items" }).then(unwrap) as Promise<AdminOrder[]>,
    db().from("staff").select("id, name").eq("role", "driver").eq("active", true).order("name").then(unwrap),
  ]);

  return (
    <>
      <PageTitle>Điều phối giao hàng</PageTitle>
      <form className="mb-4 flex gap-2">
        <NativeSelect name="district" defaultValue={district ?? ""} aria-label="Lọc quận">
          <NativeSelectOption value="">Tất cả quận</NativeSelectOption>
          {DISTRICTS.map((d) => (
            <NativeSelectOption key={d}>{d}</NativeSelectOption>
          ))}
        </NativeSelect>
        <Button variant="outline">Lọc</Button>
      </form>

      <h2 className="mb-2 font-semibold">Chờ giao ({ready.length})</h2>
      {ready.length === 0 ? (
        <p className="mb-6 text-sm text-muted-foreground">Không có đơn chờ giao.</p>
      ) : (
        <Card size="sm" className="mb-6">
          <CardContent>
            <ActionForm action={assignDriver} className="space-y-3">
              <ul className="divide-y">
                {ready.map((o) => (
                  <li key={o.id}>
                    <label className="flex cursor-pointer items-start gap-3 py-2.5">
                      <Checkbox name="order_id" value={String(o.id)} aria-label={`Chọn ${o.code}`} className="mt-0.5 size-5" />
                      <span className="flex-1">
                        <b>{o.code}</b> · {o.customers?.name} · {o.phone}
                        <br />
                        {o.address}, <b>{o.district}</b>
                        <br />
                        <span className="text-muted-foreground">
                          {o.order_items.map(itemLabel).join(", ")} · {formatVnd(o.total)} ({TIER_LABEL[o.price_tier]})
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <NativeSelect name="driver_id" required aria-label="Tài xế" className="flex-1">
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

      <h2 className="mb-2 font-semibold">Đang giao / thất bại</h2>
      <div className="space-y-3">
        {inFlight.length === 0 && <p className="text-sm text-muted-foreground">Không có.</p>}
        {inFlight.map((o) => (
          <AdminOrderCard key={o.id} order={o} />
        ))}
      </div>
    </>
  );
}
