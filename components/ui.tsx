import type { ComponentProps, ReactNode } from "react";
import { JOB_STATUS_LABEL, ORDER_STATUS_LABEL, type JobStatus, type OrderStatus } from "@/lib/domain/status";

const ORDER_TONE: Record<OrderStatus, string> = {
  placed: "bg-yellow-100 text-yellow-900",
  approved: "bg-blue-100 text-blue-900",
  in_production: "bg-indigo-100 text-indigo-900",
  ready: "bg-teal-100 text-teal-900",
  assigned: "bg-purple-100 text-purple-900",
  delivered: "bg-green-100 text-green-900",
  failed: "bg-red-100 text-red-900",
  cancelled: "bg-gray-200 text-gray-700",
};

const JOB_TONE: Record<JobStatus, string> = {
  assigned: "bg-yellow-100 text-yellow-900",
  accepted: "bg-blue-100 text-blue-900",
  rejected: "bg-red-100 text-red-900",
  shipped: "bg-purple-100 text-purple-900",
  received: "bg-green-100 text-green-900",
};

export function OrderBadge({ status }: { status: OrderStatus }) {
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${ORDER_TONE[status]}`}>{ORDER_STATUS_LABEL[status]}</span>;
}

export function JobBadge({ status }: { status: JobStatus }) {
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${JOB_TONE[status]}`}>{JOB_STATUS_LABEL[status]}</span>;
}

const BUTTON_TONE = {
  primary: "bg-orange-600 text-white hover:bg-orange-700",
  secondary: "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
} as const;

export function Button({ tone = "primary", className = "", ...props }: ComponentProps<"button"> & { tone?: keyof typeof BUTTON_TONE }) {
  return (
    <button
      className={`rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 ${BUTTON_TONE[tone]} ${className}`}
      {...props}
    />
  );
}

export const inputClass = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${className}`} {...props} />;
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="mb-4 text-xl font-bold">{children}</h1>;
}
