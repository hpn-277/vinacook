import Link from "next/link";
import { Card, PageTitle } from "@/components/ui";
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
              <Card className="flex items-center justify-between gap-2 text-sm">
                <div>
                  <b>{c.name}</b> · <a href={`tel:${c.phone}`}>{c.phone}</a>
                  <div className="text-gray-500">
                    {c.default_address}, {c.default_district}
                  </div>
                  <div className="text-gray-500">
                    {live.length} đơn · {formatVnd(live.reduce((s, o) => s + o.total, 0))}
                  </div>
                </div>
                <Link href={`/sale/orders/new?phone=${c.phone}`} className="rounded-lg border px-3 py-2 font-medium">
                  Tạo đơn
                </Link>
              </Card>
            </li>
          );
        })}
      </ul>
    </>
  );
}
