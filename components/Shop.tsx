"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { setCart, useCart } from "@/components/cart";
import { TierHint } from "@/components/PricingSummary";
import { ProductDetail, type DetailTarget } from "@/components/ProductDetail";
import { QtyStepper } from "@/components/QtyStepper";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cartLines, packSize, type CatalogPack, type CatalogProduct } from "@/lib/domain/catalog";
import { formatKg, formatVnd } from "@/lib/domain/money";
import { packPrice, priceLines, retailPerKg, type PriceTier, type PricingTerms } from "@/lib/domain/pricing";

export function Shop({ catalog, terms }: { catalog: CatalogProduct[]; terms: PricingTerms }) {
  const cart = useCart();
  const order = priceLines(cartLines(catalog, cart), terms);
  const setQty = (packId: number, qty: number) => setCart({ ...cart, [packId]: Math.max(0, Math.floor(qty) || 0) });
  const tier = order.lines.length ? order.tier : null;
  const tone = (t: PriceTier) => (tier === t ? "font-semibold text-foreground" : "text-muted-foreground");
  const [detail, setDetail] = useState<DetailTarget | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const showDetail = (product: CatalogProduct, slide: number) => {
    setDetail({ product, slide });
    setDetailOpen(true);
  };

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2">
        {catalog.map((p) => (
          <li key={p.id}>
            <ProductCard product={p} terms={terms} tone={tone} cart={cart} setQty={setQty} showDetail={(slide) => showDetail(p, slide)} />
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
      <ProductDetail
        target={detail}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        retailMarkupPct={terms.retailMarkupPct}
        tone={tone}
        cart={cart}
        setQty={setQty}
        total={order.total}
        totalKg={order.totalKg}
      />
    </>
  );
}

function ProductCard({
  product: p,
  terms,
  tone,
  cart,
  setQty,
  showDetail,
}: {
  product: CatalogProduct;
  terms: PricingTerms;
  tone: (t: PriceTier) => string;
  cart: Record<string, number>;
  setQty: (packId: number, qty: number) => void;
  showDetail: (slide: number) => void;
}) {
  const retail = retailPerKg(p.price_per_kg, terms.retailMarkupPct);
  return (
    <Card size="sm" className="h-full gap-2 px-3" data-product={p.name}>
      <button
        type="button"
        onClick={() => showDetail(0)}
        aria-label={`Xem chi tiết ${p.name}`}
        className="group -m-1 flex items-center gap-3 rounded-lg p-1 text-left outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {p.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image_url} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xl font-bold text-primary">
            {p.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-base font-semibold underline-offset-4 group-hover:underline">{p.name}</div>
          <div className="text-sm">
            <span className={tone("si")}>Sỉ {formatVnd(p.price_per_kg)}/kg</span>
            <span className="text-muted-foreground"> · </span>
            <span className={tone("le")}>Lẻ {formatVnd(retail)}/kg</span>
          </div>
        </div>
        <ChevronRight className="ml-auto size-5 shrink-0 text-muted-foreground" />
      </button>
      <ul className="divide-y rounded-lg border">
        {packGroups(p.packs).map((sizes) => (
          <PackRow key={sizes[0].name} product={p} sizes={sizes} retail={retail} tone={tone} cart={cart} setQty={setQty} showDetail={showDetail} />
        ))}
      </ul>
    </Card>
  );
}

/** Packs sharing a name (Thùng 5/10/15 kg) become one row with a size picker, so the card stays short. */
function packGroups(packs: CatalogPack[]): CatalogPack[][] {
  return [...Map.groupBy(packs, (pack) => pack.name).values()];
}

function PackRow({
  product: p,
  sizes,
  retail,
  tone,
  cart,
  setQty,
  showDetail,
}: {
  product: CatalogProduct;
  sizes: CatalogPack[];
  retail: number;
  tone: (t: PriceTier) => string;
  cart: Record<string, number>;
  setQty: (packId: number, qty: number) => void;
  showDetail: (slide: number) => void;
}) {
  const [picked, setPicked] = useState(() => (sizes.find((s) => (cart[s.id] ?? 0) > 0) ?? sizes[0]).id);
  const pack = sizes.find((s) => s.id === picked) ?? sizes[0];
  return (
    <li className="flex items-center gap-2 px-2 py-1.5">
      <div className="min-w-0 flex-1 leading-tight">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <button
            type="button"
            onClick={() => showDetail(p.packs.indexOf(pack) + 1)}
            aria-label={`Xem ${packSize(pack)} ${p.name}`}
            className="rounded-sm text-left font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {pack.name}
            {sizes.length === 1 && <span className="font-normal text-muted-foreground"> {formatKg(pack.kg_per_unit)}</span>}
          </button>
          {sizes.length > 1 && (
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              spacing={0}
              value={String(pack.id)}
              onValueChange={(v) => v && setPicked(Number(v))}
              aria-label={`Cỡ ${pack.name} ${p.name}`}
            >
              {sizes.map((s) => {
                const qty = cart[s.id] ?? 0;
                return (
                  <ToggleGroupItem key={s.id} value={String(s.id)} aria-label={packSize(s)} className="h-6 px-1.5 text-xs">
                    {formatKg(s.kg_per_unit)}
                    {qty > 0 && <span className="rounded-full bg-primary px-1 text-[10px] leading-4 text-primary-foreground">{qty}</span>}
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
          )}
        </div>
        <div className="mt-0.5 text-xs">
          <span className={tone("si")}>Sỉ {formatVnd(packPrice(pack.kg_per_unit, p.price_per_kg))}</span>
          <span className="text-muted-foreground"> · </span>
          <span className={tone("le")}>Lẻ {formatVnd(packPrice(pack.kg_per_unit, retail))}</span>
        </div>
      </div>
      <QtyStepper label={`${p.name} - ${packSize(pack)}`} value={cart[pack.id] ?? 0} onChange={(q) => setQty(pack.id, q)} />
    </li>
  );
}
