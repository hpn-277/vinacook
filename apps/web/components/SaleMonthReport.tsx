import Link from "next/link";
import { Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatVnd } from "@noodle/core/domain/money";
import { saleMonthReport } from "@noodle/core/queries/sale";

const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Renders saleMonthReport on the sale's /sale page. */
export async function SaleMonthReport({ sale, month, orderLinks }: { sale: { id: number; commission_pct: number | null }; month: string; orderLinks: boolean }) {
  const r = await saleMonthReport(sale, month);
  const tiles = [
    { label: "Đơn đã giao", value: String(r.orders), note: `Trong tháng ${month}` },
    { label: "Doanh số đã giao", value: formatVnd(r.sales), note: `${r.days.length} ngày có đơn giao` },
    { label: `Hoa hồng (${r.pct}%)`, value: formatVnd(r.commission), note: "Tính trên đơn đã giao", testId: "sale-commission" },
    { label: "Khách hàng", value: String(r.customers.length), note: `${r.newCustomers} khách có đơn đầu tiên trong tháng` },
  ];

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} size="sm">
            <CardContent className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">{t.label}</span>
              <span className="text-xl font-bold tabular-nums sm:text-2xl" data-testid={t.testId}>
                {t.value}
              </span>
              <span className="text-xs text-muted-foreground">{t.note}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle>
            <h2>Đơn đã giao theo ngày</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {r.days.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có đơn giao trong tháng.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày giao / Mã đơn</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead className="text-right">Doanh số</TableHead>
                  <TableHead className="text-right">Hoa hồng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.days.map((day) => (
                  <Fragment key={day.date}>
                    <TableRow className="bg-muted/50 font-medium hover:bg-muted/50" data-commission-day={day.date}>
                      <TableCell className="tabular-nums">
                        {dm(day.date)} <span className="font-normal text-muted-foreground">· {day.orders.length} đơn</span>
                      </TableCell>
                      <TableCell />
                      <TableCell className="text-right tabular-nums">{formatVnd(day.sales)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatVnd(day.commission)}</TableCell>
                    </TableRow>
                    {day.orders.map((o) => (
                      <TableRow key={o.code} className="relative">
                        <TableCell className="pl-6">
                          {orderLinks ? (
                            <Link href={`/admin/orders/${o.code}`} className="text-primary after:absolute after:inset-0 hover:underline">
                              {o.code}
                            </Link>
                          ) : (
                            o.code
                          )}
                        </TableCell>
                        <TableCell>{o.customer}</TableCell>
                        <TableCell className="text-right text-muted-foreground tabular-nums">{formatVnd(o.total)}</TableCell>
                        <TableCell className="text-right text-muted-foreground tabular-nums">{formatVnd(o.commission)}</TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>Tổng · {r.orders} đơn</TableCell>
                  <TableCell />
                  <TableCell className="text-right tabular-nums">{formatVnd(r.sales)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatVnd(r.commission)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
