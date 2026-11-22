"use client";

import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { submit, type Mutation } from "@/lib/mutations";
import { formatVnd } from "@noodle/core/domain/money";
import { MANAGER_ORDER_MOVES, moveLabel, type OrderStatus } from "@noodle/core/domain/status";

type Order = { id: number; code: string; status: OrderStatus; payment_status: "paid" | "unpaid"; total: number };
type Pending = { title: string; action: Mutation; fields: Record<string, string>; destructive?: boolean };

/** The row's "⋯" menu: status moves (admin) and marking paid (admin, manager). Every action asks to confirm first. */
export function RowMenu({ order, canMove }: { order: Order; canMove: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const moves = canMove ? (MANAGER_ORDER_MOVES[order.status] ?? []) : [];
  const canPay = order.status !== "cancelled" && order.payment_status === "unpaid";
  const canUnpay = order.status !== "cancelled" && order.payment_status === "paid";

  const ask = (p: Pending) => {
    setError(null);
    setPending(p);
  };
  const run = () =>
    startTransition(async () => {
      if (!pending) return;
      const fd = new FormData();
      for (const [k, v] of Object.entries(pending.fields)) fd.set(k, v);
      const result = await submit(pending.action, fd);
      if (!result.ok) return setError(result.error);
      setPending(null);
      router.refresh();
    });

  if (moves.length === 0 && !canPay && !canUnpay) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Thao tác ${order.code}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {moves.map((to) => {
            const label = moveLabel(order.status, to);
            return (
              <DropdownMenuItem
                key={to}
                variant={to === "cancelled" ? "destructive" : "default"}
                onSelect={() => ask({ title: to === "cancelled" ? `Hủy đơn ${order.code}?` : `${label} đơn ${order.code}?`, action: "moveOrder", fields: { order_id: String(order.id), to }, destructive: to === "cancelled" })}
              >
                {label}
              </DropdownMenuItem>
            );
          })}
          {canPay && (
            <DropdownMenuItem onSelect={() => ask({ title: `Xác nhận đã thu ${formatVnd(order.total)} cho đơn ${order.code}?`, action: "setPayment", fields: { order_id: String(order.id), paid: "paid" } })}>
              Đã thu
            </DropdownMenuItem>
          )}
          {canUnpay && (
            <DropdownMenuItem asChild>
              <Link href={`/admin/orders/${order.code}#thanh-toan`}>Bỏ đã thu</Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && !busy && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.title}</AlertDialogTitle>
            {error && <AlertDialogDescription className="text-destructive">{error}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Quay lại</AlertDialogCancel>
            <Button variant={pending?.destructive ? "destructive" : "default"} disabled={busy} onClick={run}>
              Xác nhận
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
