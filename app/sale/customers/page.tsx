import Link from "next/link";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { unwrap } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatVnd } from "@/lib/domain/money";

export default async function SaleCustomersPage() {
  const me = await requireRole("sale");
  const customers = unwrap(
    await db()
      .from("customers")
      .select("id, name, phone, default_address, default_district, orders(total, status)")
      .eq("sale_id", me.id)
      .order("created_at", { ascending: false }),
  );
  return (
    <>
      <PageTitle>Khách hàng của tôi ({customers.length})</PageTitle>
      <ul className="space-y-2">
        {customers.map((c) => {
          const live = c.orders.filter((o) => o.status !== "cancelled");
          return (
            <li key={c.id}>
              <Card size="sm">
                <CardContent className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <b>{c.name}</b> · <a href={`tel:${c.phone}`}>{c.phone}</a>
                    <div className="text-muted-foreground">
                      {c.default_address}, {c.default_district}
                    </div>
                    <div className="text-muted-foreground">
                      {live.length} đơn · {formatVnd(live.reduce((s, o) => s + o.total, 0))}
                    </div>
                  </div>
                  <Button asChild variant="outline">
                    <Link href={`/sale/orders/new?phone=${c.phone}`}>Tạo đơn</Link>
                  </Button>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </>
  );
}
