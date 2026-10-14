"use client";

import Link from "next/link";
import { setCart, useCart } from "@/components/cart";
import { formatVnd } from "@/lib/domain/money";

type Product = { id: number; name: string; price_per_kg: number; image_url: string | null };

export function Shop({ products }: { products: Product[] }) {
  const cart = useCart();
  const total = products.reduce((sum, p) => sum + Math.round((cart[p.id] ?? 0) * p.price_per_kg), 0);
  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2">
        {products.map((p) => (
          <li key={p.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
            {p.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image_url} alt="" className="h-16 w-16 rounded-lg object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-orange-100 text-xl font-bold text-orange-700">
                {p.name.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <div className="font-semibold">{p.name}</div>
              <div className="text-sm text-gray-600">{formatVnd(p.price_per_kg)}/kg</div>
            </div>
            <label className="flex items-center gap-1 text-sm">
              <input
                aria-label={`Số kg ${p.name}`}
                type="number"
                inputMode="decimal"
                min={0}
                step={0.5}
                value={cart[p.id] ?? ""}
                placeholder="0"
                onChange={(e) => setCart({ ...cart, [p.id]: Number(e.target.value) })}
                className="w-20 rounded-lg border border-gray-300 px-2 py-2 text-right text-base"
              />
              kg
            </label>
          </li>
        ))}
      </ul>
      <div className="sticky bottom-0 mt-4 flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 shadow">
        <span>
          Tạm tính: <b>{formatVnd(total)}</b>
        </span>
        <Link
          href="/checkout"
          aria-disabled={total === 0}
          className={`rounded-lg px-4 py-2 font-medium text-white ${total === 0 ? "pointer-events-none bg-gray-400" : "bg-orange-600"}`}
        >
          Đặt hàng
        </Link>
      </div>
    </>
  );
}
