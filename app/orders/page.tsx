import { PageTitle } from "@/components/page-title";
import { PublicShell } from "@/components/PublicShell";
import { ReorderButton } from "@/components/Reorder";
import { OrderBadge, TierBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { unwrap } from "@/lib/action";
import { db } from "@/lib/db";
import { formatVnd } from "@/lib/domain/money";
import { REORDER_FIELDS, toReorderSource } from "@/lib/reorder";

export default async function OrderLookupPage({ searchParams }: PageProps<"/orders">) {
  const raw = (await searchParams).phone;
  const phone = typeof raw === "string" ? raw.replace(/[\s.-]/g, "") : "";
  const orders = phone
    ? unwrap(
        await db()
          .from("orders")
          .select(`id, status, payment_status, total, price_tier, ${REORDER_FIELDS}`)
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
