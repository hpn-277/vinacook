import { ActionForm } from "@/components/ActionForm";
import { ADMIN_ORDER_SELECT, AdminOrderCard, type AdminOrder } from "@/components/AdminOrderCard";
import { Button, Card, inputClass, PageTitle } from "@/components/ui";
import { unwrap } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { DISTRICTS, isDistrict } from "@/lib/domain/districts";
import { formatKg, formatVnd } from "@/lib/domain/money";
import { assignDriver } from "./actions";

export default async function DispatchPage({ searchParams }: PageProps<"/admin/dispatch">) {
  await requireRole("manager");
  const raw = (await searchParams).district;
  const district = typeof raw === "string" && isDistrict(raw) ? raw : null;

  let readyQuery = db().from("orders").select(ADMIN_ORDER_SELECT).eq("status", "ready").order("district").order("id");
  if (district) readyQuery = readyQuery.eq("district", district);
  const [ready, inFlight, drivers] = await Promise.all([
    readyQuery.then(unwrap) as Promise<AdminOrder[]>,
    db().from("orders").select(ADMIN_ORDER_SELECT).in("status", ["assigned", "failed"]).order("status").order("id").then(unwrap) as Promise<AdminOrder[]>,
    db().from("staff").select("id, name").eq("role", "driver").eq("active", true).order("name").then(unwrap),
  ]);

  return (
    <>
      <PageTitle>Điều phối giao hàng</PageTitle>
      <form className="mb-4 flex gap-2">
        <select name="district" defaultValue={district ?? ""} aria-label="Lọc quận" className={`${inputClass} w-auto`}>
          <option value="">Tất cả quận</option>
          {DISTRICTS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <Button tone="secondary">Lọc</Button>
      </form>

      <h2 className="mb-2 font-semibold">Sẵn sàng giao ({ready.length})</h2>
      {ready.length === 0 ? (
        <p className="mb-6 text-sm">Không có đơn sẵn sàng.</p>
      ) : (
        <Card className="mb-6">
          <ActionForm action={assignDriver} className="space-y-2">
            <ul className="divide-y divide-gray-200">
              {ready.map((o) => (
                <li key={o.id}>
                  <label className="flex items-start gap-3 py-2 text-sm">
                    <input type="checkbox" name="order_id" value={o.id} aria-label={`Chọn ${o.code}`} className="mt-1 h-5 w-5" />
                    <span className="flex-1">
                      <b>{o.code}</b> · {o.customers?.name} · {o.phone}
                      <br />
                      {o.address}, <b>{o.district}</b>
                      <br />
                      <span className="text-gray-500">
                        {o.order_items.map((i) => `${i.products?.name} ${formatKg(i.qty_kg)}`).join(", ")} · {formatVnd(o.total)}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <select name="driver_id" required aria-label="Tài xế" className={inputClass}>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <Button>Giao cho tài xế</Button>
            </div>
          </ActionForm>
        </Card>
      )}

      <h2 className="mb-2 font-semibold">Đang giao / thất bại</h2>
      <div className="space-y-3">
        {inFlight.length === 0 && <p className="text-sm">Không có.</p>}
        {inFlight.map((o) => (
          <AdminOrderCard key={o.id} order={o} />
        ))}
      </div>
    </>
  );
}
