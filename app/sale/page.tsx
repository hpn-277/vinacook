import { headers } from "next/headers";
import Link from "next/link";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderBadge, TierBadge } from "@/components/status-badge";
import { unwrap } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { itemLabel } from "@/lib/domain/catalog";
import { formatVnd } from "@/lib/domain/money";
import { dayRange, monthRange, today } from "@/lib/period";

export default async function SaleDashboard() {
  const me = await requireRole("sale");
  const date = today();
  const day = dayRange(date);
  const month = monthRange(date);
  const host = (await headers()).get("host");
  const refLink = `http://${host}/r/${me.ref_code}`;

  const [todayOrders, monthOrders, commission, recent] = await Promise.all([
    db().from("orders").select("total").eq("sale_id", me.id).neq("status", "cancelled").gte("created_at", day.from).lt("created_at", day.to),
    db().from("orders").select("total").eq("sale_id", me.id).neq("status", "cancelled").gte("created_at", month.from).lt("created_at", month.to),
    db().rpc("commission_report", { p_month: date }),
    db().from("orders").select("id, code, production_date, status, total, price_tier, customers(name, phone), order_items(id, pack_name, pack_qty, qty_kg, products(name))").eq("sale_id", me.id).order("created_at", { ascending: false }).order("id", { referencedTable: "order_items" }).limit(20),
  ]);
  const sum = (rows: { total: number }[]) => rows.reduce((s, r) => s + r.total, 0);
  const mine = unwrap(commission).find((r) => r.sale_id === me.id);

  return (
    <>
      <PageTitle>Xin chào {me.name}</PageTitle>
      <Card size="sm" className="mb-4">
        <CardContent>
          <div className="text-muted-foreground">Link giới thiệu (khách đặt qua link sẽ thuộc về bạn)</div>
          <div className="mt-1 font-mono break-all" data-testid="ref-link">
            {refLink}
          </div>
        </CardContent>
      </Card>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Doanh số hôm nay" value={formatVnd(sum(unwrap(todayOrders)))} />
        <Stat label="Doanh số tháng" value={formatVnd(sum(unwrap(monthOrders)))} />
        <Stat label="Đã giao trong tháng" value={formatVnd(mine?.delivered_total ?? 0)} />
        <Stat label={`Hoa hồng tạm tính (${me.commission_pct ?? 0}%)`} value={formatVnd(mine?.commission ?? 0)} testId="sale-commission" />
      </div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">Đơn gần đây</h2>
        <Button asChild>
          <Link href="/sale/orders/new">Tạo đơn</Link>
        </Button>
      </div>
      <ul className="space-y-2">
        {unwrap(recent).map((o) => (
          <li key={o.id}>
            <Card size="sm">
              <CardContent className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <b>{o.code}</b> · {o.customers?.name} · {o.customers?.phone}
                  <div className="text-muted-foreground">Ngày SX {o.production_date}</div>
                  <div className="text-muted-foreground">{o.order_items.map(itemLabel).join(", ")}</div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <OrderBadge status={o.status} />
                  <TierBadge tier={o.price_tier} />
                  <div className="font-medium">{formatVnd(o.total)}</div>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}

function Stat({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription className="text-xs">{label}</CardDescription>
        <CardTitle className="text-lg font-bold" data-testid={testId}>
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
