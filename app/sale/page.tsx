import { headers } from "next/headers";
import Link from "next/link";
import { Card, PageTitle } from "@/components/ui";
import { OrderBadge } from "@/components/status-badge";
import { unwrap } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
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
    db().from("orders").select("id, code, production_date, status, total, customers(name, phone)").eq("sale_id", me.id).order("created_at", { ascending: false }).limit(20),
  ]);
  const sum = (rows: { total: number }[]) => rows.reduce((s, r) => s + r.total, 0);
  const mine = unwrap(commission).find((r) => r.sale_id === me.id);

  return (
    <>
      <PageTitle>Xin chào {me.name}</PageTitle>
      <Card className="mb-4">
        <div className="text-sm text-gray-600">Link giới thiệu (khách đặt qua link sẽ thuộc về bạn)</div>
        <div className="mt-1 break-all font-mono text-sm" data-testid="ref-link">
          {refLink}
        </div>
      </Card>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Doanh số hôm nay" value={formatVnd(sum(unwrap(todayOrders)))} />
        <Stat label="Doanh số tháng" value={formatVnd(sum(unwrap(monthOrders)))} />
        <Stat label="Đã giao trong tháng" value={formatVnd(mine?.delivered_total ?? 0)} />
        <Stat label={`Hoa hồng tạm tính (${me.commission_pct ?? 0}%)`} value={formatVnd(mine?.commission ?? 0)} testId="sale-commission" />
      </div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">Đơn gần đây</h2>
        <Link href="/sale/orders/new" className="rounded-lg bg-orange-600 px-3 py-2 text-sm font-medium text-white">
          Tạo đơn
        </Link>
      </div>
      <ul className="space-y-2">
        {unwrap(recent).map((o) => (
          <li key={o.id}>
            <Card className="flex items-center justify-between gap-2 text-sm">
              <div>
                <b>{o.code}</b> · {o.customers?.name} · {o.customers?.phone}
                <div className="text-gray-500">Ngày SX {o.production_date}</div>
              </div>
              <div className="text-right">
                <OrderBadge status={o.status} />
                <div>{formatVnd(o.total)}</div>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}

function Stat({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <Card>
      <div className="text-xs text-gray-600">{label}</div>
      <div className="text-lg font-bold" data-testid={testId}>
        {value}
      </div>
    </Card>
  );
}
