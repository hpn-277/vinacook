"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentProps } from "react";
import { rememberContact, setCart, useContact } from "@/components/shop/cart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { ReorderSource } from "@noodle/core/reorder";

/** Fills the cart with the order's packs still on sale and opens checkout for that customer at today's prices. */
export function ReorderButton({ source, ...props }: { source: ReorderSource } & ComponentProps<typeof Button>) {
  const router = useRouter();
  return (
    <Button
      type="button"
      onClick={() => {
        setCart(Object.fromEntries(source.lines.filter((l) => l.available).map((l) => [l.packId, l.packQty])));
        rememberContact(source.contact);
        const params = new URLSearchParams({ from: source.code });
        const skipped = source.lines.filter((l) => !l.available).map((l) => l.label);
        if (skipped.length > 0) params.set("skipped", skipped.join("; "));
        router.push(`/checkout?${params}`);
      }}
      {...props}
    >
      <RotateCcw data-icon="inline-start" />
      Đặt lại
    </Button>
  );
}

export function LastOrderCard() {
  const phone = useContact()?.phone;
  const [last, setLast] = useState<{ phone: string; order: ReorderSource | null } | null>(null);
  useEffect(() => {
    if (!phone) return;
    let live = true;
    api.shop["last-order"]
      .$get({ query: { phone } })
      .then((r) => (r.ok ? r.json() : null))
      .then((order) => live && setLast({ phone, order }))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [phone]);

  const order = last && last.phone === phone ? last.order : null;
  if (!order) return null;
  return (
    <Card size="sm" className="mb-4 border-primary/30 bg-primary/5 ring-primary/20" data-testid="last-order">
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="font-semibold">Đặt lại đơn gần nhất</div>
          <div className="text-muted-foreground">
            {order.code} · ngày {order.productionDate} · {order.contact.name}
          </div>
          <div className="mt-1 line-clamp-2">{order.lines.map((l) => l.label).join(", ")}</div>
        </div>
        <ReorderButton source={order} size="lg" className="h-11 px-5 text-base sm:shrink-0" />
      </CardContent>
    </Card>
  );
}
