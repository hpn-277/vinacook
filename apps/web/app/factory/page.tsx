import { PageTitle } from "@/components/page-title";
import { JobBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { unwrap } from "@noodle/core/action";
import { requireRole } from "@/lib/auth";
import { db } from "@noodle/core/db";
import { formatKg } from "@noodle/core/domain/money";
import { addDays } from "@noodle/core/domain/time";
import { today } from "@/lib/period";

type Row = { key: string; product: string; kg: number; status?: "producing" | "received" };

function DayTable({ rows, draft }: { rows: Row[]; draft: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Sản phẩm</TableHead>
          <TableHead className="text-right">Kg</TableHead>
          <TableHead>Trạng thái</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.key} data-job-id={draft ? undefined : r.key}>
            <TableCell className="font-medium">{r.product}</TableCell>
            <TableCell className="text-right tabular-nums">{formatKg(r.kg)}</TableCell>
            <TableCell>{r.status ? <JobBadge status={r.status} /> : <Badge variant="outline">Dự kiến</Badge>}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>Tổng</TableCell>
          <TableCell className="text-right tabular-nums">{formatKg(rows.reduce((s, r) => s + r.kg, 0))}</TableCell>
          <TableCell />
        </TableRow>
      </TableFooter>
    </Table>
  );
}

export default async function FactoryPage() {
  const me = await requireRole("factory");
  const date = today();
  const days = [
    { date, label: "Hôm nay" },
    { date: addDays(date, 1), label: "Ngày mai" },
  ];
  const dates = days.map((d) => d.date);
  const [jobs, closedDays, draftItems] = await Promise.all([
    db().from("production_jobs").select("id, date, qty_kg, status, products(name)").eq("factory_id", me.factory_id!).in("date", dates).order("product_id").order("id").then(unwrap),
    db().from("production_days").select("date").eq("status", "closed").in("date", dates).then(unwrap),
    db().from("order_items").select("qty_kg, product_id, products(name), orders!inner(production_date, status)").in("orders.production_date", dates).eq("orders.status", "placed").then(unwrap),
  ]);
  const closed = new Set(closedDays.map((d) => d.date));

  function draftRows(day: string): Row[] {
    const byProduct = new Map<number, Row>();
    for (const i of draftItems.filter((i) => i.orders.production_date === day)) {
      const row = byProduct.get(i.product_id) ?? { key: String(i.product_id), product: i.products?.name ?? "?", kg: 0 };
      row.kg += i.qty_kg;
      byProduct.set(i.product_id, row);
    }
    return [...byProduct.values()].sort((a, b) => a.product.localeCompare(b.product, "vi"));
  }

  return (
    <>
      <PageTitle>Lệnh sản xuất</PageTitle>
      <p className="mb-4 text-sm text-muted-foreground">
        Trước khi quản lý chốt, xưởng thấy số kg dự kiến của cả ngày để chuẩn bị. Sau khi chốt, đây là lệnh chính thức của xưởng.
      </p>
      <div className="space-y-4">
        {days.map((d) => {
          const isClosed = closed.has(d.date);
          const rows: Row[] = isClosed
            ? jobs.filter((j) => j.date === d.date).map((j) => ({ key: String(j.id), product: j.products?.name ?? "?", kg: j.qty_kg, status: j.status }))
            : draftRows(d.date);
          return (
            <Card key={d.date} size="sm" data-factory-day={d.date}>
              <CardHeader>
                <CardTitle>
                  <h2 className="flex flex-wrap items-center gap-2">
                    {d.label} <span className="font-normal text-muted-foreground">· {d.date}</span>
                    {isClosed ? <Badge variant="secondary">Đã chốt</Badge> : <Badge variant="outline">Dự kiến (chưa chốt)</Badge>}
                  </h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{isClosed ? "Xưởng không có lệnh ngày này." : "Chưa có đơn."}</p>
                ) : (
                  <>
                    <DayTable rows={rows} draft={!isClosed} />
                    {!isClosed && (
                      <p className="mt-2 text-xs text-muted-foreground">Tổng nhu cầu của cả ngày, chưa chia cho từng xưởng. Số kg có thể thay đổi đến khi chốt.</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
