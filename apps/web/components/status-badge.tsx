import { Badge } from "@/components/ui/badge";
import type { PriceTier } from "@noodle/core/domain/pricing";
import { JOB_STATUS_LABEL, ORDER_STATUS_LABEL, PRODUCT_STATUS_LABEL, type JobStatus, type OrderStatus, type ProductStatus } from "@noodle/core/domain/status";

const ORDER_TONE: Record<OrderStatus, string> = {
  placed: "bg-yellow-100 text-yellow-900",
  in_production: "bg-indigo-100 text-indigo-900",
  ready: "bg-teal-100 text-teal-900",
  assigned: "bg-purple-100 text-purple-900",
  out_for_delivery: "bg-blue-100 text-blue-900",
  delivered: "bg-green-100 text-green-900",
  failed: "bg-red-100 text-red-900",
  cancelled: "bg-muted text-muted-foreground",
};

const JOB_TONE: Record<JobStatus, string> = {
  producing: "bg-indigo-100 text-indigo-900",
  received: "bg-teal-100 text-teal-900",
};

export function OrderBadge({ status }: { status: OrderStatus }) {
  return <Badge className={ORDER_TONE[status]}>{ORDER_STATUS_LABEL[status]}</Badge>;
}

export function JobBadge({ status }: { status: JobStatus }) {
  return <Badge className={JOB_TONE[status]}>{JOB_STATUS_LABEL[status]}</Badge>;
}

const PRODUCT_TONE: Record<ProductStatus, string> = {
  pending: "bg-yellow-100 text-yellow-900",
  approved: "bg-green-100 text-green-900",
  rejected: "bg-red-100 text-red-900",
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return <Badge className={PRODUCT_TONE[status]}>{PRODUCT_STATUS_LABEL[status]}</Badge>;
}

const TIER: Record<PriceTier, { label: string; tone: string }> = {
  si: { label: "Sỉ", tone: "bg-emerald-100 text-emerald-900" },
  le: { label: "Lẻ", tone: "bg-orange-100 text-orange-900" },
};

export function TierBadge({ tier }: { tier: PriceTier }) {
  return (
    <Badge className={TIER[tier].tone} data-tier={tier}>
      {TIER[tier].label}
    </Badge>
  );
}
