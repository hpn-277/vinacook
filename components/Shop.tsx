"use client";

import Link from "next/link";
import { setCart, useCart } from "@/components/cart";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatVnd } from "@/lib/domain/money";

type Product = { id: number; name: string; price_per_kg: number; image_url: string | null };

export function Shop({ products }: { products: Product[] }) {
  const cart = useCart();
  const total = products.reduce((sum, p) => sum + Math.round((cart[p.id] ?? 0) * p.price_per_kg), 0);
  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2">
        {products.map((p) => (
          <li key={p.id}>
            <Card size="sm" className="flex-row items-center gap-3 px-3">
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt="" className="size-16 rounded-lg object-cover" />
              ) : (
                <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xl font-bold text-primary">
                  {p.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{p.name}</div>
                <div className="text-muted-foreground">{formatVnd(p.price_per_kg)}/kg</div>
              </div>
              <label className="flex items-center gap-1.5 text-muted-foreground">
                <Input
                  aria-label={`Số kg ${p.name}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.5}
                  value={cart[p.id] ?? ""}
                  placeholder="0"
                  onChange={(e) => setCart({ ...cart, [p.id]: Number(e.target.value) })}
                  className="h-10 w-20 text-right"
                />
                kg
              </label>
            </Card>
          </li>
        ))}
      </ul>
      <Card size="sm" className="sticky bottom-3 mt-4 flex-row items-center justify-between px-3 shadow-lg">
        <span>
          Tạm tính: <b>{formatVnd(total)}</b>
        </span>
        <Button asChild size="lg" className="px-5 aria-disabled:pointer-events-none aria-disabled:opacity-50">
          <Link href="/checkout" aria-disabled={total === 0}>
            Đặt hàng
          </Link>
        </Button>
      </Card>
    </>
  );
}
