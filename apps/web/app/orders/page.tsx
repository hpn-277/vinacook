import { TruckIcon } from "lucide-react";
import { PageTitle } from "@/components/page-title";
import { PublicShell } from "@/components/shop/PublicShell";
import { ReorderButton } from "@/components/shop/Reorder";
import { OrderBadge, TierBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { unwrap } from "@noodle/core/action";
import { db } from "@noodle/core/db";
import { formatVnd } from "@noodle/core/domain/money";
import { REORDER_FIELDS, toReorderSource } from "@noodle/core/reorder";

export default async function OrderLookupPage({ searchParams }: PageProps<"/orders">) {
  const raw = (await searchParams).phone;
  const phone = typeof raw === "string" ? raw.replace(/[\s.-]/g, "") : "";
  const orders = phone
    ? unwrap(
        await db()
          .from("orders")
          .select(`id, status, payment_status, total, price_tier, driver:staff!orders_driver_id_fkey(name, phone), ${REORDER_FIELDS}`)
          .eq("phone", phone)
          .order("created_at", { ascending: false })
          .order("id", { referencedTable: "order_items" })
          .limit(50),
      )
    : [];
  return (
    <PublicShell>
      <PageTitle>Tra cứu đơn hàng</PageTitle>
      <form className="mb-4 flex gap-2">
        <Input name="phone" type="tel" defaultValue={phone} placeholder="Số điện thoại" required className="h-10" />
        <Button type="submit" size="lg">
          Tra cứu
        </Button>
      </form>
      {phone && orders.length === 0 && <p className="text-muted-foreground">Không có đơn hàng cho số này.</p>}
      <ul className="space-y-3">
        {orders.map((o) => {
          const source = toReorderSource(o);
          return (
            <li key={o.id}>
              <Card size="sm" data-order-code={o.code}>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <b className="mr-auto">{o.code}</b>
                    <TierBadge tier={o.price_tier} />
                    <OrderBadge status={o.status} />
                  </div>
                  {o.status === "out_for_delivery" && (
                    <div data-testid="on-the-way" className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-blue-900">
                      <div className="flex items-center gap-2 font-semibold">
                        <TruckIcon className="size-4 shrink-0" /> Đơn hàng đang trên đường giao đến bạn
                      </div>
                      {o.driver && (
                        <div className="mt-0.5">
                          Tài xế: {o.driver.name}
                          {o.driver.phone && (
                            <>
                              {" · "}
                              <a href={`tel:${o.driver.phone}`} className="font-medium underline">
                                {o.driver.phone}
                              </a>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="text-muted-foreground">Ngày sản xuất {o.production_date}</div>
                  <ul>
                    {source.lines.map((l) => (
                      <li key={l.packId}>{l.label}</li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between gap-2 border-t pt-2">
                    <div>
                      <b>{formatVnd(o.total)}</b>
                      <div className={o.payment_status === "paid" ? "text-green-700" : "text-muted-foreground"}>
                        {o.payment_status === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}
                      </div>
                    </div>
                    <ReorderButton source={source} variant="outline" size="lg" />
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </PublicShell>
  );
}
