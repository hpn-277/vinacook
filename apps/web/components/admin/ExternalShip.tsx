"use client";

import { useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { ImageFileInput } from "@/components/ImageFileInput";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { OrderStatus } from "@noodle/core/domain/status";

const CARRIERS = ["Grab", "Ahamove", "Lalamove", "Be", "Xanh SM"];
/** Screenshots must stay readable, so photos keep more pixels than product images. */
const PHOTO_SIDE = 1600;

type Order = { id: number; code: string; status: OrderStatus; ship_carrier: string | null };

/** "Ship ngoài" buttons for the admin and manager: book a carrier for a received order, then mark it delivered or failed. */
export function ExternalShip({ order }: { order: Order }) {
  if (order.status === "ready") return <BookShip order={order} />;
  if (order.status === "out_for_delivery" && order.ship_carrier) {
    return (
      <div className="flex flex-wrap gap-2">
        <ShipDelivered order={order} />
        <ShipFailed order={order} />
      </div>
    );
  }
  return null;
}

function BookShip({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  const form = `book-ship-${order.id}`;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Đặt ship ngoài</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đặt ship ngoài đơn {order.code}</DialogTitle>
          <DialogDescription>Đơn chuyển sang Đang giao. Ảnh đặt ship được lưu làm bằng chứng.</DialogDescription>
        </DialogHeader>
        <ActionForm id={form} action="bookShip" onSuccess={() => setOpen(false)}>
          <input type="hidden" name="order_id" value={order.id} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${form}-carrier`}>Hãng ship</FieldLabel>
              <Input id={`${form}-carrier`} name="carrier" required maxLength={100} list={`${form}-carriers`} placeholder="Grab, Ahamove…" />
              <datalist id={`${form}-carriers`}>
                {CARRIERS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${form}-fee`}>Phí ship (đ)</FieldLabel>
              <Input id={`${form}-fee`} name="fee" type="number" inputMode="numeric" min={0} step={1000} placeholder="35000" />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${form}-note`}>Ghi chú</FieldLabel>
              <Textarea id={`${form}-note`} name="note" rows={2} maxLength={500} placeholder="Mã vận đơn, SĐT shipper…" />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${form}-photo`}>Ảnh đặt ship</FieldLabel>
              <ImageFileInput id={`${form}-photo`} form={form} name="photo" label="Ảnh đặt ship" maxSide={PHOTO_SIDE} />
            </Field>
            <Button type="submit">Đặt ship</Button>
          </FieldGroup>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

function ShipDelivered({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  const form = `ship-delivered-${order.id}`;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Đã giao</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {order.ship_carrier} đã giao đơn {order.code}
          </DialogTitle>
          <DialogDescription>Ảnh giao hàng được lưu làm bằng chứng.</DialogDescription>
        </DialogHeader>
        <ActionForm id={form} action="shipDelivered" onSuccess={() => setOpen(false)}>
          <input type="hidden" name="order_id" value={order.id} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${form}-photo`}>Ảnh giao hàng</FieldLabel>
              <ImageFileInput id={`${form}-photo`} form={form} name="photo" label="Ảnh giao hàng" maxSide={PHOTO_SIDE} />
            </Field>
            <Button type="submit">Xác nhận đã giao</Button>
          </FieldGroup>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

function ShipFailed({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Giao thất bại</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đơn {order.code} giao thất bại</DialogTitle>
        </DialogHeader>
        <ActionForm action="shipFailed" onSuccess={() => setOpen(false)}>
          <input type="hidden" name="order_id" value={order.id} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`ship-fail-${order.id}`}>Lý do</FieldLabel>
              <Textarea id={`ship-fail-${order.id}`} name="reason" rows={2} required maxLength={500} />
            </Field>
            <Button type="submit" variant="destructive">
              Xác nhận thất bại
            </Button>
          </FieldGroup>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
