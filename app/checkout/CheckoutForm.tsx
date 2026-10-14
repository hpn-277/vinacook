"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { setCart, useCart } from "@/components/cart";
import { Button, Field, inputClass } from "@/components/ui";
import type { ActionResult } from "@/lib/action";
import { DISTRICTS } from "@/lib/domain/districts";
import { formatKg, formatVnd, lineTotal } from "@/lib/domain/money";

type Product = { id: number; name: string; price_per_kg: number };

export function CheckoutForm({
  products,
  action,
}: {
  products: Product[];
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
}) {
  const cart = useCart();
  const [state, formAction, pending] = useActionState(action, null);
  useEffect(() => {
    if (state?.ok) setCart({});
  }, [state]);

  if (state?.ok) {
    return (
      <div role="status" className="space-y-3 rounded-xl border border-green-300 bg-green-50 p-4">
        <p className="font-semibold text-green-800">{state.message}</p>
        <Link href="/orders" className="underline">
          Tra cứu đơn hàng
        </Link>
      </div>
    );
  }

  const lines = products.filter((p) => (cart[p.id] ?? 0) > 0);
  const total = lines.reduce((s, p) => s + lineTotal(cart[p.id], p.price_per_kg), 0);
  if (lines.length === 0) {
    return (
      <p>
        Giỏ hàng trống.{" "}
        <Link href="/" className="underline">
          Chọn sản phẩm
        </Link>
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
        {lines.map((p) => (
          <li key={p.id} className="flex justify-between p-3 text-sm">
            <span>
              {p.name} × {formatKg(cart[p.id])}
            </span>
            <span>{formatVnd(lineTotal(cart[p.id], p.price_per_kg))}</span>
          </li>
        ))}
        <li className="flex justify-between p-3 font-semibold">
          <span>Tổng</span>
          <span>{formatVnd(total)}</span>
        </li>
      </ul>
      <input type="hidden" name="items" value={JSON.stringify(lines.map((p) => ({ product_id: p.id, qty_kg: cart[p.id] })))} />
      <fieldset disabled={pending} className="space-y-3">
        <Field label="Họ tên">
          <input name="name" required className={inputClass} />
        </Field>
        <Field label="Số điện thoại">
          <input name="phone" type="tel" inputMode="tel" required className={inputClass} />
        </Field>
        <Field label="Địa chỉ">
          <input name="address" required className={inputClass} />
        </Field>
        <Field label="Quận/Huyện">
          <select name="district" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Chọn quận/huyện
            </option>
            {DISTRICTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </Field>
        <Field label="Ghi chú">
          <textarea name="note" rows={2} className={inputClass} />
        </Field>
        <Button type="submit" className="w-full py-3 text-base">
          Xác nhận đặt hàng
        </Button>
      </fieldset>
      {state && !state.ok && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
