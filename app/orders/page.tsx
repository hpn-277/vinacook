import { PageTitle } from "@/components/page-title";
import { PublicShell } from "@/components/PublicShell";
import { OrderBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { unwrap } from "@/lib/action";
import { db } from "@/lib/db";
import { formatKg, formatVnd } from "@/lib/domain/money";

export default async function OrderLookupPage({ searchParams }: PageProps<"/orders">) {
  const raw = (await searchParams).phone;
  const phone = typeof raw === "string" ? raw.replace(/[\s.-]/g, "") : "";
  const orders = phone
    ? unwrap(
        await db()
          .from("orders")
          .select("id, code, production_date, status, payment_status, total, address, order_items(qty_kg, products(name))")
          .eq("phone", phone)
          .order("created_at", { ascending: false })
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
        {orders.map((o) => (
          <li key={o.id}>
            <Card size="sm">
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <b>{o.code}</b>
                  <OrderBadge status={o.status} />
                </div>
                <div className="text-muted-foreground">Ngày sản xuất {o.production_date}</div>
                <ul>
                  {o.order_items.map((i, idx) => (
                    <li key={idx}>
                      {i.products?.name} × {formatKg(i.qty_kg)}
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between border-t pt-2">
                  <span className={o.payment_status === "paid" ? "text-green-700" : "text-muted-foreground"}>
                    {o.payment_status === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}
                  </span>
                  <b>{formatVnd(o.total)}</b>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </PublicShell>
  );
}
