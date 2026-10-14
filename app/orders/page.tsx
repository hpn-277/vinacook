import { PublicShell } from "@/components/PublicShell";
import { Button, Card, inputClass, OrderBadge, PageTitle } from "@/components/ui";
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
        <input name="phone" type="tel" defaultValue={phone} placeholder="Số điện thoại" required className={inputClass} />
        <Button type="submit">Tra cứu</Button>
      </form>
      {phone && orders.length === 0 && <p>Không có đơn hàng cho số này.</p>}
      <ul className="space-y-3">
        {orders.map((o) => (
          <li key={o.id}>
            <Card>
              <div className="flex items-center justify-between">
                <b>{o.code}</b>
                <OrderBadge status={o.status} />
              </div>
              <div className="text-sm text-gray-600">Ngày sản xuất {o.production_date}</div>
              <ul className="mt-2 text-sm">
                {o.order_items.map((i, idx) => (
                  <li key={idx}>
                    {i.products?.name} × {formatKg(i.qty_kg)}
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex justify-between text-sm">
                <span>{o.payment_status === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}</span>
                <b>{formatVnd(o.total)}</b>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </PublicShell>
  );
}
