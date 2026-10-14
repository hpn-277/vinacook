import { ActionForm } from "@/components/ActionForm";
import { StaffShell } from "@/components/StaffShell";
import { PageTitle } from "@/components/page-title";
import { TierBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { unwrap } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { itemLabel } from "@/lib/domain/catalog";
import { formatVnd } from "@/lib/domain/money";
import { finishDelivery } from "./actions";

export default async function DriverPage() {
  const me = await requireRole("driver");
  const orders = unwrap(
    await db()
      .from("orders")
      .select("id, code, phone, address, district, note, total, payment_status, customers(name), price_tier, order_items(id, pack_name, pack_qty, qty_kg, products(name))")
      .eq("driver_id", me.id)
      .eq("status", "assigned")
      .order("district")
      .order("id")
      .order("id", { referencedTable: "order_items" }),
  );

  return (
    <StaffShell links={[{ href: "/driver", label: "Đơn cần giao" }]}>
      <PageTitle>Đơn cần giao ({orders.length})</PageTitle>
      {orders.length === 0 && <p className="text-muted-foreground">Không có đơn.</p>}
      <ul className="space-y-3">
        {orders.map((o) => {
          const fullAddress = `${o.address}, ${o.district}, TP. Hồ Chí Minh`;
          return (
            <li key={o.id}>
              <Card data-order-code={o.code}>
                <CardContent className="space-y-3">
                  <div className="space-y-0.5">
                    <div className="flex justify-between gap-2 text-base">
                      <span className="flex items-center gap-2">
                        <b>{o.code}</b>
                        <TierBadge tier={o.price_tier} />
                      </span>
                      <b className={o.payment_status === "paid" ? "text-green-700" : "text-primary"}>
                        {o.payment_status === "paid" ? "Đã thanh toán" : `Thu ${formatVnd(o.total)}`}
                      </b>
                    </div>
                    <div className="font-medium">{o.customers?.name}</div>
                    <div>{fullAddress}</div>
                    {o.note && <div className="text-muted-foreground">Ghi chú: {o.note}</div>}
                    <div className="text-muted-foreground">{o.order_items.map(itemLabel).join(", ")}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button asChild variant="outline" className="h-11">
                      <a href={`tel:${o.phone}`}>Gọi {o.phone}</a>
                    </Button>
                    <Button asChild variant="outline" className="h-11">
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`} target="_blank" rel="noreferrer">
                        Bản đồ
                      </a>
                    </Button>
                  </div>
                  <ActionForm action={finishDelivery}>
                    <input type="hidden" name="order_id" value={o.id} />
                    <input type="hidden" name="to" value="delivered" />
                    <Button className="h-11 w-full text-base">Đã giao</Button>
                  </ActionForm>
                  <ActionForm action={finishDelivery} className="flex gap-2">
                    <input type="hidden" name="order_id" value={o.id} />
                    <input type="hidden" name="to" value="failed" />
                    <Input name="reason" required placeholder="Lý do thất bại" className="h-11" />
                    <Button variant="destructive" className="h-11">
                      Thất bại
                    </Button>
                  </ActionForm>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </StaffShell>
  );
}
