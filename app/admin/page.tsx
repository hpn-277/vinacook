import Link from "next/link";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { unwrap } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatKg, formatVnd } from "@/lib/domain/money";
import { parseIsoDate } from "@/lib/domain/time";
import { today } from "@/lib/period";

type Day = { day: string; orders: number; cancelled: number; kg: number; revenue: number; paid: number; unpaid: number };

function shiftMonth(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function daysOf(month: string) {
  const [y, m] = month.split("-").map(Number);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
}

const compactVnd = new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 });

export default async function OverviewPage({ searchParams }: PageProps<"/admin">) {
  await requireRole("manager");
  const raw = (await searchParams).month;
  const month = (typeof raw === "string" && parseIsoDate(`${raw}-01`)?.slice(0, 7)) || today().slice(0, 7);
  const rows = unwrap(await db().rpc("daily_overview", { p_from: `${month}-01`, p_to: `${shiftMonth(month, 1)}-01` }));
  const byDay = new Map<string, Day>(rows.map((r) => [r.day, { ...r, kg: Number(r.kg) }]));

  const sum = (k: keyof Omit<Day, "day">) => rows.reduce((s, r) => s + Number(r[k]), 0);
  const totals = { orders: sum("orders"), cancelled: sum("cancelled"), kg: sum("kg"), revenue: sum("revenue"), paid: sum("paid"), unpaid: sum("unpaid") };
  const days = daysOf(month);
  const maxRevenue = Math.max(0, ...rows.map((r) => r.revenue));

  const tiles = [
    { label: "Số đơn", value: String(totals.orders), note: totals.cancelled ? `${totals.cancelled} đơn hủy (không tính)` : "Không có đơn hủy" },
    { label: "Doanh thu", value: formatVnd(totals.revenue), note: `${formatKg(totals.kg)} hàng` },
    { label: "Đã thu", value: formatVnd(totals.paid), note: totals.revenue ? `${Math.round((totals.paid / totals.revenue) * 100)}% doanh thu` : "—" },
    { label: "Chưa thu", value: formatVnd(totals.unpaid), note: totals.unpaid ? "Cần theo dõi công nợ" : "Đã thu đủ", warn: totals.unpaid > 0 },
  ];

  return (
    <>
      <PageTitle>Tổng quan tháng {month}</PageTitle>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" asChild>
          <Link href={`/admin?month=${shiftMonth(month, -1)}`} aria-label="Tháng trước">‹</Link>
        </Button>
        <AutoSubmitForm action="/admin">
          <Input type="month" name="month" defaultValue={month} aria-label="Chọn tháng" className="w-auto" />
        </AutoSubmitForm>
        <Button variant="outline" asChild>
          <Link href={`/admin?month=${shiftMonth(month, 1)}`} aria-label="Tháng sau">›</Link>
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} size="sm">
            <CardContent className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">{t.label}</span>
              <span className="text-xl font-bold tabular-nums sm:text-2xl" data-testid={`overview-${t.label}`}>
                {t.value}
              </span>
              <span className={t.warn ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>{t.note}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card size="sm" className="mb-4">
        <CardHeader>
          <CardTitle>
            <h2>Doanh thu theo ngày</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-2 text-xs text-muted-foreground">Bấm vào một ngày để xem đơn của ngày đó. Tính theo ngày sản xuất, không gồm đơn hủy.</p>
          <div className="relative h-48 border-b border-border">
            {maxRevenue > 0 && (
              <>
                <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-border" />
                <span className="pointer-events-none absolute top-0 right-0 -translate-y-full text-[10px] text-muted-foreground tabular-nums">
                  {compactVnd.format(maxRevenue)}đ
                </span>
              </>
            )}
            <div className="flex h-full items-end gap-[2px]">
              {days.map((d) => {
                const r = byDay.get(d);
                const pct = r?.revenue && maxRevenue ? Math.max(2, (r.revenue / maxRevenue) * 100) : 0;
                const label = r ? `${d}: ${r.orders} đơn, ${formatVnd(r.revenue)}` : `${d}: không có đơn`;
                return (
                  <Link
                    key={d}
                    href={`/admin/orders?date=${d}`}
                    aria-label={label}
                    className="group relative flex h-full min-w-0 flex-1 items-end rounded-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <span
                      className="block w-full rounded-t-[4px] bg-primary/75 group-hover:bg-primary"
                      style={{ height: `${pct}%` }}
                    />
                    <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-md group-hover:block group-focus-visible:block">
                      <span className="font-semibold">{d.slice(8)}/{d.slice(5, 7)}</span>
                      {r ? (
                        <>
                          {" · "}
                          {r.orders} đơn · {formatVnd(r.revenue)}
                          {r.unpaid > 0 && <span className="block text-muted-foreground">Chưa thu {formatVnd(r.unpaid)}</span>}
                        </>
                      ) : (
                        " · không có đơn"
                      )}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="mt-1 flex gap-[2px] text-[10px] text-muted-foreground tabular-nums">
            {days.map((d, i) => (
              <span key={d} className="min-w-0 flex-1 text-center">
                {i === 0 || (i + 1) % 5 === 0 ? Number(d.slice(8)) : ""}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>
            <h2>Chi tiết theo ngày</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có đơn trong tháng này.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead className="text-right">Số đơn</TableHead>
                  <TableHead className="text-right">Kg</TableHead>
                  <TableHead className="text-right">Doanh thu</TableHead>
                  <TableHead className="text-right">Đã thu</TableHead>
                  <TableHead className="text-right">Chưa thu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...rows].reverse().map((r) => (
                  <TableRow key={r.day} className="relative" data-overview-day={r.day}>
                    <TableCell>
                      <Link href={`/admin/orders?date=${r.day}`} className="font-medium text-primary after:absolute after:inset-0 hover:underline">
                        {r.day}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.orders}
                      {r.cancelled > 0 && <span className="text-muted-foreground"> (+{r.cancelled} hủy)</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatKg(Number(r.kg))}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatVnd(r.revenue)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatVnd(r.paid)}</TableCell>
                    <TableCell className={`text-right tabular-nums ${r.unpaid ? "text-destructive" : "text-muted-foreground"}`}>{formatVnd(r.unpaid)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>Tổng</TableCell>
                  <TableCell className="text-right tabular-nums">{totals.orders}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatKg(totals.kg)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatVnd(totals.revenue)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatVnd(totals.paid)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatVnd(totals.unpaid)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
