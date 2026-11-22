import { formatVnd } from "./money";

/** What the driver collects at the door: nothing if already paid, else the order total (COD). */
export const collectLabel = (o: { payment_status: string; total: number }) => (o.payment_status === "paid" ? "Đã thanh toán" : `Thu hộ ${formatVnd(o.total)}`);
