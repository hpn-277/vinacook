import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/page-title";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { JobBadge } from "@/components/status-badge";
import { unwrap } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatKg } from "@/lib/domain/money";
import { parseIsoDate } from "@/lib/domain/time";
import { closeDay } from "./actions";
import { AllocationForm } from "./AllocationForm";

export default async function ProductionDayPage({ params }: PageProps<"/admin/production/[date]">) {
  await requireRole("manager");
  const date = parseIsoDate((await params).date);
  if (!date) notFound();

  const [day, placedItems, factories, jobs] = await Promise.all([
    db().from("production_days").select("status, closed_at").eq("date", date).maybeSingle(),
    db().from("order_items").select("product_id, qty_kg, products(name), orders!inner(id, production_date, status)").eq("orders.production_date", date).eq("orders.status", "placed").then(unwrap),
    db().from("factories").select("id, name, capacity_kg_per_day").eq("active", true).order("id").then(unwrap),
    db().from("production_jobs").select("id, product_id, factory_id, qty_kg, status, products(name), factories(name)").eq("date", date).order("product_id").order("id").then(unwrap),
  ]);
  const closed = day.data?.status === "closed";

  const needs = new Map<number, { id: number; name: string; need: number }>();
  for (const i of placedItems) {
    const n = needs.get(i.product_id) ?? { id: i.product_id, name: i.products?.name ?? "?", need: 0 };
    n.need = Math.round((n.need + i.qty_kg) * 100) / 100;
    needs.set(i.product_id, n);
  }
  const placedOrders = new Set(placedItems.map((i) => i.orders.id)).size;

  return (
    <>
      <PageTitle>Sản xuất ngày {date}</PageTitle>
      <p className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span>
          Trạng thái: <b>{closed ? "Đã chốt" : "Đang mở"}</b>
        </span>
        <span className="text-muted-foreground">·</span>
        <Link href={`/admin/orders?date=${date}`} className="text-primary underline underline-offset-4">
          Xem đơn
        </Link>
      </p>

      {!closed && needs.size === 0 && <p className="text-muted-foreground">Chưa có đơn cho ngày này.</p>}
      {!closed && needs.size > 0 && (
        <Card size="sm">
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Chốt ngày sẽ đưa toàn bộ <b className="text-foreground">{placedOrders}</b> đơn chờ xử lý vào sản xuất. Hủy các đơn không làm trước khi chốt.
            </p>
            <AllocationForm
              date={date}
              needs={[...needs.values()]}
              factories={factories.map((f) => ({ id: f.id, name: f.name, capacity: f.capacity_kg_per_day }))}
              action={closeDay}
            />
          </CardContent>
        </Card>
      )}

      {jobs.length > 0 && (
        <>
          <h2 className="mt-6 mb-2 font-semibold">Lệnh sản xuất</h2>
          <Card size="sm">
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lệnh</TableHead>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead>Xưởng</TableHead>
                    <TableHead className="text-right">Kg</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((j) => (
                    <TableRow key={j.id} data-job-id={j.id}>
                      <TableCell className="font-medium">#{j.id}</TableCell>
                      <TableCell>{j.products?.name}</TableCell>
                      <TableCell>{j.factories?.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatKg(j.qty_kg)}</TableCell>
                      <TableCell>
                        <JobBadge status={j.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
