import type { ComponentProps, ReactNode } from "react";
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
