import Link from "next/link";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { PageTitle } from "@/components/page-title";
import { SaleMonthReport } from "@/components/SaleMonthReport";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { formatKg, formatVnd } from "@noodle/core/domain/money";
import { monthParam, saleMonthDays } from "@noodle/core/queries/sale";

function shiftMonth(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

/** The sale's month at a glance: how many orders each production day had (click to open that day), then commission. */
export default async function SaleMonthPage({ searchParams }: PageProps<"/sale/month">) {
  const me = await requireRole("sale");
  const month = monthParam((await searchParams).month);
  const days = await saleMonthDays(me.id, month);
  const total = (k: "orders" | "cancelled" | "kg" | "revenue" | "unpaid") => days.reduce((s, d) => s + d[k], 0);

  return (
    <>
      <PageTitle>Tổng quan tháng {month}</PageTitle>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" asChild>
          <Link href={`/sale/month?month=${shiftMonth(month, -1)}`} aria-label="Tháng trước">
            ‹
          </Link>
        </Button>
        <AutoSubmitForm action="/sale/month">
          <Input type="month" name="month" defaultValue={month} aria-label="Chọn tháng" className="w-auto" />
        </AutoSubmitForm>
        <Button variant="outline" asChild>
          <Link href={`/sale/month?month=${shiftMonth(month, 1)}`} aria-label="Tháng sau">
            ›
          </Link>
        </Button>
      </div>

      <Card size="sm" className="mb-4">
        <CardHeader>
          <CardTitle>
            <h2>Đơn theo ngày</h2>
          </CardTitle>
          <p className="text-sm text-muted-foreground">Tính theo ngày sản xuất. Bấm vào một ngày để xem đơn của ngày đó.</p>
        </CardHeader>
        <CardContent>
          {days.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có đơn trong tháng này.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead className="text-right">Số đơn</TableHead>
                  <TableHead className="text-right">Kg</TableHead>
                  <TableHead className="text-right">Doanh số</TableHead>
                  <TableHead className="text-right">Chưa thu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {days.map((d) => (
                  <TableRow key={d.day} className="relative" data-month-day={d.day}>
                    <TableCell>
                      <Link href={`/sale?date=${d.day}`} className="font-medium text-primary after:absolute after:inset-0 hover:underline">
                        {d.day}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {d.orders}
                      {d.cancelled > 0 && <span className="text-muted-foreground"> (+{d.cancelled} hủy)</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatKg(d.kg)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatVnd(d.revenue)}</TableCell>
                    <TableCell className={`text-right tabular-nums ${d.unpaid ? "text-destructive" : "text-muted-foreground"}`}>{formatVnd(d.unpaid)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>Tổng</TableCell>
                  <TableCell className="text-right tabular-nums">{total("orders")}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatKg(Math.round(total("kg") * 100) / 100)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatVnd(total("revenue"))}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatVnd(total("unpaid"))}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>

      <h2 className="mb-3 text-lg font-bold">Hoa hồng tháng {month}</h2>
      <SaleMonthReport sale={me} month={month} orderLinks={false} />
    </>
  );
}
