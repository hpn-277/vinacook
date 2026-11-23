"use client";

import Link from "next/link";
import { useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** "Gửi đơn cho xưởng". While the day still has unreviewed orders it explains why it can't send instead of asking to confirm. */
export function SendToFactory({ date, unreviewed }: { date: string; unreviewed: number }) {
  const [open, setOpen] = useState(false);
  if (unreviewed === 0) {
    return (
      <ActionForm action="closeDay" confirm={`Gửi đơn ngày ${date} cho các xưởng?`}>
        <input type="hidden" name="date" value={date} />
        <Button>Gửi đơn cho xưởng</Button>
      </ActionForm>
    );
  }
  return (
    <>
      <Button onClick={() => setOpen(true)}>Gửi đơn cho xưởng</Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Còn {unreviewed} đơn chưa duyệt</AlertDialogTitle>
            <AlertDialogDescription>Duyệt hết đơn (hoặc đánh dấu không hợp lệ) mới gửi được cho xưởng.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Đóng</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Link href={`/admin/orders?date=${date}`}>Xem đơn chưa duyệt</Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
