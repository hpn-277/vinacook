"use client";

import Link from "next/link";
import { setCart, useCart } from "@/components/cart";
import { TierHint } from "@/components/PricingSummary";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cartLines, type CatalogProduct } from "@/lib/domain/catalog";
import { formatKg, formatVnd } from "@/lib/domain/money";
import { priceLines, type LineInput, type PricedOrder, type PriceTier, type PricingTerms } from "@/lib/domain/pricing";
import { cn } from "@/lib/utils";

/** The cart priced against the live catalog, plus `tone` to highlight the price tier the order currently lands in. */
export function useShopCart(catalog: CatalogProduct[], terms: PricingTerms) {
  const cart = useCart();
  const order = priceLines(cartLines(catalog, cart), terms);
  const setQty = (packId: number, qty: number) => setCart({ ...cart, [packId]: Math.max(0, Math.floor(qty) || 0) });
  const tier = order.lines.length ? order.tier : null;
  const tone = (t: PriceTier) => (tier === t ? "font-semibold text-foreground" : "text-muted-foreground");
  return { cart, order, setQty, tone };
}

export function Shop({ catalog, terms }: { catalog: CatalogProduct[]; terms: PricingTerms }) {
  const { cart, order } = useShopCart(catalog, terms);
  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {catalog.map((p) => {
          const packs = p.packs.reduce((n, pack) => n + (cart[pack.id] ?? 0), 0);
          return (
            <li key={p.id}>
              <Link
                href={`/products/${p.id}`}
                data-product={p.name}
                className="group block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <div className="relative">
                  <ProductImage product={p} className="aspect-square" />
                  {packs > 0 && (
                    <span className="absolute top-2 right-2 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                      {packs} đã chọn
                    </span>
                  )}
                </div>
                <div className="mt-1.5 px-0.5 text-sm leading-snug font-medium underline-offset-4 group-hover:underline">{p.name}</div>
              </Link>
            </li>
          );
        })}
      </ul>
      <CartBar order={order} terms={terms} />
    </>
  );
}

export function ProductImage({ product: p, className }: { product: CatalogProduct; className?: string }) {
  const frame = cn("w-full rounded-xl", className);
  if (!p.image_url) {
    return <div className={cn(frame, "flex items-center justify-center bg-primary/10 text-5xl font-bold text-primary")}>{p.name.charAt(0)}</div>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={p.image_url} alt={p.name} className={cn(frame, "bg-muted object-cover")} />;
}

export function CartBar({ order, terms }: { order: PricedOrder<LineInput>; terms: PricingTerms }) {
  return (
    <Card size="sm" className="sticky bottom-3 mt-4 gap-2 px-3 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">{order.lines.length ? `Tạm tính · ${formatKg(order.totalKg)}` : "Tạm tính"}</div>
          <div className="text-lg font-bold" data-testid="cart-total">
            {formatVnd(order.total)}
          </div>
        </div>
        <Button asChild size="lg" className="h-11 px-6 text-base aria-disabled:pointer-events-none aria-disabled:opacity-50">
          <Link href="/checkout" aria-disabled={order.total === 0}>
            Đặt hàng
          </Link>
        </Button>
      </div>
      <div className="border-t pt-2 text-sm">
        <TierHint order={order} terms={terms} />
      </div>
    </Card>
  );
}
