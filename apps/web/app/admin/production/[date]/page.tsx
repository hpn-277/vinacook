import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/page-title";
import { SendToFactory } from "@/components/admin/SendToFactory";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SentTable, type SentGroup } from "./SentTable";
import { unwrap } from "@noodle/core/action";
import { requireRole } from "@/lib/auth";
import { db } from "@noodle/core/db";
import { formatKg } from "@noodle/core/domain/money";
import { parseIsoDate } from "@noodle/core/domain/time";

const round2 = (n: number) => Math.round(n * 100) / 100;
const clock = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });

type Factory = { id: number; name: string; active: boolean };
type Line = { factory: Factory; product: string; kg: number };
type FactoryGroup = { factory: Factory; kg: number; lines: Line[] };

/** One block per factory: what it makes and its total kg. */
function byFactory(lines: Line[]): FactoryGroup[] {
  const groups = new Map<number, FactoryGroup>();
  for (const line of lines) {
    const g = groups.get(line.factory.id) ?? { factory: line.factory, kg: 0, lines: [] };
    const same = g.lines.find((l) => l.product === line.product);
    if (same) same.kg = round2(same.kg + line.kg);
    else g.lines.push({ ...line });
    g.kg = round2(g.kg + line.kg);
    groups.set(line.factory.id, g);
  }
  return [...groups.values()];
}

export default async function ProductionDayPage({ params }: PageProps<"/admin/production/[date]">) {
  await requireRole("admin", "manager");
  const date = parseIsoDate((await params).date);
  if (!date) notFound();

  const FACTORY = "id, name, active";
  const [day, placedItems, jobs, unreviewed] = await Promise.all([
    db().from("production_days").select("status, closed_at").eq("date", date).maybeSingle(),
    db()
      .from("order_items")
      .select(`qty_kg, products(name, factories(${FACTORY})), orders!inner(id, production_date, status)`)
      .eq("orders.production_date", date)
      .eq("orders.status", "placed")
      .then(unwrap),
    db().from("production_jobs").select(`id, qty_kg, status, products(name), factories(${FACTORY})`).eq("date", date).order("factory_id").order("product_id").then(unwrap),
    db().from("orders").select("id", { count: "exact", head: true }).eq("production_date", date).eq("status", "pending_review").then((r) => r.count ?? 0),
  ]);
  const closed = day.data?.status === "closed";
  const plan = byFactory(placedItems.flatMap((i) => (i.products?.factories ? [{ factory: i.products.factories, product: i.products.name, kg: i.qty_kg }] : [])));
  const sent: SentGroup[] = [...Map.groupBy(jobs.filter((j) => j.factories), (j) => j.factories!.id)].map(([, js]) => ({
    factory: { id: js[0].factories!.id, name: js[0].factories!.name },
    kg: round2(js.reduce((s, j) => s + j.qty_kg, 0)),
    lines: js.map((j) => ({ product: j.products?.name ?? "?", kg: j.qty_kg, job: { id: j.id, status: j.status } })),
  }));
  const placedOrders = new Set(placedItems.map((i) => i.orders.id)).size;

  return (
    <>
      <PageTitle>Sản xuất ngày {date}</PageTitle>
      <p className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span>
          Trạng thái: <b>{closed ? "Đã gửi xưởng" : "Chưa gửi"}</b>
        </span>
        <span className="text-muted-foreground">·</span>
        <Link href={`/admin/orders?date=${date}`} className="text-primary underline underline-offset-4">
          Xem đơn
        </Link>
      </p>

      {!closed && plan.length === 0 && unreviewed === 0 && <p className="text-muted-foreground">Chưa có đơn cho ngày này.</p>}
      {!closed && (plan.length > 0 || unreviewed > 0) && (
        <Card size="sm">
          <CardContent className="space-y-3">
            <h2 className="font-semibold">Sẽ gửi cho xưởng</h2>
            <p className="text-sm text-muted-foreground">
              Kiểm tra đơn trước, hủy các đơn không làm. Khi gửi, <b className="text-foreground">{placedOrders}</b> đơn chờ xử lý chuyển sang Đang sản
              xuất và mỗi xưởng nhận phần hàng của mình.
            </p>
            <FactoryTable groups={plan} />
            <SendToFactory date={date} unreviewed={unreviewed} />
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
            <SentTable groups={sent} date={date} />
          </CardContent>
        </Card>
      )}
    </>
  );
}

function FactoryTable({ groups }: { groups: FactoryGroup[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Xưởng</TableHead>
          <TableHead>Sản phẩm</TableHead>
          <TableHead className="text-right">Kg</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.map(({ factory: f, kg, lines }) =>
          lines.map((l, idx) => (
            <TableRow key={`${f.id}-${l.product}`} data-factory={f.name}>
              {idx === 0 && (
                <TableCell rowSpan={lines.length} className="align-top font-medium">
                  <Link href={`/admin/factories/${f.id}`} className="underline-offset-4 hover:underline">
                    {f.name}
                  </Link>
                  <div className="text-xs font-normal text-muted-foreground">Tổng {formatKg(kg)}</div>
                  {!f.active && <div className="text-xs font-normal text-destructive">Ngừng hoạt động: đổi xưởng ở trang Sản phẩm</div>}
                </TableCell>
              )}
              <TableCell>{l.product}</TableCell>
              <TableCell className="text-right tabular-nums">{formatKg(l.kg)}</TableCell>
            </TableRow>
          )),
        )}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={2}>Tổng</TableCell>
          <TableCell className="text-right tabular-nums">{formatKg(round2(groups.reduce((s, g) => s + g.kg, 0)))}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
