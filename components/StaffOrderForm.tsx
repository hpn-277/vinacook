"use client";

import { Search, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ActionForm } from "@/components/ActionForm";
import { TierHint } from "@/components/PricingSummary";
import { QtyStepper } from "@/components/QtyStepper";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ActionResult } from "@/lib/action";
import { cartLines, packSize, type Cart, type CatalogProduct } from "@/lib/domain/catalog";
import { formatKg, formatVnd } from "@/lib/domain/money";
import { priceLines, retailPerKg, type PricingTerms } from "@/lib/domain/pricing";

/** "Mì Trứng" and "mi trung" match: lowercase, accents and đ stripped. */
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/gi, "d")
    .toLowerCase();

type Props = {
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  catalog: CatalogProduct[];
  terms: PricingTerms;
  /** Customer fields, rendered server-side with the looked-up defaults. */
  children: ReactNode;
};

export function StaffOrderForm({ action, catalog, terms, children }: Props) {
  const [cart, setCart] = useState<Cart>({});
  const [query, setQuery] = useState("");
  const [onlyPicked, setOnlyPicked] = useState(false);
  const setQty = (packId: number, qty: number) => setCart((c) => ({ ...c, [packId]: Math.max(0, Math.floor(qty) || 0) }));

  const order = priceLines(cartLines(catalog, cart), terms);
  const pickedIds = new Set(order.lines.map((l) => l.product.id));
  const q = fold(query.trim());
  const shown = catalog.filter((p) => (!onlyPicked || pickedIds.has(p.id)) && (!q || fold(p.name).includes(q)));

  return (
    <ActionForm action={action} onSuccess={() => setCart({})}>
      <div className="flex flex-col gap-4">
        {children}
        <FieldSet className="gap-3">
          <FieldLegend variant="label">Sản phẩm</FieldLegend>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              placeholder="Tìm sản phẩm…"
              aria-label="Tìm sản phẩm"
              className="pr-8 pl-8"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Xoá tìm kiếm"
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={onlyPicked ? "picked" : "all"}
            onValueChange={(v) => v && setOnlyPicked(v === "picked")}
            aria-label="Lọc sản phẩm"
          >
            <ToggleGroupItem value="all">Tất cả ({catalog.length})</ToggleGroupItem>
            <ToggleGroupItem value="picked">Đã chọn ({pickedIds.size})</ToggleGroupItem>
          </ToggleGroup>
          {shown.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{onlyPicked && !q ? "Chưa chọn sản phẩm nào" : "Không tìm thấy sản phẩm"}</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {shown.map((p) => (
                <li key={p.id}>
                  <ProductRow product={p} retailMarkupPct={terms.retailMarkupPct} cart={cart} setQty={setQty} picked={pickedIds.has(p.id)} />
                </li>
              ))}
            </ul>
          )}
          {/* Every picked qty is submitted, including products the search hides. */}
          {Object.entries(cart).map(([packId, qty]) => qty > 0 && <input key={packId} type="hidden" name={`qty_${packId}`} value={qty} />)}
        </FieldSet>
        <Field>
          <FieldLabel htmlFor="order-note">Ghi chú</FieldLabel>
          <Textarea id="order-note" name="note" rows={2} />
        </Field>
        <Card size="sm" className="sticky bottom-3 gap-2 px-3 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground">{order.lines.length ? `Tạm tính · ${formatKg(order.totalKg)}` : "Tạm tính"}</div>
              <div className="text-lg font-bold">{formatVnd(order.total)}</div>
            </div>
            <Button type="submit" size="lg" className="h-11 px-6 text-base" disabled={order.lines.length === 0}>
              Tạo đơn
            </Button>
          </div>
          <div className="border-t pt-2 text-sm">
            <TierHint order={order} terms={terms} />
          </div>
        </Card>
      </div>
    </ActionForm>
  );
}

function ProductRow({
  product: p,
  retailMarkupPct,
  cart,
  setQty,
  picked,
}: {
  product: CatalogProduct;
  retailMarkupPct: number;
  cart: Cart;
  setQty: (packId: number, qty: number) => void;
  picked: boolean;
}) {
  return (
    <Card size="sm" className={`h-full gap-2 px-3 ${picked ? "ring-2 ring-primary" : ""}`} data-product={p.name}>
      <div className="flex items-center gap-3">
        {p.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image_url} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xl font-bold text-primary">{p.name.charAt(0)}</div>
        )}
        <div className="min-w-0">
          <div className="font-semibold">{p.name}</div>
          <div className="text-xs text-muted-foreground">
            Sỉ {formatVnd(p.price_per_kg)}/kg · Lẻ {formatVnd(retailPerKg(p.price_per_kg, retailMarkupPct))}/kg
          </div>
        </div>
      </div>
      <ul className="divide-y rounded-lg border">
        {p.packs.map((pack) => (
          <li key={pack.id} className="flex items-center justify-between gap-2 px-2 py-1">
            <span className="flex items-center gap-2 text-sm">
              {pack.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pack.image_url} alt="" className="size-7 shrink-0 object-contain" />
              )}
              {packSize(pack)}
            </span>
            <QtyStepper label={`${p.name} - ${packSize(pack)}`} value={cart[pack.id] ?? 0} onChange={(q) => setQty(pack.id, q)} />
          </li>
        ))}
      </ul>
    </Card>
  );
}
