import { MapPinIcon, PhoneIcon } from "lucide-react";
import { dialable, formatDestination } from "@noodle/core/domain/destination";
import type { ReactNode } from "react";
import { ActionForm } from "@/components/ActionForm";
import { StaffShell } from "@/components/StaffShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireRole } from "@/lib/auth";
import { itemLabel } from "@noodle/core/domain/catalog";
import { collectLabel } from "@noodle/core/domain/delivery";
import { formatKg } from "@noodle/core/domain/money";
import { ORDER_STATUS_LABEL } from "@noodle/core/domain/status";
import { driverBoard, type DriverOrder } from "@noodle/core/queries/driver";
import { CompleteDelivery } from "./CompleteDelivery";

const longDate = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
const clock = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" });

export default async function DriverPage() {
  const me = await requireRole("driver");
  const { waiting, onTheRoad, delivered, toLoad, kg } = await driverBoard(me.id);

  return (
    <StaffShell links={[{ href: "/driver", label: "Đơn cần giao" }]}>
      <header className="mb-4">
        <h1 className="text-xl font-bold tracking-tight">Đơn giao của tôi</h1>
        <p className="text-sm text-muted-foreground first-letter:uppercase">{longDate.format(new Date())}</p>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center" data-testid="driver-counts">
          <Count label={ORDER_STATUS_LABEL.assigned} value={waiting.length} kg={kg.waiting} />
          <Count label={ORDER_STATUS_LABEL.out_for_delivery} value={onTheRoad.length} kg={kg.onTheRoad} />
          <Count label="Đã giao hôm nay" value={delivered.length} />
        </dl>
      </header>

      {toLoad.length > 0 && (
        <Card size="sm" className="mb-3" data-testid="load-list">
          <CardContent>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <h2 className="font-semibold">Hàng cần lên xe</h2>
              <b className="text-lg tabular-nums">Tổng {formatKg(kg.waiting)}</b>
            </div>
            <ul className="divide-y text-sm">
              {toLoad.map((l) => (
                <li key={l.product} className="flex justify-between gap-3 py-1.5">
                  <div className="min-w-0">
                    <div className="font-medium">{l.product}</div>
                    <div className="text-muted-foreground">{l.packs.join(" · ")}</div>
                  </div>
                  <span className="shrink-0 font-medium tabular-nums">{formatKg(l.kg)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {waiting.length > 0 && (
        <ActionForm action="departOrders" confirm={`Xác nhận ${waiting.length} đơn đã lên xe và rời kho?`} className="mb-6">
          {waiting.map((o) => (
            <input key={o.id} type="hidden" name="order_id" value={o.id} />
          ))}
          <Button className="h-14 w-full text-base font-bold">XÁC NHẬN HÀNG ĐÃ LÊN XE ({waiting.length} đơn)</Button>
        </ActionForm>
      )}

      <Section title={ORDER_STATUS_LABEL.assigned} count={waiting.length} empty="Không có đơn chờ lên xe.">
        {waiting.map((o) => (
          <OrderCard key={o.id} order={o}>
            <ActionForm action="departOrders">
              <input type="hidden" name="order_id" value={o.id} />
              <Button variant="outline" className="h-11 w-full">
                Lên xe
              </Button>
            </ActionForm>
            <ActionForm action="returnOrder" confirm={`Trả đơn ${o.code} cho quản lý?`} className="flex gap-2">
              <input type="hidden" name="order_id" value={o.id} />
              <Input name="reason" required placeholder="Lý do trả đơn" aria-label={`Lý do trả đơn ${o.code}`} className="h-11" />
              <Button variant="outline" className="h-11 text-destructive">
                Trả đơn
              </Button>
            </ActionForm>
          </OrderCard>
        ))}
      </Section>

      <Section title={ORDER_STATUS_LABEL.out_for_delivery} count={onTheRoad.length} empty="Không có đơn đang giao.">
        {onTheRoad.map((o) => (
          <OrderCard key={o.id} order={o}>
            <CompleteDelivery orderId={o.id} code={o.code} collect={collectLabel(o)} />
            <ActionForm action="failDelivery" className="flex gap-2">
              <input type="hidden" name="order_id" value={o.id} />
              <Input name="reason" required placeholder="Lý do thất bại" aria-label={`Lý do thất bại ${o.code}`} className="h-11" />
              <Button variant="destructive" className="h-11">
                Thất bại
              </Button>
            </ActionForm>
          </OrderCard>
        ))}
      </Section>

      <Section title="Đã giao hôm nay" count={delivered.length} empty="Chưa giao đơn nào hôm nay.">
        {delivered.map((o) => {
          const { photo } = o;
          return (
            <li key={o.id}>
              <Card size="sm" data-order-code={o.code}>
                <CardContent className="flex items-center gap-3">
                  {photo ? (
                    <a href={photo} target="_blank" rel="noreferrer" className="shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
                      <img src={photo} alt={`Ảnh giao ${o.code}`} className="size-16 rounded-md object-cover" />
                    </a>
                  ) : (
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-muted text-center text-xs text-muted-foreground">Không ảnh</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <b>{o.code}</b>
                      <span className="text-muted-foreground tabular-nums">{clock.format(new Date(o.delivered_at!))}</span>
                    </div>
                    <div className="truncate">{o.customers?.name}</div>
                    <div className={o.payment_status === "paid" ? "text-green-700" : "text-muted-foreground"}>{collectLabel(o)}</div>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </Section>
    </StaffShell>
  );
}

function Count({ label, value, kg }: { label: string; value: number; kg?: number }) {
  return (
    <div className="rounded-lg border bg-card px-1 py-2">
      <dd className="text-2xl font-bold tabular-nums">{value}</dd>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      {kg !== undefined && <dd className="text-xs font-medium tabular-nums">{formatKg(kg)}</dd>}
    </div>
  );
}

function Section({ title, count, empty, children }: { title: string; count: number; empty: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 font-semibold">
        {title} ({count})
      </h2>
      {count === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : <ul className="space-y-3">{children}</ul>}
    </section>
  );
}

function OrderCard({ order: o, children }: { order: DriverOrder; children: ReactNode }) {
  const destination = formatDestination(o);
  return (
    <li>
      <Card data-order-code={o.code}>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <b className="text-base">{o.code}</b>
              <b className={o.payment_status === "paid" ? "text-green-700" : "text-primary"}>{collectLabel(o)}</b>
            </div>
            <div className="text-base font-medium">{o.customers?.name}</div>
            <div>{destination}</div>
            {o.note && <div className="text-muted-foreground">Ghi chú: {o.note}</div>}
            <div className="text-muted-foreground">
              {o.order_items.map(itemLabel).join(", ")} · <span className="font-medium text-foreground">Tổng {formatKg(o.kg)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button asChild variant="outline" className="h-11">
              <a href={`tel:${dialable(o.phone, o.country)}`}>
                <PhoneIcon /> Gọi {o.phone}
              </a>
            </Button>
            <Button asChild variant="outline" className="h-11">
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`} target="_blank" rel="noreferrer">
                <MapPinIcon /> Chỉ đường
              </a>
            </Button>
          </div>
          {children}
        </CardContent>
      </Card>
    </li>
  );
}
