import { Hono } from "hono";
import { z } from "zod";
import { DomainError, unwrap } from "@noodle/core/action";
import { db } from "@noodle/core/db";
import { id } from "@noodle/core/form";
import { role, valid, type ApiEnv } from "../http";
import { removeDeliveryPhoto, uploadDeliveryPhoto } from "../lib/delivery-photos";
import { transition } from "../lib/transition";

const orderParam = valid("param", z.object({ id }));
const photo = (missing: string) => z.instanceof(File, { message: missing }).refine((f) => f.size > 0, missing);

/** Throws unless the order is out with an outside carrier, i.e. booked here rather than given to a driver. */
async function shippedOrder(orderId: number) {
  const order = unwrap(await db().from("orders").select("code, ship_carrier").eq("id", orderId).maybeSingle());
  if (!order?.ship_carrier) throw new DomainError("Đơn này không giao bằng ship ngoài");
  return order;
}

/** Stores the photo, runs `move`, and removes the photo again if the move is refused. */
async function withPhoto(bucket: ApiEnv["Bindings"]["FILES"], orderId: number, file: File, move: (path: string) => Promise<void>) {
  const path = (await uploadDeliveryPhoto(bucket, orderId, file))!;
  try {
    await move(path);
  } catch (e) {
    await removeDeliveryPhoto(bucket, path);
    throw e;
  }
}

/**
 * "Ship ngoài": the admin or manager sends a received order with an outside carrier instead of a driver.
 * Booking needs the carrier's booking screenshot, delivering needs the delivery photo; both stay on the order as proof.
 */
export const ship = new Hono<ApiEnv>()
  .use(role("admin", "manager"))
  .post(
    "/:id/book",
    orderParam,
    valid(
      "form",
      z.object({
        carrier: z.string().trim().min(1, "Nhập hãng ship").max(100),
        fee: z.union([z.literal(""), z.coerce.number().int("Phí ship không hợp lệ").min(0, "Phí ship không hợp lệ")]).optional(),
        note: z.string().trim().max(500).optional(),
        photo: photo("Chụp ảnh đặt ship"),
      }),
    ),
    async (c) => {
      const { id: orderId } = c.req.valid("param");
      const { carrier, fee, note, photo: file } = c.req.valid("form");
      await withPhoto(c.env.FILES, orderId, file, (path) =>
        transition("orders", orderId, "out_for_delivery", {
          patch: {
            ship_carrier: carrier,
            ship_fee: fee === "" || fee === undefined ? null : fee,
            ship_note: note || null,
            ship_booking_photo_path: path,
            departed_at: new Date().toISOString(),
            returned_by: null,
            return_reason: null,
          },
        }),
      );
      return c.json({ message: `Đã đặt ship ${carrier}` });
    },
  )
  .post("/:id/delivered", orderParam, valid("form", z.object({ photo: photo("Chụp ảnh giao hàng") })), async (c) => {
    const { id: orderId } = c.req.valid("param");
    const { code } = await shippedOrder(orderId);
    await withPhoto(c.env.FILES, orderId, c.req.valid("form").photo, (path) =>
      transition("orders", orderId, "delivered", { patch: { delivered_at: new Date().toISOString(), delivery_photo_path: path } }),
    );
    return c.json({ message: `Đơn ${code} đã giao` });
  })
  .post("/:id/fail", orderParam, valid("json", z.object({ reason: z.string().trim().min(1, "Nhập lý do giao thất bại").max(500) })), async (c) => {
    const { id: orderId } = c.req.valid("param");
    const { code } = await shippedOrder(orderId);
    await transition("orders", orderId, "failed", { patch: { fail_reason: c.req.valid("json").reason } });
    return c.json({ message: `Đơn ${code} giao thất bại` });
  });
