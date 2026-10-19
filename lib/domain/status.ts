export const ORDER_STATUSES = ["placed", "in_production", "ready", "assigned", "out_for_delivery", "delivered", "failed", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const JOB_STATUSES = ["producing", "received"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  placed: ["in_production", "cancelled"],
  in_production: ["ready", "placed"],
  ready: ["assigned", "placed"],
  assigned: ["out_for_delivery", "ready"],
  out_for_delivery: ["delivered", "failed"],
  delivered: [],
  failed: ["ready", "cancelled"],
  cancelled: [],
};

export const JOB_TRANSITIONS: Record<JobStatus, readonly JobStatus[]> = {
  producing: ["received"],
  received: [],
};

export const MACHINES = {
  orders: ORDER_TRANSITIONS,
  production_jobs: JOB_TRANSITIONS,
} as const;
export type Machine = keyof typeof MACHINES;
export type StatusOf<M extends Machine> = keyof (typeof MACHINES)[M] & string;

export function canTransition<M extends Machine>(machine: M, from: StatusOf<M>, to: StatusOf<M>): boolean {
  const table = MACHINES[machine] as Record<string, readonly string[]>;
  return table[from].includes(to);
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Chờ xử lý",
  in_production: "Đang sản xuất",
  ready: "Đã nhận hàng",
  assigned: "Chờ lên xe",
  out_for_delivery: "Đang giao",
  delivered: "Đã giao",
  failed: "Giao thất bại",
  cancelled: "Đã hủy",
};

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  producing: "Đang sản xuất",
  received: "Đã nhận hàng",
};

/**
 * Order edges a manager clicks directly; the others happen via close-day, receive-day, assigning a driver, the driver,
 * or reopen-day (in_production/ready -> placed, whole day only).
 */
export const MANAGER_ORDER_MOVES: Partial<Record<OrderStatus, readonly OrderStatus[]>> = {
  placed: ["cancelled"],
  assigned: ["ready"],
  failed: ["ready", "cancelled"],
};

/** Phone and address can be corrected until the order is delivered or cancelled. */
export const CONTACT_EDITABLE = (status: OrderStatus) => status !== "delivered" && status !== "cancelled";

/** Button text depends on where the order is: assigned -> ready takes it back from the driver, failed -> ready re-dispatches. */
export function moveLabel(from: OrderStatus, to: OrderStatus): string {
  if (to === "cancelled") return "Hủy";
  return from === "assigned" ? "Hủy phân công" : "Giao lại";
}
