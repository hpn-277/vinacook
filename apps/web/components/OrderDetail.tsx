import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { OrderActions, PaymentLabel, Returned } from "@/components/AdminOrderCard";
import { ExternalShip } from "@/components/admin/ExternalShip";
import { EditContact } from "@/components/EditContact";
import { ShippingInfo } from "@/components/ShippingInfo";
import { dialable, formatDestination } from "@noodle/core/domain/destination";
import { PaymentPanel } from "@/components/PaymentPanel";
import { ReviewActions } from "@/components/ReviewActions";
import { JobBadge, OrderBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { lineLabel } from "@noodle/core/domain/catalog";
import { CONTACT_EDITABLE, orderMoves } from "@noodle/core/domain/status";
import { formatKg, formatVnd } from "@noodle/core/domain/money";
import { orderDetail, type OrderViewer } from "@noodle/core/queries/order-detail";

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

/**
 * Full order page. The admin gets actions, payment and the factory jobs; the manager sees the same but may only mark payment
 * and take an order back from its driver.
 * A sale sees only orders credited to them, read-only.
 */
export async function OrderDetail({
  code,
  viewer,
}: {
  code: string;
  viewer: OrderViewer;
}) {
  const admin = viewer.role === "admin";
  const office = viewer.role !== "sale";
  const base = office ? "/admin/orders" : "/sale/orders";
  const detail = await orderDetail(code, viewer);
  if (!detail) notFound();
  const { order, creatorLabel, customerSince, photo, bookingPhoto, kg, commission, timeline, jobs, history } = detail;
  const moves = office ? orderMoves(viewer.role, order.status) : [];
  const owner = order.customer?.owner;
  const canReview =
    order.status === "pending_review" && (office || (viewer.role === "sale" && order.sale_id === viewer.saleId));

  return (
    <>
      <Link
        href={office ? `/admin/orders?date=${order.production_date}` : "/sale"}
        className="mb-3 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        {office ? `‹ Đơn hàng ngày ${order.production_date}` : "‹ Tổng quan"}
      </Link>
      <div
        className="mb-4 flex flex-wrap items-center gap-2"
        data-order-code={order.code}
      >
        <h1 className="text-xl font-bold tracking-tight">{order.code}</h1>
        <OrderBadge status={order.status} />
        <PaymentLabel order={order} />
        <span className="ml-auto text-xl font-bold tabular-nums">
          {formatVnd(order.total)}
        </span>
        {(order.review_note || order.reviewer) && order.status !== "pending_review" && (
          <p className="w-full text-sm text-muted-foreground" data-testid="review-note">
            {order.review_note ? "Không hợp lệ" : "Đã duyệt"}
            {order.reviewer && ` bởi ${order.reviewer.name}`}
            {order.review_note && `: ${order.review_note}`}
          </p>
        )}
        {canReview && (
          <div className="w-full">
            <ReviewActions order={order} />
          </div>
        )}
        {moves.length > 0 && (
          <div className="flex w-full flex-wrap gap-2">
            <OrderActions order={order} moves={moves} />
          </div>
        )}
        {office && (order.status === "ready" || (order.status === "out_for_delivery" && order.ship_carrier)) && (
          <div className="w-full">
            <ExternalShip order={order} />
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Khách hàng & giao hàng">
          <dl className="text-sm">
            <Row label="Khách hàng">{order.customer?.name}</Row>
            <Row label="Số điện thoại">
              <a href={`tel:${dialable(order.phone, order.country)}`} className="text-primary">
                {order.phone}
              </a>
            </Row>
            <Row label="Địa chỉ giao">
              {formatDestination(order)}
              {admin && CONTACT_EDITABLE(order.status) && (
                <div className="mt-1">
                  <EditContact order={order} />
                </div>
              )}
            </Row>
            {order.note && <Row label="Ghi chú">{order.note}</Row>}
            <Row label="Khách từ">
              {customerSince ?? "—"}
            </Row>
            {order.ship_carrier ? (
              <Row label="Ship ngoài">
                {order.ship_carrier}
                {order.ship_fee != null && ` · ${formatVnd(order.ship_fee)}`}
                {order.ship_note && <div className="text-muted-foreground">{order.ship_note}</div>}
              </Row>
            ) : (
              <Row label="Tài xế">
                {order.driver ? (
                  <>
                    {order.driver.name}
                    {order.driver_contact?.phone && (
                      <>
                        {" · "}
                        <a
                          href={`tel:${order.driver_contact.phone}`}
                          className="text-primary"
                        >
                          {order.driver_contact.phone}
                        </a>
                      </>
                    )}
                  </>
                ) : (
                  "—"
                )}
              </Row>
            )}
            {bookingPhoto && (
              <Row label="Ảnh đặt ship">
                <Photo src={bookingPhoto} alt={`Ảnh đặt ship ${order.code}`} testId="booking-photo" />
              </Row>
            )}
            {photo && (
              <Row label="Ảnh giao hàng">
                <Photo src={photo} alt={`Ảnh giao hàng ${order.code}`} testId="delivery-photo" />
              </Row>
            )}
            {order.fail_reason && (
              <Row label="Lý do thất bại">
                <span className="text-destructive">{order.fail_reason}</span>
              </Row>
            )}
            {order.status === "ready" && order.return_reason && (
              <Row label="Tài xế trả đơn">
                <Returned order={order} />
              </Row>
            )}
          </dl>
        </Section>

        <Section title="NVKD & hoa hồng">
          <dl className="text-sm">
            <Row label="NVKD phụ trách">
              {owner
                ? `${owner.name} (${owner.ref_code})`
                : "Không có (khách vãng lai)"}
            </Row>
            <Row label="Đơn tính cho">{order.sale?.name ?? "—"}</Row>
            <Row label="Người tạo đơn">
              {creatorLabel}
            </Row>
            <Row label="% hoa hồng">
              {owner?.commission_pct != null ? `${owner.commission_pct}%` : "—"}
            </Row>
            <Row label="Hoa hồng đơn này">
              {commission != null ? (
                formatVnd(commission)
              ) : (
                <span className="text-muted-foreground">
                  Chỉ tính khi đơn đã giao
                </span>
              )}
            </Row>
          </dl>
        </Section>
      </div>

      <div className="mt-4 grid gap-4">
        {office && <PaymentPanel order={order} />}
        {office && <ShippingInfo order={order} editable={admin} />}
        <Section title="Hàng hóa & giá">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sản phẩm</TableHead>
                <TableHead className="text-right">Kg</TableHead>
                <TableHead className="text-right">Giá/kg</TableHead>
                <TableHead className="text-right">Thành tiền</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>
                    {lineLabel(
                      i.products?.name ?? "?",
                      i.pack_name,
                      i.pack_qty,
                      i.qty_kg,
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatKg(i.qty_kg)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatVnd(i.price_per_kg)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatVnd(i.line_total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell>Tổng</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatKg(kg)}
                </TableCell>
                <TableCell />
                <TableCell className="text-right tabular-nums">
                  {formatVnd(order.total)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </Section>

        <div className={office ? "grid gap-4 lg:grid-cols-2" : "grid gap-4"}>
          <Section title="Tiến trình">
            <ol className="space-y-3 text-sm">
              {timeline.map((t) => (
                <li key={t.label} className="flex gap-3">
                  <span
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${t.at || t.done ? "bg-primary" : "bg-border"}`}
                  />
                  <div>
                    <div className="font-medium">
                      {t.label}{" "}
                      {t.at && (
                        <span className="font-normal text-muted-foreground">
                          · {t.at}
                        </span>
                      )}
                    </div>
                    {t.note && (
                      <div className="text-muted-foreground">{t.note}</div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          {office && (
            <Section title={`Hàng đặt xưởng ngày ${order.production_date}`}>
              {jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Chưa gửi đơn cho xưởng ngày này.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {jobs.map((j) => (
                    <li
                      key={j.id}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <span className="font-medium">#{j.id}</span>{" "}
                      {j.products?.name} · {formatKg(j.qty_kg)} ·{" "}
                      {j.factories?.name}
                      <JobBadge status={j.status} />
                      {j.received_kg != null && (
                        <span className="text-muted-foreground">
                          Thực nhận {formatKg(j.received_kg)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Số kg gộp theo sản phẩm của cả ngày, gồm cả hàng của đơn khác.
              </p>
            </Section>
          )}
        </div>

        <Section title="Đơn khác của khách này">
          <Table>
            <TableBody>
              {history.map((h) => (
                <TableRow
                  key={h.code}
                  className={h.code === order.code ? "bg-muted/60" : undefined}
                >
                  <TableCell>
                    {h.code === order.code ? (
                      <b>{h.code}</b>
                    ) : (
                      <Link
                        href={`${base}/${h.code}`}
                        className="text-primary hover:underline"
                      >
                        {h.code}
                      </Link>
                    )}
                  </TableCell>
                  <TableCell>{h.production_date}</TableCell>
                  <TableCell>
                    <OrderBadge status={h.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatVnd(h.total)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {h.payment_status === "paid" ? "Đã trả" : "Chưa trả"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      </div>
    </>
  );
}

function Photo({ src, alt, testId }: { src: string; alt: string; testId: string }) {
  return (
    <a href={src} target="_blank" rel="noreferrer" className="inline-block" data-testid={testId}>
      {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
      <img src={src} alt={alt} className="max-h-48 rounded-md border object-contain" />
      <span className="mt-1 block text-primary">Xem ảnh gốc</span>
    </a>
  );
}
