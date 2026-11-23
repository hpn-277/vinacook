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
import { moveLabel, type OrderStatus } from "@noodle/core/domain/status";
import { Textarea } from "@/components/ui/textarea";

type Order = { id: number; code: string; status: OrderStatus; payment_status: "paid" | "unpaid"; total: number };
/** `reason`: the dialog asks for one and sends it as `note`. */
type Pending = { title: string; action: Mutation; fields: Record<string, string>; destructive?: boolean; reason?: boolean };

/**
 * The row's "⋯" menu: reviewing and marking paid (admin, manager, the order's sale), the status `moves` the viewer may make,
 * "Bỏ đã thu" only where `unpayHref` points at the page that takes the reason. Every action asks to confirm first.
 */
export function OrderRowMenu({ order, moves = [], unpayHref }: { order: Order; moves?: readonly OrderStatus[]; unpayHref?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, startTransition] = useTransition();

  const toReview = order.status === "pending_review";
  const canPay = order.status !== "cancelled" && order.payment_status === "unpaid";
  const canUnpay = unpayHref !== undefined && order.status !== "cancelled" && order.payment_status === "paid";

  const ask = (p: Pending) => {
    setError(null);
    setNote("");
    setPending(p);
  };
  const run = () =>
    startTransition(async () => {
      if (!pending) return;
      const fd = new FormData();
      for (const [k, v] of Object.entries(pending.fields)) fd.set(k, v);
      if (pending.reason) fd.set("note", note);
      const result = await submit(pending.action, fd);
      if (!result.ok) return setError(result.error);
      setPending(null);
      router.refresh();
    });

  if (!toReview && moves.length === 0 && !canPay && !canUnpay) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Thao tác ${order.code}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {toReview && (
            <>
              <DropdownMenuItem
                onSelect={() => ask({ title: `Duyệt đơn ${order.code}?`, action: "reviewOrder", fields: { order_id: String(order.id), decision: "approved" } })}
              >
                Duyệt
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() =>
                  ask({
                    title: `Đơn ${order.code} không hợp lệ? Đơn sẽ bị hủy.`,
                    action: "reviewOrder",
                    fields: { order_id: String(order.id), decision: "rejected" },
                    destructive: true,
                    reason: true,
                  })
                }
              >
                Không hợp lệ
              </DropdownMenuItem>
            </>
          )}
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
          {canUnpay && unpayHref && (
            <DropdownMenuItem asChild>
              <Link href={unpayHref}>Bỏ đã thu</Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && !busy && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.title}</AlertDialogTitle>
            {pending?.reason && (
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Lý do" aria-label="Lý do không hợp lệ" maxLength={500} rows={2} />
            )}
            {error && <AlertDialogDescription className="text-destructive">{error}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Quay lại</AlertDialogCancel>
            <Button variant={pending?.destructive ? "destructive" : "default"} disabled={busy || (pending?.reason && !note.trim())} onClick={run}>
              Xác nhận
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
