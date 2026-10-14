import { TierBadge } from "@/components/status-badge";
import { formatKg, formatVnd } from "@/lib/domain/money";
import type { LineInput, PricedOrder, PricingTerms } from "@/lib/domain/pricing";

export function wholesaleRule(terms: PricingTerms): string {
  return `Giá sỉ cho đơn từ ${formatKg(terms.wholesaleMinKg)} hoặc từ ${formatVnd(terms.wholesaleMinTotal)}`;
}

/** Which tier the cart gets and, while retail, how far it is from wholesale. */
export function TierHint({ order, terms }: { order: PricedOrder<LineInput>; terms: PricingTerms }) {
  if (order.lines.length === 0) return <span className="text-muted-foreground">{wholesaleRule(terms)}</span>;
  if (!order.toWholesale) {
    return (
      <span className="flex items-center gap-1.5 text-emerald-800" data-testid="tier-hint">
        <TierBadge tier="si" /> Đơn được giá sỉ ({formatKg(order.totalKg)})
      </span>
    );
  }
  return (
    <span className="flex items-start gap-1.5 text-orange-900" data-testid="tier-hint">
      <span className="mt-0.5 flex">
        <TierBadge tier="le" />
      </span>
      <span>
        Đặt thêm <b>{formatKg(order.toWholesale.kg)}</b> hoặc thêm {formatVnd(order.toWholesale.vnd)} để được giá sỉ
      </span>
    </span>
  );
}
