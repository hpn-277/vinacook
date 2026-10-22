import Link from "next/link";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { PageTitle } from "@/components/page-title";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { unwrap } from "@noodle/core/action";
import { requireRole } from "@/lib/auth";
import { db } from "@noodle/core/db";
import { formatKg, formatVnd } from "@noodle/core/domain/money";
import { localDate, parseIsoDate } from "@noodle/core/domain/time";
import { deliveredInMonth, orderKg } from "@/lib/driver-stats";
import { today } from "@/lib/period";

export default async function DriversPage({ searchParams }: PageProps<"/admin/drivers">) {
  await requireRole("manager");
  const raw = (await searchParams).month;
  const month = (typeof raw === "string" && parseIsoDate(`${raw}-01`)?.slice(0, 7)) || today().slice(0, 7);
  const [drivers, delivered, active] = await Promise.all([
    db().from("staff").select("id, name, phone").eq("role", "driver").order("name").then(unwrap),
    deliveredInMonth(month),
    db().from("orders").select("driver_id, status").in("status", ["assigned", "out_for_delivery", "failed"]).then(unwrap),
  ]);

  const rows = drivers.map((d) => {
    const mine = delivered.filter((o) => o.driver_id === d.id);
    return {
      ...d,
      orders: mine.length,
      kg: mine.reduce((s, o) => s + orderKg(o), 0),
      value: mine.reduce((s, o) => s + o.total, 0),
      days: new Set(mine.map((o) => localDate(new Date(o.delivered_at!)))).size,
      photos: mine.filter((o) => o.delivery_photo_path).length,
      now: active.filter((o) => o.driver_id === d.id),
    };
  });
  const sum = (k: "orders" | "kg" | "value") => rows.reduce((s, r) => s + r[k], 0);

  return (
    <>
      <PageTitle>Tài xế tháng {month}</PageTitle>
      <AutoSubmitForm action="/admin/drivers" className="mb-4">
        <Input type="month" name="month" defaultValue={month} aria-label="Chọn tháng" className="w-auto" />
      </AutoSubmitForm>
      <Card size="sm">
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tài xế</TableHead>
                <TableHead className="text-right">Đơn đã giao</TableHead>
                <TableHead className="text-right">Ngày đi giao</TableHead>
                <TableHead className="text-right">Kg đã giao</TableHead>
                <TableHead className="text-right">Giá trị hàng</TableHead>
                <TableHead className="text-right">Có ảnh</TableHead>
                <TableHead>Hiện tại</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="relative cursor-pointer" data-driver-id={r.id}>
                  <TableCell>
                    <Link href={`/admin/drivers/${r.id}?month=${month}`} className="font-medium text-primary after:absolute after:inset-0 hover:underline">
                      {r.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{r.phone}</div>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums" data-testid={`driver-orders-${r.id}`}>
                    {r.orders}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.days}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatKg(r.kg)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatVnd(r.value)}</TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {r.photos}/{r.orders}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.now.length === 0
                      ? "—"
                      : [
                          ["assigned", "chờ lên xe"],
                          ["out_for_delivery", "đang giao"],
                          ["failed", "thất bại"],
                        ]
                          .map(([s, label]) => [r.now.filter((o) => o.status === s).length, label] as const)
                          .filter(([n]) => n > 0)
                          .map(([n, label]) => `${n} ${label}`)
                          .join(", ")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell>Tổng</TableCell>
                <TableCell className="text-right tabular-nums">{sum("orders")}</TableCell>
                <TableCell />
                <TableCell className="text-right tabular-nums">{formatKg(sum("kg"))}</TableCell>
                <TableCell className="text-right tabular-nums">{formatVnd(sum("value"))}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          </Table>
          <p className="mt-2 text-xs text-muted-foreground">Tính theo thời điểm giao thành công trong tháng. Cột “Hiện tại” là đơn đang được giao cho tài xế, mọi ngày.</p>
        </CardContent>
      </Card>
    </>
  );
}
