"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { OrderBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ageTone, NO_SETTLE_RIGHTS, type AgeTone } from "@noodle/core/domain/debt";
import { formatVnd } from "@noodle/core/domain/money";
import type { OrderStatus } from "@noodle/core/domain/status";

export type DebtOrderRow = { id: number; code: string; status: OrderStatus; total: number; production_date: string; driver: string | null; age: number };
export type DebtCustomer = { id: number; name: string; phone: string; district: string; sale: string | null; total: number; oldest: number; orders: DebtOrderRow[] };

const AGE_TONE: Record<AgeTone, string> = {
  ok: "text-muted-foreground",
  overdue: "font-medium text-amber-700",
  late: "font-semibold text-destructive",
};

/** Columns that fold under the order code on phones, so amount and age stay on screen. */
const WIDE = "hidden md:table-cell";

function Age({ days }: { days: number }) {
  return <span className={`tabular-nums ${AGE_TONE[ageTone(days)]}`}>{days} ngày</span>;
}

/** Công nợ grouped by customer. The cashier ticks orders and confirms them paid in one go; anyone else sees it disabled. */
export function DebtTable({ customers, canSettle }: { customers: DebtCustomer[]; canSettle: boolean }) {
  const [picked, setPicked] = useState<ReadonlySet<number>>(new Set());
  const rows = customers.flatMap((c) => c.orders);
  const selected = rows.filter((o) => picked.has(o.id));
  const selectedTotal = selected.reduce((s, o) => s + o.total, 0);
  const lockedTitle = canSettle ? undefined : NO_SETTLE_RIGHTS;

  const toggle = (ids: number[], on: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  if (customers.length === 0) {
    return (
      <Card size="sm">
        <CardContent className="py-6 text-center text-sm text-muted-foreground">Không có công nợ nào khớp bộ lọc.</CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card size="sm" className="mb-3 border-primary/30 bg-primary/5" data-testid="settle-bar">
        <CardContent className="space-y-2">
          <ActionForm
            action="setPayment"
            confirm={`Xác nhận đã thu ${selected.length} đơn, tổng ${formatVnd(selectedTotal)}?`}
            className="flex flex-wrap items-center gap-2"
          >
            {selected.map((o) => (
              <input key={o.id} type="hidden" name="order_id" value={o.id} />
            ))}
            <input type="hidden" name="paid" value="paid" />
            <Input name="note" maxLength={500} disabled={!canSettle} placeholder="Ghi chú (không bắt buộc)" aria-label="Ghi chú thu tiền" className="w-full sm:w-64" />
            <span title={lockedTitle} className="w-full sm:w-auto">
              <Button disabled={!canSettle || selected.length === 0} className="w-full sm:w-auto">
                Xác nhận đã thu ({selected.length} đơn · {formatVnd(selectedTotal)})
              </Button>
            </span>
          </ActionForm>
          <p className="text-xs text-muted-foreground">
            {canSettle ? "Tick từng đơn hoặc chọn hết đơn của một khách, rồi xác nhận khi đã nhận đủ tiền." : `${NO_SETTLE_RIGHTS}. Chỉ thủ quỹ được xác nhận đã thu.`}
          </p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Mã</TableHead>
                <TableHead className={WIDE}>Ngày SX</TableHead>
                <TableHead className={WIDE}>Trạng thái</TableHead>
                <TableHead className={WIDE}>Tài xế</TableHead>
                <TableHead className="text-right">Số tiền</TableHead>
                <TableHead className="text-right">Tuổi nợ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => {
                const ids = c.orders.map((o) => o.id);
                const n = ids.filter((id) => picked.has(id)).length;
                return (
                  <Fragment key={c.id}>
                    <TableRow className="bg-muted/60 hover:bg-muted/60" data-customer={c.name}>
                      <TableCell>
                        <Checkbox
                          checked={n === 0 ? false : n === ids.length ? true : "indeterminate"}
                          onCheckedChange={(v) => toggle(ids, v === true)}
                          disabled={!canSettle}
                          title={lockedTitle ?? "Chọn hết đơn của khách này"}
                          aria-label={`Chọn hết đơn của ${c.name}`}
                        />
                      </TableCell>
                      {[`${WIDE} whitespace-normal`, "whitespace-normal md:hidden"].map((cls, i) => (
                        <TableCell key={cls} colSpan={i === 0 ? 4 : 1} className={cls}>
                          <div className="font-semibold">{c.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {c.phone} · {c.district} · NVKD: {c.sale ?? "không có"}
                          </div>
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <div className="font-semibold tabular-nums">{formatVnd(c.total)}</div>
                        <div className="text-xs text-muted-foreground">{c.orders.length} đơn</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Age days={c.oldest} />
                        <div className="text-xs text-muted-foreground">lâu nhất</div>
                      </TableCell>
                    </TableRow>
                    {c.orders.map((o) => (
                      <TableRow key={o.id} data-order-code={o.code}>
                        <TableCell>
                          <Checkbox
                            checked={picked.has(o.id)}
                            onCheckedChange={(v) => toggle([o.id], v === true)}
                            disabled={!canSettle}
                            title={lockedTitle}
                            aria-label={`Chọn ${o.code}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Link href={`/finance/orders/${o.code}`} className="font-semibold text-primary hover:underline">
                            {o.code}
                          </Link>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground md:hidden">
                            {o.production_date}
                            <OrderBadge status={o.status} />
                            {o.driver}
                          </div>
                        </TableCell>
                        <TableCell className={`${WIDE} tabular-nums`}>{o.production_date}</TableCell>
                        <TableCell className={WIDE}>
                          <OrderBadge status={o.status} />
                        </TableCell>
                        <TableCell className={WIDE}>{o.driver ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatVnd(o.total)}</TableCell>
                        <TableCell className="text-right">
                          <Age days={o.age} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                {[WIDE, "md:hidden"].map((cls, i) => (
                  <TableCell key={cls} colSpan={i === 0 ? 5 : 2} className={cls}>
                    {customers.length} khách · {rows.length} đơn
                  </TableCell>
                ))}
                <TableCell className="text-right tabular-nums">{formatVnd(rows.reduce((s, o) => s + o.total, 0))}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
