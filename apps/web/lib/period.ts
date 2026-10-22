import "server-only";
import { addDays, localDate, monthStart, type IsoDate } from "@noodle/core/domain/time";

// Vietnam has no DST, so a fixed offset is exact.
const OFFSET = "+07:00";

/** [from, to) bounds of a local day or month for timestamptz filters. */
export function dayRange(date: IsoDate) {
  return { from: `${date}T00:00:00${OFFSET}`, to: `${addDays(date, 1)}T00:00:00${OFFSET}` };
}

export function monthRange(date: IsoDate) {
  const start = monthStart(date);
  const [y, m] = start.split("-").map(Number);
  const next = (m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`) as IsoDate;
  return { from: `${start}T00:00:00${OFFSET}`, to: `${next}T00:00:00${OFFSET}` };
}

export const today = () => localDate(new Date());
