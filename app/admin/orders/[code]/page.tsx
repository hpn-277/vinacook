import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ADMIN_ORDER_SELECT, OrderActions, PaymentLabel, type AdminOrder } from "@/components/AdminOrderCard";
import { JobBadge, OrderBadge, TierBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { unwrap } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { lineLabel } from "@/lib/domain/catalog";
import { formatKg, formatVnd } from "@/lib/domain/money";

type Detail = AdminOrder & {
  created_by: "customer" | "sale" | "manager";
  delivered_at: string | null;
  retail_markup_pct: number;
  wholesale_min_kg: number;
  wholesale_min_total: number;
  creator: { name: string } | null;
  customer: { id: number; name: string; phone: string; default_address: string | null; default_district: string | null; created_at: string; owner: { name: string; ref_code: string | null; commission_pct: number | null } | null } | null;
  items: { id: number; pack_name: string; pack_qty: number; qty_kg: number; price_per_kg: number; wholesale_price_per_kg: number; line_total: number; product_id: number; products: { name: string } | null }[];
};

const DETAIL_SELECT = `${ADMIN_ORDER_SELECT}, created_by, delivered_at, retail_markup_pct, wholesale_min_kg, wholesale_min_total,
  creator:staff!orders_created_by_staff_id_fkey(name),
  customer:customers(id, name, phone, default_address, default_district, created_at, owner:staff(name, ref_code, commission_pct)),
  items:order_items(id, pack_name, pack_qty, qty_kg, price_per_kg, wholesale_price_per_kg, line_total, product_id, products(name))`;

const dateTime = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" });
const dateOnly = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short" });
const when = (iso: string | null | undefined) => (iso ? dateTime.format(new Date(iso)) : null);
const CREATED_BY = { customer: "Khách tự đặt", sale: "NVKD tạo", manager: "Quản lý tạo" } as const;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2 py-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default async function OrderDetailPage({ params }: PageProps<"/admin/orders/[code]">) {
  await requireRole("manager");
  const { code } = await params;
  const { data } = await db().from("orders").select(DETAIL_SELECT).eq("code", code).order("id", { referencedTable: "order_items" }).maybeSingle();
  if (!data) notFound();
  const order = data as unknown as Detail;

  const productIds = [...new Set(order.items.map((i) => i.product_id))];
  const [day, jobs, history] = await Promise.all([
    db().from("production_days").select("status, closed_at").eq("date", order.production_date).maybeSingle(),
    db()
      .from("production_jobs")
      .select("id, qty_kg, received_kg, status, updated_at, products(name), factories(name)")
      .eq("date", order.production_date)
      .in("product_id", productIds)
      .order("id")
      .then(unwrap),
    order.customer
      ? db().from("orders").select("code, production_date, status, total, payment_status").eq("customer_id", order.customer.id).order("production_date", { ascending: false }).limit(10).then(unwrap)
      : Promise.resolve([]),
  ]);

  const kg = order.items.reduce((s, i) => s + i.qty_kg, 0);
  const atWholesale = order.items.reduce((s, i) => s + Math.round(i.qty_kg * i.wholesale_price_per_kg), 0);
  const owner = order.customer?.owner;
  const commission = order.sale && owner?.commission_pct != null && order.status === "delivered" ? Math.round((order.total * owner.commission_pct) / 100) : null;
  const received = jobs.filter((j) => j.status === "received").map((j) => j.updated_at);
  const timeline = [
    { label: "Đặt hàng", at: when(order.created_at), note: CREATED_BY[order.created_by] + (order.creator ? ` (${order.creator.name})` : "") },
    { label: "Chốt sản xuất", at: when(day.data?.closed_at), note: day.data?.status === "closed" ? "Đã gửi lệnh cho xưởng" : "Ngày chưa chốt" },
    { label: "Nhận hàng từ xưởng", at: received.length ? when(received.sort().at(-1)) : null, note: jobs.length ? `${received.length}/${jobs.length} lệnh đã nhận` : "Chưa có lệnh" },
    { label: "Giao cho tài xế", at: null, note: order.driver ? order.driver.name : "Chưa phân công" },
    { label: "Giao thành công", at: when(order.delivered_at), note: order.status === "failed" ? `Thất bại: ${order.fail_reason}` : order.status === "cancelled" ? "Đơn đã hủy" : "" },
  ];

  return (
    <>
      <Link href={`/admin/orders?date=${order.production_date}`} className="mb-3 inline-block text-sm text-muted-foreground hover:text-foreground">
        ‹ Đơn hàng ngày {order.production_date}
      </Link>
      <div className="mb-4 flex flex-wrap items-center gap-2" data-order-code={order.code}>
        <h1 className="text-xl font-bold tracking-tight">{order.code}</h1>
        <OrderBadge status={order.status} />
        <TierBadge tier={order.price_tier} />
        <PaymentLabel order={order} />
        <span className="ml-auto text-xl font-bold tabular-nums">{formatVnd(order.total)}</span>
        <div className="flex w-full flex-wrap gap-2">
          <OrderActions order={order} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Khách hàng & giao hàng">
          <dl className="text-sm">
            <Row label="Khách hàng">{order.customer?.name}</Row>
            <Row label="Số điện thoại">
              <a href={`tel:${order.phone}`} className="text-primary">{order.phone}</a>
            </Row>
            <Row label="Địa chỉ giao">
              {order.address}, {order.district}
            </Row>
            {order.note && <Row label="Ghi chú">{order.note}</Row>}
            <Row label="Khách từ">{order.customer ? dateOnly.format(new Date(order.customer.created_at)) : "—"}</Row>
            <Row label="Tài xế">{order.driver?.name ?? "—"}</Row>
            {order.fail_reason && (
              <Row label="Lý do thất bại">
                <span className="text-destructive">{order.fail_reason}</span>
              </Row>
            )}
          </dl>
        </Section>

        <Section title="NVKD & hoa hồng">
          <dl className="text-sm">
            <Row label="NVKD phụ trách">{owner ? `${owner.name} (${owner.ref_code})` : "Không có (khách vãng lai)"}</Row>
            <Row label="Đơn tính cho">{order.sale?.name ?? "—"}</Row>
            <Row label="Người tạo đơn">{CREATED_BY[order.created_by] + (order.creator ? ` · ${order.creator.name}` : "")}</Row>
            <Row label="% hoa hồng">{owner?.commission_pct != null ? `${owner.commission_pct}%` : "—"}</Row>
            <Row label="Hoa hồng đơn này">
              {commission != null ? formatVnd(commission) : <span className="text-muted-foreground">Chỉ tính khi đơn đã giao</span>}
            </Row>
          </dl>
        </Section>
      </div>

      <div className="mt-4 grid gap-4">
        <Section title="Hàng hóa & giá">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sản phẩm</TableHead>
                <TableHead className="text-right">Kg</TableHead>
                <TableHead className="text-right">Giá sỉ/kg</TableHead>
                <TableHead className="text-right">Giá áp dụng/kg</TableHead>
                <TableHead className="text-right">Thành tiền</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>{lineLabel(i.products?.name ?? "?", i.pack_name, i.pack_qty, i.qty_kg)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatKg(i.qty_kg)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatVnd(i.wholesale_price_per_kg)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatVnd(i.price_per_kg)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatVnd(i.line_total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell>Tổng</TableCell>
                <TableCell className="text-right tabular-nums">{formatKg(kg)}</TableCell>
                <TableCell colSpan={2} />
                <TableCell className="text-right tabular-nums">{formatVnd(order.total)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
          <p className="mt-2 text-xs text-muted-foreground">
            {order.price_tier === "si" ? "Áp giá sỉ" : `Áp giá lẻ (sỉ + ${order.retail_markup_pct}%, nếu giá sỉ: ${formatVnd(atWholesale)})`}. Điều kiện giá sỉ lúc đặt: từ{" "}
            {formatKg(order.wholesale_min_kg)} hoặc từ {formatVnd(order.wholesale_min_total)}.
          </p>
        </Section>

        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="Tiến trình">
            <ol className="space-y-3 text-sm">
              {timeline.map((t) => (
                <li key={t.label} className="flex gap-3">
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${t.at || (t.label === "Giao cho tài xế" && order.driver) ? "bg-primary" : "bg-border"}`} />
                  <div>
                    <div className="font-medium">
                      {t.label} {t.at && <span className="font-normal text-muted-foreground">· {t.at}</span>}
                    </div>
                    {t.note && <div className="text-muted-foreground">{t.note}</div>}
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          <Section title={`Lệnh sản xuất ngày ${order.production_date}`}>
            {jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa chốt sản xuất cho ngày này.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {jobs.map((j) => (
                  <li key={j.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">#{j.id}</span> {j.products?.name} · {formatKg(j.qty_kg)} · {j.factories?.name}
                    <JobBadge status={j.status} />
                    {j.received_kg != null && <span className="text-muted-foreground">Thực nhận {formatKg(j.received_kg)}</span>}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-muted-foreground">Lệnh gộp theo sản phẩm của cả ngày, gồm cả hàng của đơn khác.</p>
          </Section>
        </div>

        <Section title="Đơn khác của khách này">
          <Table>
            <TableBody>
              {history.map((h) => (
                <TableRow key={h.code} className={h.code === order.code ? "bg-muted/60" : undefined}>
                  <TableCell>
                    {h.code === order.code ? (
                      <b>{h.code}</b>
                    ) : (
                      <Link href={`/admin/orders/${h.code}`} className="text-primary hover:underline">
                        {h.code}
                      </Link>
                    )}
                  </TableCell>
                  <TableCell>{h.production_date}</TableCell>
                  <TableCell>
                    <OrderBadge status={h.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatVnd(h.total)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{h.payment_status === "paid" ? "Đã trả" : "Chưa trả"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      </div>
    </>
  );
}
