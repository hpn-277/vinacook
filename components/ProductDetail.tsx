"use client";

import { useEffect, useState } from "react";
import { QtyStepper } from "@/components/QtyStepper";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { packCaption, type Cart, type CatalogProduct } from "@/lib/domain/catalog";
import { formatKg, formatVnd } from "@/lib/domain/money";
import { packPrice, retailPerKg, type PriceTier } from "@/lib/domain/pricing";

/** Slide 0 is the product; slide i is product.packs[i - 1]. */
export type DetailTarget = { product: CatalogProduct; slide: number };

export function ProductDetail({
  target,
  open,
  onOpenChange,
  retailMarkupPct,
  tone,
  cart,
  setQty,
  total,
  totalKg,
}: {
  target: DetailTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  retailMarkupPct: number;
  tone: (t: PriceTier) => string;
  cart: Cart;
  setQty: (packId: number, qty: number) => void;
  total: number;
  totalKg: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {target && (
        <DialogContent className="max-h-[calc(100dvh-2rem)] gap-3 overflow-y-auto sm:max-w-md">
          <Slides
            key={`${target.product.id}-${target.slide}`}
            target={target}
            retail={retailPerKg(target.product.price_per_kg, retailMarkupPct)}
            tone={tone}
            cart={cart}
            setQty={setQty}
          />
          <DialogFooter className="flex-row items-center justify-between sm:justify-between">
            <div>
              <div className="text-xs text-muted-foreground">{total ? `Tạm tính · ${formatKg(totalKg)}` : "Tạm tính"}</div>
              <div className="text-base font-bold" data-testid="detail-total">
                {formatVnd(total)}
              </div>
            </div>
            <DialogClose asChild>
              <Button size="lg" className="px-6">
                Xong
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}

function Slides({
  target: { product: p, slide: startSlide },
  retail,
  tone,
  cart,
  setQty,
}: {
  target: DetailTarget;
  retail: number;
  tone: (t: PriceTier) => string;
  cart: Cart;
  setQty: (packId: number, qty: number) => void;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(startSlide);
  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);
  const tabs = ["Giới thiệu", ...p.packs.map((pack) => pack.name)];

  return (
    <>
      <DialogHeader className="pr-8">
        <DialogTitle className="text-lg font-semibold">{p.name}</DialogTitle>
        <DialogDescription>
          <span className={tone("si")}>Sỉ {formatVnd(p.price_per_kg)}/kg</span> · <span className={tone("le")}>Lẻ {formatVnd(retail)}/kg</span>
        </DialogDescription>
      </DialogHeader>
      <Carousel setApi={setApi} opts={{ startIndex: startSlide }} aria-label={`Quy cách ${p.name}`} className="min-w-0">
        <div className="mb-3 flex items-center gap-2">
          <CarouselPrevious className="static shrink-0 translate-none" aria-label="Xem trước" />
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
            {tabs.map((tab, i) => (
              <Button
                key={tab}
                type="button"
                size="sm"
                variant={i === current ? "default" : "outline"}
                aria-current={i === current ? "true" : undefined}
                onClick={() => api?.scrollTo(i)}
                className="rounded-full"
              >
                {tab}
              </Button>
            ))}
          </div>
          <CarouselNext className="static shrink-0 translate-none" aria-label="Xem tiếp" />
        </div>
        <CarouselContent>
          <CarouselItem aria-label={`1 / ${tabs.length}: ${p.name}`}>
            <Picture src={p.image_url} alt={p.name} fallback={p.name.charAt(0)} />
            {p.description && <p className="mt-3 text-sm leading-relaxed">{p.description}</p>}
            <p className="mt-2 text-xs text-muted-foreground">Vuốt hoặc chọn quy cách để xem hàng giao tới: {p.packs.map(packCaption).join(", ")}.</p>
          </CarouselItem>
          {p.packs.map((pack, i) => (
            <CarouselItem key={pack.id} aria-label={`${i + 2} / ${tabs.length}: ${pack.name}`} data-pack-slide={pack.name}>
              <div className="relative">
                <Picture
                  src={pack.image_url ?? p.image_url}
                  alt={`${pack.name} ${p.name}, ${packCaption(pack)}`}
                  fallback={p.name.charAt(0)}
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-lg bg-linear-to-t from-black/75 via-black/45 to-transparent px-3 pt-8 pb-2.5 text-white">
                  <div className="text-xs font-medium opacity-90">{p.name}</div>
                  <div className="text-xl font-bold">{packCaption(pack)}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="text-sm leading-tight">
                  <div className={tone("si")}>Sỉ {formatVnd(packPrice(pack.kg_per_unit, p.price_per_kg))}</div>
                  <div className={tone("le")}>Lẻ {formatVnd(packPrice(pack.kg_per_unit, retail))}</div>
                </div>
                <QtyStepper
                  label={`${p.name} - ${pack.name}`}
                  scope="trong chi tiết"
                  value={cart[pack.id] ?? 0}
                  onChange={(q) => setQty(pack.id, q)}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </>
  );
}

function Picture({ src, alt, fallback }: { src: string | null; alt: string; fallback: string }) {
  const frame = "aspect-4/3 w-full rounded-lg";
  if (!src) {
    return (
      <div role="img" aria-label={alt} className={cn(frame, "flex items-center justify-center bg-primary/10 text-6xl font-bold text-primary")}>
        {fallback}
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={cn(frame, "bg-muted object-cover")} />;
}
