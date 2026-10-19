"use client";

import { CameraIcon } from "lucide-react";
import { startTransition, useActionState, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { downscale } from "@/lib/downscale";
import { completeDelivery } from "./actions";

const MAX_SIDE = 1600;

export function CompleteDelivery({ orderId, code, collect }: { orderId: number; code: string; collect: string }) {
  const [state, formAction, pending] = useActionState(completeDelivery, null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function pick(file: File | undefined) {
    setPhotoError(null);
    if (!file) return;
    try {
      const blob = await downscale(file, MAX_SIDE);
      setPhoto(blob);
      setPreview(URL.createObjectURL(blob));
    } catch {
      setPhoto(null);
      setPreview(null);
      setPhotoError("Không đọc được ảnh, hãy chụp lại");
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="h-14 w-full text-base font-bold">HOÀN THÀNH GIAO HÀNG</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hoàn thành đơn {code}</DialogTitle>
          <DialogDescription>{collect}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData();
            fd.set("order_id", String(orderId));
            if (photo) fd.set("photo", photo, `${code}.jpg`);
            startTransition(() => formAction(fd));
          }}
        >
          <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border border-dashed bg-muted/40 px-4 text-center text-sm text-muted-foreground">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local blob preview
              <img src={preview} alt="Ảnh bằng chứng giao hàng" className="max-h-64 w-full object-contain" />
            ) : (
              <>
                <CameraIcon className="size-8" />
                Chụp phiếu ký nhận hoặc ảnh hàng tại điểm nhận (không bắt buộc)
              </>
            )}
            <input type="file" accept="image/*" capture="environment" aria-label="Ảnh bằng chứng giao hàng" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
          </label>
          {preview && <p className="text-center text-xs text-muted-foreground">Bấm vào ảnh để chụp lại</p>}
          {(photoError || (state && !state.ok)) && (
            <Alert variant="destructive">
              <AlertDescription>{photoError ?? (state && !state.ok ? state.error : null)}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-11">
                Quay lại
              </Button>
            </DialogClose>
            <Button type="submit" className="h-11" disabled={pending}>
              {pending ? "Đang lưu..." : "Xác nhận đã giao"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
