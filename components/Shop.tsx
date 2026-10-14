"use client";

import { Minus, Plus } from "lucide-react";
import Link from "next/link";
import { setCart, useCart } from "@/components/cart";
import { TierHint } from "@/components/PricingSummary";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cartLines, type CatalogProduct } from "@/lib/domain/catalog";
import { formatKg, formatVnd } from "@/lib/domain/money";
import { packPrice, priceLines, retailPerKg, type PriceTier, type PricingTerms } from "@/lib/domain/pricing";

export function Shop({ catalog, terms }: { catalog: CatalogProduct[]; terms: PricingTerms }) {
  const cart = useCart();
  const order = priceLines(cartLines(catalog, cart), terms);
  const setQty = (packId: number, qty: number) => setCart({ ...cart, [packId]: Math.max(0, Math.floor(qty) || 0) });

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2">
        {catalog.map((p) => (
          <li key={p.id}>
            <ProductCard product={p} terms={terms} tier={order.lines.length ? order.tier : null} cart={cart} setQty={setQty} />
          </li>
        ))}
      </ul>
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
    </>
  );
}

function ProductCard({
  product: p,
  terms,
  tier,
  cart,
  setQty,
}: {
  product: CatalogProduct;
  terms: PricingTerms;
  tier: PriceTier | null;
  cart: Record<string, number>;
  setQty: (packId: number, qty: number) => void;
}) {
  const retail = retailPerKg(p.price_per_kg, terms.retailMarkupPct);
  const tone = (t: PriceTier) => (tier === t ? "font-semibold text-foreground" : "text-muted-foreground");
  return (
    <Card size="sm" className="h-full gap-2 px-3" data-product={p.name}>
      <div className="flex items-center gap-3">
        {p.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image_url} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xl font-bold text-primary">
            {p.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-base font-semibold">{p.name}</div>
          <div className="text-sm">
            <span className={tone("si")}>Sỉ {formatVnd(p.price_per_kg)}/kg</span>
            <span className="text-muted-foreground"> · </span>
            <span className={tone("le")}>Lẻ {formatVnd(retail)}/kg</span>
          </div>
        </div>
      </div>
      <ul className="divide-y rounded-lg border">
        {p.packs.map((pack) => (
          <li key={pack.id} className="flex items-center gap-2 px-2 py-1.5">
            <div className="min-w-0 flex-1 leading-tight">
              <div className="font-medium">
                {pack.name} <span className="font-normal text-muted-foreground">{formatKg(pack.kg_per_unit)}</span>
              </div>
              <div className="text-xs">
                <span className={tone("si")}>Sỉ {formatVnd(packPrice(pack.kg_per_unit, p.price_per_kg))}</span>
                <span className="text-muted-foreground"> · </span>
                <span className={tone("le")}>Lẻ {formatVnd(packPrice(pack.kg_per_unit, retail))}</span>
              </div>
            </div>
            <QtyStepper label={`${p.name} - ${pack.name}`} value={cart[pack.id] ?? 0} onChange={(q) => setQty(pack.id, q)} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function QtyStepper({ label, value, onChange }: { label: string; value: number; onChange: (qty: number) => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button type="button" variant="outline" size="icon" aria-label={`Bớt ${label}`} disabled={value === 0} onClick={() => onChange(value - 1)}>
        <Minus />
      </Button>
      <Input
        aria-label={`Số lượng ${label}`}
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        value={value || ""}
        placeholder="0"
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9 w-12 px-1 text-center"
      />
      <Button type="button" variant="outline" size="icon" aria-label={`Thêm ${label}`} onClick={() => onChange(value + 1)}>
        <Plus />
      </Button>
    </div>
  );
}
