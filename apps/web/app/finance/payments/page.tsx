import Link from "next/link";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { PageTitle } from "@/components/page-title";
import { StatTiles } from "@/components/finance/StatTiles";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { unwrap } from "@noodle/core/action";
import { requireRole } from "@/lib/auth";
import { db } from "@noodle/core/db";
import { PAYMENT_ACTION_LABEL, paymentTotals } from "@noodle/core/domain/debt";
import { formatVnd } from "@noodle/core/domain/money";
import { parseIsoDate } from "@noodle/core/domain/time";
import { monthRange, today } from "@/lib/period";

/** Columns that fold into the first cells on phones, so code and amount stay on screen. */
const WIDE = "hidden md:table-cell";
const dateTime = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" });

export default async function PaymentsPage({ searchParams }: PageProps<"/finance/payments">) {
  await requireRole("cashier", "accountant");
  const raw = (await searchParams).month;
  const start = (typeof raw === "string" && parseIsoDate(`${raw}-01`)) || today();
  const month = start.slice(0, 7);
  const range = monthRange(start);
  const events = unwrap(
    await db()
      .from("payment_events")
      .select("id, action, amount, note, created_at, staff(name), orders(code, customers(name))")
      .gte("created_at", range.from)
      .lt("created_at", range.to)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
  );
  const totals = paymentTotals(events);

  return (
    <>
      <PageTitle>Lịch sử thu tháng {month}</PageTitle>
      <AutoSubmitForm action="/finance/payments" className="mb-4">
        <Input type="month" name="month" defaultValue={month} aria-label="Chọn tháng" className="w-auto" />
      </AutoSubmitForm>
      <StatTiles
        tiles={[
          { label: "Thu vào", value: formatVnd(totals.received), note: `${events.filter((e) => e.action === "paid").length} lần xác nhận đã thu` },
          { label: "Hoàn tác", value: formatVnd(totals.reversed), note: `${events.filter((e) => e.action === "unpaid").length} lần bỏ đánh dấu`, warn: totals.reversed > 0 },
          { label: "Thực thu", value: formatVnd(totals.net), note: "Thu vào trừ hoàn tác" },
        ]}
      />
      <Card size="sm">
        <CardContent>
          {events.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Chưa có lần thu nào trong tháng này.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={WIDE}>Thời gian</TableHead>
                  <TableHead>Đơn</TableHead>
                  <TableHead className={WIDE}>Khách hàng</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  <TableHead className={WIDE}>Thao tác</TableHead>
                  <TableHead className={WIDE}>Người thực hiện</TableHead>
                  <TableHead className={WIDE}>Ghi chú</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.id} data-order-code={e.orders?.code} data-payment-event={e.action}>
                    <TableCell className={`${WIDE} tabular-nums`}>{dateTime.format(new Date(e.created_at))}</TableCell>
                    <TableCell className="whitespace-normal">
                      <Link href={`/finance/orders/${e.orders?.code}`} className="font-semibold text-primary hover:underline">
                        {e.orders?.code}
                      </Link>
                      <div className="mt-0.5 text-xs text-muted-foreground md:hidden">
                        {e.orders?.customers?.name} · {dateTime.format(new Date(e.created_at))} · {e.staff?.name}
                        {e.note && <div>{e.note}</div>}
                      </div>
                    </TableCell>
                    <TableCell className={WIDE}>{e.orders?.customers?.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatVnd(e.amount)}
                      <div className={`text-xs md:hidden ${e.action === "paid" ? "text-green-700" : "text-destructive"}`}>{PAYMENT_ACTION_LABEL[e.action]}</div>
                    </TableCell>
                    <TableCell className={`${WIDE} ${e.action === "paid" ? "text-green-700" : "text-destructive"}`}>{PAYMENT_ACTION_LABEL[e.action]}</TableCell>
                    <TableCell className={WIDE}>{e.staff?.name}</TableCell>
                    <TableCell className={`${WIDE} max-w-64 min-w-32 whitespace-normal text-muted-foreground`}>{e.note ?? "—"}</TableCell>
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
