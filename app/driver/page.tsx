import { MapPinIcon, PhoneIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ActionForm } from "@/components/ActionForm";
import { StaffShell } from "@/components/StaffShell";
import { TierBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { unwrap } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { signDeliveryPhotos } from "@/lib/delivery-photos";
import { itemLabel } from "@/lib/domain/catalog";
import { formatKg, formatVnd } from "@/lib/domain/money";
import { ORDER_STATUS_LABEL } from "@/lib/domain/status";
import { dayRange, today } from "@/lib/period";
import { CompleteDelivery } from "./CompleteDelivery";
import { departOrders, failDelivery } from "./actions";

const SELECT =
  "id, code, status, phone, address, district, note, total, payment_status, price_tier, delivered_at, delivery_photo_path, customers(name), order_items(id, pack_name, pack_qty, qty_kg, products(name))";

const driverOrders = (driverId: number) => db().from("orders").select(SELECT).eq("driver_id", driverId).order("id", { referencedTable: "order_items" });
type DriverOrder = NonNullable<Awaited<ReturnType<typeof driverOrders>>["data"]>[number];

const longDate = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
const clock = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" });

export default async function DriverPage() {
  const me = await requireRole("driver");
  const day = dayRange(today());
  const [open, delivered] = await Promise.all([
    driverOrders(me.id).in("status", ["assigned", "out_for_delivery"]).order("district").order("id").then(unwrap),
    driverOrders(me.id).eq("status", "delivered").gte("delivered_at", day.from).lt("delivered_at", day.to).order("delivered_at", { ascending: false }).then(unwrap),
  ]);
  const waiting = open.filter((o) => o.status === "assigned");
  const onTheRoad = open.filter((o) => o.status === "out_for_delivery");
  const photos = await signDeliveryPhotos(delivered.flatMap((o) => (o.delivery_photo_path ? [o.delivery_photo_path] : [])));

  return (
    <StaffShell links={[{ href: "/driver", label: "Đơn cần giao" }]}>
      <header className="mb-4">
        <h1 className="text-xl font-bold tracking-tight">Đơn giao của tôi</h1>
        <p className="text-sm text-muted-foreground first-letter:uppercase">{longDate.format(new Date())}</p>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center" data-testid="driver-counts">
          <Count label={ORDER_STATUS_LABEL.assigned} value={waiting.length} />
          <Count label={ORDER_STATUS_LABEL.out_for_delivery} value={onTheRoad.length} />
          <Count label="Đã giao hôm nay" value={delivered.length} />
        </dl>
      </header>

      {waiting.length > 0 && (
        <ActionForm action={departOrders} confirm={`Xác nhận ${waiting.length} đơn đã lên xe và rời kho?`} className="mb-6">
          {waiting.map((o) => (
            <input key={o.id} type="hidden" name="order_id" value={o.id} />
          ))}
          <Button className="h-14 w-full text-base font-bold">XÁC NHẬN HÀNG ĐÃ LÊN XE ({waiting.length} đơn)</Button>
        </ActionForm>
      )}

      <Section title={ORDER_STATUS_LABEL.assigned} count={waiting.length} empty="Không có đơn chờ lên xe.">
        {waiting.map((o) => (
          <OrderCard key={o.id} order={o}>
            <ActionForm action={departOrders}>
              <input type="hidden" name="order_id" value={o.id} />
              <Button variant="outline" className="h-11 w-full">
                Lên xe
              </Button>
            </ActionForm>
          </OrderCard>
        ))}
      </Section>

      <Section title={ORDER_STATUS_LABEL.out_for_delivery} count={onTheRoad.length} empty="Không có đơn đang giao.">
        {onTheRoad.map((o) => (
          <OrderCard key={o.id} order={o}>
            <CompleteDelivery orderId={o.id} code={o.code} collect={collectLabel(o)} />
            <ActionForm action={failDelivery} className="flex gap-2">
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
          const photo = o.delivery_photo_path ? photos.get(o.delivery_photo_path) : undefined;
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

const collectLabel = (o: Pick<DriverOrder, "payment_status" | "total">) => (o.payment_status === "paid" ? "Đã thanh toán" : `Thu hộ ${formatVnd(o.total)}`);

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card px-1 py-2">
      <dd className="text-2xl font-bold tabular-nums">{value}</dd>
      <dt className="text-xs text-muted-foreground">{label}</dt>
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
  const destination = `${o.address}, ${o.district}, TP. Hồ Chí Minh`;
  const kg = o.order_items.reduce((s, i) => s + i.qty_kg, 0);
  return (
    <li>
      <Card data-order-code={o.code}>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-base">
                <b>{o.code}</b>
                <TierBadge tier={o.price_tier} />
              </span>
              <b className={o.payment_status === "paid" ? "text-green-700" : "text-primary"}>{collectLabel(o)}</b>
            </div>
            <div className="text-base font-medium">{o.customers?.name}</div>
            <div>
              {o.address}, <b>{o.district}</b>
            </div>
            {o.note && <div className="text-muted-foreground">Ghi chú: {o.note}</div>}
            <div className="text-muted-foreground">
              {o.order_items.map(itemLabel).join(", ")} · <span className="font-medium text-foreground">Tổng {formatKg(kg)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button asChild variant="outline" className="h-11">
              <a href={`tel:${o.phone}`}>
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
