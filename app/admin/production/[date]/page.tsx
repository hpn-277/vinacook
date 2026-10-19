import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/page-title";
import { ActionForm } from "@/components/ActionForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { JobBadge } from "@/components/status-badge";
import { unwrap } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatKg } from "@/lib/domain/money";
import type { JobStatus } from "@/lib/domain/status";
import { parseIsoDate } from "@/lib/domain/time";
import { closeDay } from "./actions";

const round2 = (n: number) => Math.round(n * 100) / 100;
const clock = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });

type Factory = { id: number; name: string; active: boolean };
type Line = { factory: Factory; product: string; kg: number; job?: { id: number; status: JobStatus } };
type FactoryGroup = { factory: Factory; kg: number; lines: Line[] };

/** One block per factory: what it makes and its total kg. */
function byFactory(lines: Line[]): FactoryGroup[] {
  const groups = new Map<number, FactoryGroup>();
  for (const line of lines) {
    const g = groups.get(line.factory.id) ?? { factory: line.factory, kg: 0, lines: [] };
    const same = !line.job && g.lines.find((l) => l.product === line.product);
    if (same) same.kg = round2(same.kg + line.kg);
    else g.lines.push({ ...line });
    g.kg = round2(g.kg + line.kg);
    groups.set(line.factory.id, g);
  }
  return [...groups.values()];
}

export default async function ProductionDayPage({ params }: PageProps<"/admin/production/[date]">) {
  await requireRole("manager");
  const date = parseIsoDate((await params).date);
  if (!date) notFound();

  const FACTORY = "id, name, active";
  const [day, placedItems, jobs] = await Promise.all([
    db().from("production_days").select("status, closed_at").eq("date", date).maybeSingle(),
    db()
      .from("order_items")
      .select(`qty_kg, products(name, factories(${FACTORY})), orders!inner(id, production_date, status)`)
      .eq("orders.production_date", date)
      .eq("orders.status", "placed")
      .then(unwrap),
    db().from("production_jobs").select(`id, qty_kg, status, products(name), factories(${FACTORY})`).eq("date", date).order("factory_id").order("product_id").then(unwrap),
  ]);
  const closed = day.data?.status === "closed";
  const plan = byFactory(placedItems.flatMap((i) => (i.products?.factories ? [{ factory: i.products.factories, product: i.products.name, kg: i.qty_kg }] : [])));
  const sent = byFactory(jobs.flatMap((j) => (j.factories ? [{ factory: j.factories, product: j.products?.name ?? "?", kg: j.qty_kg, job: { id: j.id, status: j.status } }] : [])));
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

      {!closed && plan.length === 0 && <p className="text-muted-foreground">Chưa có đơn cho ngày này.</p>}
      {!closed && plan.length > 0 && (
        <Card size="sm">
          <CardContent className="space-y-3">
            <h2 className="font-semibold">Sẽ gửi cho xưởng</h2>
            <p className="text-sm text-muted-foreground">
              Kiểm tra đơn trước, hủy các đơn không làm. Chốt ngày sẽ đưa toàn bộ <b className="text-foreground">{placedOrders}</b> đơn chờ xử lý vào sản
              xuất và gửi lệnh cho xưởng của từng sản phẩm.
            </p>
            <FactoryTable groups={plan} />
            <ActionForm action={closeDay} confirm={`Chốt ngày ${date} và gửi lệnh cho xưởng?`}>
              <input type="hidden" name="date" value={date} />
              <Button>Chốt ngày và gửi lệnh sản xuất</Button>
            </ActionForm>
          </CardContent>
        </Card>
      )}

      {sent.length > 0 && (
        <Card size="sm" data-testid="sent-summary">
          <CardContent className="space-y-3">
            <h2 className="font-semibold">
              Đã gửi cho xưởng
              {day.data?.closed_at && <span className="ml-2 text-sm font-normal text-muted-foreground">lúc {clock.format(new Date(day.data.closed_at))}</span>}
            </h2>
            <FactoryTable groups={sent} />
          </CardContent>
        </Card>
      )}
    </>
  );
}

function FactoryTable({ groups }: { groups: FactoryGroup[] }) {
  const withJobs = groups.some((g) => g.lines.some((l) => l.job));
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Xưởng</TableHead>
          <TableHead>Sản phẩm</TableHead>
          <TableHead className="text-right">Kg</TableHead>
          {withJobs && <TableHead>Lệnh</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.map(({ factory: f, kg, lines }) =>
          lines.map((l, idx) => (
            <TableRow key={l.job?.id ?? `${f.id}-${l.product}`} data-factory={f.name} data-job-id={l.job?.id}>
              {idx === 0 && (
                <TableCell rowSpan={lines.length} className="align-top font-medium">
                  <Link href={`/admin/factories/${f.id}`} className="underline-offset-4 hover:underline">
                    {f.name}
                  </Link>
                  <div className="text-xs font-normal text-muted-foreground">Tổng {formatKg(kg)}</div>
                  {!f.active && <div className="text-xs font-normal text-destructive">Ngừng hoạt động: đổi xưởng trong Cài đặt</div>}
                </TableCell>
              )}
              <TableCell>{l.product}</TableCell>
              <TableCell className="text-right tabular-nums">{formatKg(l.kg)}</TableCell>
              {withJobs && (
                <TableCell>
                  {l.job && (
                    <span className="flex items-center gap-2">
                      <span className="text-muted-foreground">#{l.job.id}</span>
                      <JobBadge status={l.job.status} />
                    </span>
                  )}
                </TableCell>
              )}
            </TableRow>
          )),
        )}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={2}>Tổng</TableCell>
          <TableCell className="text-right tabular-nums">{formatKg(round2(groups.reduce((s, g) => s + g.kg, 0)))}</TableCell>
          {withJobs && <TableCell />}
        </TableRow>
      </TableFooter>
    </Table>
  );
}
