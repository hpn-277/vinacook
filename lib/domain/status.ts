export const ORDER_STATUSES = [
  "placed",
  "approved",
  "in_production",
  "ready",
  "assigned",
  "delivered",
  "failed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const JOB_STATUSES = ["assigned", "accepted", "rejected", "shipped", "received"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  placed: ["approved", "cancelled"],
  approved: ["in_production", "cancelled"],
  in_production: ["ready"],
  ready: ["assigned"],
  assigned: ["delivered", "failed"],
  delivered: [],
  failed: ["ready", "cancelled"],
  cancelled: [],
};

export const JOB_TRANSITIONS: Record<JobStatus, readonly JobStatus[]> = {
  assigned: ["accepted", "rejected"],
  accepted: ["shipped"],
  shipped: ["received"],
  rejected: [],
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
  placed: "Mới đặt",
  approved: "Đã duyệt",
  in_production: "Đang sản xuất",
  ready: "Sẵn sàng giao",
  assigned: "Đang giao",
  delivered: "Đã giao",
  failed: "Giao thất bại",
  cancelled: "Đã hủy",
};

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  assigned: "Chờ xưởng nhận",
  accepted: "Xưởng đã nhận",
  rejected: "Xưởng từ chối",
  shipped: "Đã xuất hàng",
  received: "Đã nhận hàng",
};


/** Order edges a manager clicks directly; the others happen via close-day, receive-day, dispatch, or the driver. */
export const MANAGER_ORDER_MOVES: Partial<Record<OrderStatus, readonly OrderStatus[]>> = {
  placed: ["approved", "cancelled"],
  approved: ["cancelled"],
  failed: ["ready", "cancelled"],
};

export const MOVE_LABEL: Partial<Record<OrderStatus, string>> = {
  approved: "Duyệt",
  cancelled: "Hủy",
  ready: "Giao lại",
};
