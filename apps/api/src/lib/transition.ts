import { DomainError } from "@noodle/core/action";
import { db } from "@noodle/core/db";
import type { Database } from "@noodle/core/database.types";
import { canTransition, JOB_STATUS_LABEL, ORDER_STATUS_LABEL, type Machine, type StatusOf } from "@noodle/core/domain/status";

type Update<M extends Machine> = Omit<Database["public"]["Tables"][M]["Update"], "status" | "id">;

const LABELS: { [M in Machine]: Record<StatusOf<M>, string> } = {
  orders: ORDER_STATUS_LABEL,
  production_jobs: JOB_STATUS_LABEL,
};

/**
 * The only path for single-row status changes. `scope` narrows the row to what the caller owns
 * (e.g. driver_id, factory_id); the conditional update on the old status makes concurrent moves lose cleanly.
 */
export async function transition<M extends Machine>(
  machine: M,
  id: number,
  to: StatusOf<M>,
  opts: { patch?: Update<M>; scope?: Record<string, number> } = {},
): Promise<void> {
  // Both tables share the {id, status} shape; one cast here keeps callers fully typed.
  const table = () => db().from(machine as "orders");
  let read = table().select("status").eq("id", id);
  for (const [column, value] of Object.entries(opts.scope ?? {})) read = read.eq(column as "id", value);
  const { data, error } = await read.maybeSingle();
  if (error) throw error;
  if (!data) throw new DomainError("Không tìm thấy hoặc bạn không có quyền");

  const from = data.status as StatusOf<M>;
  const labels = LABELS[machine] as Record<string, string>;
  if (!canTransition(machine, from, to)) {
    throw new DomainError(`Không thể chuyển từ "${labels[from]}" sang "${labels[to]}"`);
  }

  const { data: moved, error: updateError } = await table()
    .update({ ...opts.patch, status: to } as never)
    .eq("id", id)
    .eq("status", from as never)
    .select("id");
  if (updateError) throw updateError;
  if (!moved?.length) throw new DomainError("Trạng thái vừa thay đổi, vui lòng tải lại trang");
}
