import Link from "next/link";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { PageTitle } from "@/components/page-title";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { unwrap } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatVnd } from "@/lib/domain/money";
import { localDate, parseIsoDate } from "@/lib/domain/time";
import { monthRange, today } from "@/lib/period";

const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export default async function SaleCommissionPage({ params, searchParams }: PageProps<"/admin/commission/[saleId]">) {
  await requireRole("manager");
  const saleId = Number((await params).saleId);
  const raw = (await searchParams).month;
  const month = (typeof raw === "string" && parseIsoDate(`${raw}-01`)?.slice(0, 7)) || today().slice(0, 7);
  const { from, to } = monthRange(parseIsoDate(`${month}-01`)!);

  const { data: sale } = await db().from("staff").select("id, name, ref_code, commission_pct").eq("id", saleId).eq("role", "sale").maybeSingle();
  if (!Number.isInteger(saleId) || !sale) notFound();
  const pct = Number(sale.commission_pct ?? 0);

  const [delivered, customers] = await Promise.all([
    db()
      .from("orders")
      .select("code, total, delivered_at, production_date, customer_id, customers(name, phone)")
      .eq("sale_id", saleId)
      .eq("status", "delivered")
      .gte("delivered_at", from)
      .lt("delivered_at", to)
      .order("delivered_at", { ascending: false })
      .then(unwrap),
    db()
      .from("customers")
      .select("id, name, phone, default_district, orders(code, status, total, production_date, delivered_at)")
      .eq("sale_id", saleId)
      .order("name")
      .then(unwrap),
  ]);

  const sales = delivered.reduce((s, o) => s + o.total, 0);
  const commission = Math.round((sales * pct) / 100);
  const days = new Map<string, { sales: number; orders: typeof delivered }>();
  for (const o of delivered) {
    const d = localDate(new Date(o.delivered_at!));
    const day = days.get(d) ?? { sales: 0, orders: [] };
    day.sales += o.total;
    day.orders.push(o);
    days.set(d, day);
  }

  const customerRows = customers
    .map((c) => {
      const live = c.orders.filter((o) => o.status !== "cancelled");
      const monthDelivered = c.orders.filter((o) => o.status === "delivered" && o.delivered_at! >= from && o.delivered_at! < to);
      const dates = live.map((o) => o.production_date).sort();
      const last = dates.at(-1);
      return {
        ...c,
        monthOrders: monthDelivered.length,
        monthSales: monthDelivered.reduce((s, o) => s + o.total, 0),
        lifetimeOrders: live.length,
        last,
        isNew: dates[0]?.startsWith(month) ?? false,
      };
    })
    .sort((a, b) => b.monthSales - a.monthSales || a.name.localeCompare(b.name, "vi"));

  const tiles = [
    { label: "Đơn đã giao", value: String(delivered.length), note: `Trong tháng ${month}` },
    { label: "Doanh số đã giao", value: formatVnd(sales), note: `${days.size} ngày có đơn giao` },
    { label: `Hoa hồng (${pct}%)`, value: formatVnd(commission), note: "Tính trên đơn đã giao" },
    { label: "Khách hàng", value: String(customers.length), note: `${customerRows.filter((c) => c.isNew).length} khách có đơn đầu tiên trong tháng` },
  ];

  return (
    <>
      <Link href={`/admin/commission?month=${month}`} className="mb-3 inline-block text-sm text-muted-foreground hover:text-foreground">
        ‹ Hoa hồng tháng {month}
      </Link>
      <PageTitle>
        {sale.name} <span className="font-mono text-base font-normal text-muted-foreground">{sale.ref_code}</span>
      </PageTitle>
      <AutoSubmitForm action={`/admin/commission/${saleId}`} className="mb-4">
        <Input type="month" name="month" defaultValue={month} aria-label="Chọn tháng" className="w-auto" />
      </AutoSubmitForm>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} size="sm">
            <CardContent className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">{t.label}</span>
              <span className="text-xl font-bold tabular-nums sm:text-2xl">{t.value}</span>
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
          {days.size === 0 ? (
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
                {[...days].map(([d, day]) => (
                  <Fragment key={d}>
                    <TableRow className="bg-muted/50 font-medium hover:bg-muted/50" data-commission-day={d}>
                      <TableCell className="tabular-nums">
                        {dm(d)} <span className="font-normal text-muted-foreground">· {day.orders.length} đơn</span>
                      </TableCell>
                      <TableCell />
                      <TableCell className="text-right tabular-nums">{formatVnd(day.sales)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatVnd(Math.round((day.sales * pct) / 100))}</TableCell>
                    </TableRow>
                    {day.orders.map((o) => (
                      <TableRow key={o.code} className="relative">
                        <TableCell className="pl-6">
                          <Link href={`/admin/orders/${o.code}`} className="text-primary after:absolute after:inset-0 hover:underline">
                            {o.code}
                          </Link>
                        </TableCell>
                        <TableCell>{o.customers?.name}</TableCell>
                        <TableCell className="text-right text-muted-foreground tabular-nums">{formatVnd(o.total)}</TableCell>
                        <TableCell className="text-right text-muted-foreground tabular-nums">{formatVnd(Math.round((o.total * pct) / 100))}</TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>Tổng · {delivered.length} đơn</TableCell>
                  <TableCell />
                  <TableCell className="text-right tabular-nums">{formatVnd(sales)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatVnd(commission)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card size="sm" className="mt-4">
        <CardHeader>
          <CardTitle>
            <h2>Khách hàng phụ trách ({customers.length})</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customerRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có khách hàng.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Quận</TableHead>
                  <TableHead className="text-right">Đơn giao tháng này</TableHead>
                  <TableHead className="text-right">Doanh số tháng này</TableHead>
                  <TableHead className="text-right">Tổng số đơn</TableHead>
                  <TableHead>Đơn gần nhất</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerRows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">
                        {c.name} {c.isNew && <OrderBadgeNew />}
                      </div>
                      <div className="text-xs text-muted-foreground">{c.phone}</div>
                    </TableCell>
                    <TableCell>{c.default_district ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.monthOrders}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatVnd(c.monthSales)}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.lifetimeOrders}</TableCell>
                    <TableCell className="tabular-nums">{c.last ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function OrderBadgeNew() {
  return <span className="ml-1 rounded-full bg-lime-100 px-1.5 py-0.5 text-[10px] font-medium text-lime-800">Khách mới</span>;
}
