import { ActionForm } from "@/components/ActionForm";
import { StaffShell } from "@/components/StaffShell";
import { Button, Card, inputClass, PageTitle } from "@/components/ui";
import { unwrap } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatKg, formatVnd } from "@/lib/domain/money";
import { finishDelivery } from "./actions";

export default async function DriverPage() {
  const me = await requireRole("driver");
  const orders = unwrap(
    await db()
      .from("orders")
      .select("id, code, phone, address, district, note, total, payment_status, customers(name), order_items(product_id, qty_kg, products(name))")
      .eq("driver_id", me.id)
      .eq("status", "assigned")
      .order("district")
      .order("id"),
  );

  return (
    <StaffShell links={[{ href: "/driver", label: "Đơn cần giao" }]}>
      <PageTitle>Đơn cần giao ({orders.length})</PageTitle>
      {orders.length === 0 && <p>Không có đơn.</p>}
      <ul className="space-y-3">
        {orders.map((o) => {
          const fullAddress = `${o.address}, ${o.district}, TP. Hồ Chí Minh`;
          return (
            <li key={o.id}>
              <Card className="space-y-3" data-order-code={o.code}>
                <div>
                  <div className="flex justify-between">
                    <b>{o.code}</b>
                    <b>{o.payment_status === "paid" ? "Đã thanh toán" : `Thu ${formatVnd(o.total)}`}</b>
                  </div>
                  <div>{o.customers?.name}</div>
                  <div className="text-sm text-gray-700">{fullAddress}</div>
                  {o.note && <div className="text-sm text-gray-500">Ghi chú: {o.note}</div>}
                  <div className="text-sm text-gray-500">{o.order_items.map((i) => `${i.products?.name} ${formatKg(i.qty_kg)}`).join(", ")}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <a href={`tel:${o.phone}`} className="rounded-lg border border-gray-300 py-3 text-center font-medium">
                    Gọi {o.phone}
                  </a>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-gray-300 py-3 text-center font-medium"
                  >
                    Bản đồ
                  </a>
                </div>
                <ActionForm action={finishDelivery}>
                  <input type="hidden" name="order_id" value={o.id} />
                  <input type="hidden" name="to" value="delivered" />
                  <Button className="w-full py-3 text-base">Đã giao</Button>
                </ActionForm>
                <ActionForm action={finishDelivery} className="flex gap-2">
                  <input type="hidden" name="order_id" value={o.id} />
                  <input type="hidden" name="to" value="failed" />
                  <input name="reason" required placeholder="Lý do thất bại" className={inputClass} />
                  <Button tone="danger">Thất bại</Button>
                </ActionForm>
              </Card>
            </li>
          );
        })}
      </ul>
    </StaffShell>
  );
}
