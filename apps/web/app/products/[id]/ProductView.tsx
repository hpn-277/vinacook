"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { QtyStepper } from "@/components/QtyStepper";
import { CartBar, ProductImage, useShopCart } from "@/components/shop/Shop";
import { Card } from "@/components/ui/card";
import { packCaption, packSize, priceRangeLabel, type CatalogProduct } from "@noodle/core/domain/catalog";
import { formatVnd } from "@noodle/core/domain/money";
import { packPrice } from "@noodle/core/domain/pricing";

/** `catalog` prices the whole cart, which may hold other products too. */
export function ProductView({ product: p, catalog }: { product: CatalogProduct; catalog: CatalogProduct[] }) {
  const { cart, order, setQty } = useShopCart(catalog);
  return (
    <>
      <Link href="/" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        Tất cả sản phẩm
      </Link>
      <div className="grid gap-4 sm:grid-cols-2">
        <ProductImage product={p} className="aspect-4/3" />
        <div>
          <h1 className="text-xl font-bold tracking-tight">{p.name}</h1>
          <div className="mt-1 text-sm text-muted-foreground">{priceRangeLabel(p.packs.map((pack) => pack.price_per_kg))}</div>
          {p.description && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.description}</p>}
        </div>
      </div>
      <h2 className="mt-6 mb-2 font-semibold">Chọn quy cách</h2>
      <ul className="grid gap-2">
        {p.packs.map((pack) => {
          const qty = cart[pack.id] ?? 0;
          return (
            <li key={pack.id}>
              <Card size="sm" className={`flex-row items-center gap-3 px-3 ${qty > 0 ? "ring-2 ring-primary" : ""}`} data-pack={packSize(pack)}>
                {pack.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pack.image_url} alt="" className="size-14 shrink-0 rounded-lg bg-muted object-contain p-1" />
                )}
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="font-medium">{packCaption(pack)}</div>
                  <div className="mt-0.5 text-sm font-semibold" data-testid="pack-price">
                    {formatVnd(packPrice(pack.kg_per_unit, pack.price_per_kg))}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">({formatVnd(pack.price_per_kg)}/kg)</span>
                  </div>
                </div>
                <QtyStepper label={`${p.name} - ${packSize(pack)}`} value={qty} onChange={(q) => setQty(pack.id, q)} />
              </Card>
            </li>
          );
        })}
      </ul>
      <CartBar order={order} />
    </>
  );
}
