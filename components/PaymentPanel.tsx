import { setPayment } from "@/app/finance/actions";
import { ActionForm } from "@/components/ActionForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { unwrap } from "@/lib/action";
import { db } from "@/lib/db";
import { NO_SETTLE_RIGHTS, PAYMENT_ACTION_LABEL } from "@/lib/domain/debt";
import { formatVnd } from "@/lib/domain/money";
import type { OrderStatus } from "@/lib/domain/status";

const dateTime = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" });

type Props = {
  order: { id: number; code: string; status: OrderStatus; total: number; payment_status: "paid" | "unpaid" };
  canSettle: boolean;
};

/** "Thanh toán" on the order page: who settled it, the audit log, and the mark/undo control (cashier and manager). */
export async function PaymentPanel({ order, canSettle }: Props) {
  const [payment, events] = await Promise.all([
    db().from("orders").select("paid_at, payer:staff!orders_paid_by_fkey(name)").eq("id", order.id).single().then(unwrap),
    db()
      .from("payment_events")
      .select("id, action, amount, note, created_at, staff(name)")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .then(unwrap),
  ]);
  const paid = order.payment_status === "paid";

  return (
    <Card size="sm" id="thanh-toan" data-testid="payment-panel" className="scroll-mt-4">
      <CardHeader>
        <CardTitle>
          <h2>Thanh toán</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>
          {paid ? (
            <span className="font-medium text-green-700">Đã thu {formatVnd(order.total)}</span>
          ) : (
            <span className="font-medium">Chưa thu {formatVnd(order.total)}</span>
          )}
          {paid && (
            <span className="text-muted-foreground">
              {" · "}
              {payment.paid_at ? dateTime.format(new Date(payment.paid_at)) : "không rõ thời điểm"}
              {payment.payer && ` · ${payment.payer.name}`}
            </span>
          )}
        </p>

        {order.status === "cancelled" ? (
          <p className="text-muted-foreground">Đơn đã hủy, không thu tiền.</p>
        ) : paid ? (
          <ActionForm action={setPayment} className="flex flex-wrap items-start gap-2">
            <input type="hidden" name="order_id" value={order.id} />
            <input type="hidden" name="paid" value="unpaid" />
            <Input name="note" required disabled={!canSettle} maxLength={500} placeholder="Lý do bỏ đánh dấu (bắt buộc)" aria-label="Lý do bỏ đánh dấu" className="w-full sm:w-72" />
            <Button variant="outline" disabled={!canSettle}>
              Bỏ đánh dấu đã thu
            </Button>
          </ActionForm>
        ) : (
          <ActionForm action={setPayment} confirm={`Xác nhận đã thu ${formatVnd(order.total)} cho đơn ${order.code}?`} className="flex flex-wrap items-start gap-2">
            <input type="hidden" name="order_id" value={order.id} />
            <input type="hidden" name="paid" value="paid" />
            <Input name="note" disabled={!canSettle} maxLength={500} placeholder="Ghi chú (không bắt buộc)" aria-label="Ghi chú thu tiền" className="w-full sm:w-72" />
            <Button disabled={!canSettle}>Xác nhận đã thu</Button>
          </ActionForm>
        )}
        {!canSettle && order.status !== "cancelled" && <p className="text-xs text-muted-foreground">{NO_SETTLE_RIGHTS}.</p>}

        {events.length > 0 ? (
          <ul className="divide-y border-t">
            {events.map((e) => (
              <li key={e.id} data-payment-event={e.action} className="flex flex-wrap items-baseline gap-x-2 py-2">
                <span className={`font-medium ${e.action === "paid" ? "text-green-700" : "text-destructive"}`}>{PAYMENT_ACTION_LABEL[e.action]}</span>
                <span className="tabular-nums">{formatVnd(e.amount)}</span>
                <span className="text-muted-foreground">
                  · {e.staff?.name} · {dateTime.format(new Date(e.created_at))}
                </span>
                {e.note && <span className="w-full text-muted-foreground">Ghi chú: {e.note}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">Chưa có lần thu nào được ghi nhận.</p>
        )}
      </CardContent>
    </Card>
  );
}
