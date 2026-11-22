import Link from "next/link";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { formatVnd } from "@noodle/core/domain/money";
import { saleCustomers } from "@noodle/core/queries/sale";

export default async function SaleCustomersPage() {
  const me = await requireRole("sale");
  const customers = await saleCustomers(me.id);
  return (
    <>
      <PageTitle>Khách hàng của tôi ({customers.length})</PageTitle>
      <ul className="space-y-2">
        {customers.map((c) => (
            <li key={c.id}>
              <Card size="sm">
                <CardContent className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <b>{c.name}</b> · <a href={`tel:${c.phone}`}>{c.phone}</a>
                    {c.address && <div className="text-muted-foreground">{c.address}</div>}
                    <div className="text-muted-foreground">
                      {c.orders} đơn · {formatVnd(c.total)}
                    </div>
                  </div>
                  <Button asChild variant="outline">
                    <Link href={`/sale/orders/new?phone=${c.phone}`}>Tạo đơn</Link>
                  </Button>
                </CardContent>
              </Card>
            </li>
        ))}
      </ul>
    </>
  );
}
