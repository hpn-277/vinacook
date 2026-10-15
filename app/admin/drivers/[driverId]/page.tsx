import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { PageTitle } from "@/components/page-title";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatKg, formatVnd } from "@/lib/domain/money";
import { localDate, parseIsoDate } from "@/lib/domain/time";
import { deliveredInMonth, orderKg } from "@/lib/driver-stats";
import { today } from "@/lib/period";

const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const hm = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const time = (iso: string | null) => (iso ? hm.format(new Date(iso)) : "—");

export default async function DriverMonthPage({ params, searchParams }: PageProps<"/admin/drivers/[driverId]">) {
  await requireRole("manager");
  const driverId = Number((await params).driverId);
  const raw = (await searchParams).month;
  const month = (typeof raw === "string" && parseIsoDate(`${raw}-01`)?.slice(0, 7)) || today().slice(0, 7);
  if (!Number.isInteger(driverId)) notFound();
  const { data: driver } = await db().from("staff").select("id, name, phone").eq("id", driverId).eq("role", "driver").maybeSingle();
  if (!driver) notFound();

  const delivered = await deliveredInMonth(month, driverId);
  const days = new Map<string, typeof delivered>();
  for (const o of delivered) {
    const d = localDate(new Date(o.delivered_at!));
    days.set(d, [...(days.get(d) ?? []), o]);
  }
  const kg = delivered.reduce((s, o) => s + orderKg(o), 0);
  const value = delivered.reduce((s, o) => s + o.total, 0);
  const districts = [...Map.groupBy(delivered, (o) => o.district)].sort((a, b) => b[1].length - a[1].length);

  const tiles = [
    { label: "Đơn đã giao", value: String(delivered.length), note: `${days.size} ngày đi giao` },
    { label: "Kg đã giao", value: formatKg(kg), note: delivered.length ? `TB ${formatKg(Math.round(kg / delivered.length))}/đơn` : "—" },
    { label: "Giá trị hàng", value: formatVnd(value), note: `${delivered.filter((o) => o.payment_status === "paid").length} đơn đã thanh toán` },
    { label: "Có ảnh giao hàng", value: `${delivered.filter((o) => o.delivery_photo_path).length}/${delivered.length}`, note: "Bằng chứng giao hàng" },
  ];

  return (
    <>
      <Link href={`/admin/drivers?month=${month}`} className="mb-3 inline-block text-sm text-muted-foreground hover:text-foreground">
        ‹ Tài xế tháng {month}
      </Link>
      <PageTitle>
        {driver.name} <span className="text-base font-normal text-muted-foreground">{driver.phone}</span>
      </PageTitle>
      <AutoSubmitForm action={`/admin/drivers/${driverId}`} className="mb-4">
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

      <Card size="sm" className="mb-4">
        <CardHeader>
          <CardTitle>
            <h2>Đơn đã giao theo ngày</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {delivered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa giao đơn nào trong tháng.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày / Mã đơn</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Lên xe → Giao</TableHead>
                  <TableHead className="text-right">Kg</TableHead>
                  <TableHead className="text-right">Giá trị</TableHead>
                  <TableHead>Ảnh</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...days].map(([d, os]) => (
                  <Fragment key={d}>
                    <TableRow className="bg-muted/50 font-medium hover:bg-muted/50" data-driver-day={d}>
                      <TableCell className="tabular-nums">
                        {dm(d)} <span className="font-normal text-muted-foreground">· {os.length} đơn</span>
                      </TableCell>
                      <TableCell className="text-xs font-normal text-muted-foreground">{[...new Set(os.map((o) => o.district))].join(", ")}</TableCell>
                      <TableCell />
                      <TableCell className="text-right tabular-nums">{formatKg(os.reduce((s, o) => s + orderKg(o), 0))}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatVnd(os.reduce((s, o) => s + o.total, 0))}</TableCell>
                      <TableCell />
                    </TableRow>
                    {os.map((o) => (
                      <TableRow key={o.code} className="relative">
                        <TableCell className="pl-6">
                          <Link href={`/admin/orders/${o.code}`} className="text-primary after:absolute after:inset-0 hover:underline">
                            {o.code}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {o.customers?.name} <span className="text-xs text-muted-foreground">· {o.district}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground tabular-nums">
                          {time(o.departed_at)} → {time(o.delivered_at)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground tabular-nums">{formatKg(orderKg(o))}</TableCell>
                        <TableCell className="text-right text-muted-foreground tabular-nums">{formatVnd(o.total)}</TableCell>
                        <TableCell className="text-xs">{o.delivery_photo_path ? "✓" : <span className="text-muted-foreground">—</span>}</TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>Tổng · {delivered.length} đơn</TableCell>
                  <TableCell colSpan={2} />
                  <TableCell className="text-right tabular-nums">{formatKg(kg)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatVnd(value)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>

      {districts.length > 0 && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>
              <h2>Theo quận</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {districts.map(([name, os]) => (
                  <TableRow key={name}>
                    <TableCell>{name}</TableCell>
                    <TableCell className="text-right tabular-nums">{os.length} đơn</TableCell>
                    <TableCell className="text-right tabular-nums">{formatKg(os.reduce((s, o) => s + orderKg(o), 0))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
