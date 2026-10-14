export const TIMEZONE = "Asia/Ho_Chi_Minh";

export type IsoDate = string & { readonly __brand: "IsoDate" };

function localParts(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return { date: `${get("year")}-${get("month")}-${get("day")}` as IsoDate, time: `${get("hour")}:${get("minute")}` };
}

export function localDate(now: Date, timeZone = TIMEZONE): IsoDate {
  return localParts(now, timeZone).date;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10) as IsoDate;
}

/** cutoff is "HH:MM" or "HH:MM:SS" local time; an order at or after the cutoff goes to tomorrow. */
export function productionDate(now: Date, cutoff: string, timeZone = TIMEZONE): IsoDate {
  const { date, time } = localParts(now, timeZone);
  return time < cutoff.slice(0, 5) ? date : addDays(date, 1);
}

export function parseIsoDate(value: string | undefined | null): IsoDate | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ? null : (value as IsoDate);
}

export function monthStart(date: IsoDate): IsoDate {
  return `${date.slice(0, 7)}-01` as IsoDate;
}
