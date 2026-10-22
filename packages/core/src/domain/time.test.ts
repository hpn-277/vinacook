import { describe, expect, it } from "vitest";
import { addDays, productionDate } from "./time";

const at = (iso: string) => new Date(iso);

describe("productionDate (Asia/Ho_Chi_Minh, UTC+7)", () => {
  it("before cutoff is today", () => {
    expect(productionDate(at("2026-10-14T09:59:00Z"), "17:00")).toBe("2026-10-14");
  });

  it("exactly at cutoff is tomorrow", () => {
    expect(productionDate(at("2026-10-14T10:00:00Z"), "17:00:00")).toBe("2026-10-15");
  });

  it("uses local date, not UTC date", () => {
    expect(productionDate(at("2026-10-13T18:30:00Z"), "17:00")).toBe("2026-10-14");
  });

  it("late evening local rolls over month end", () => {
    expect(productionDate(at("2026-10-31T16:00:00Z"), "17:00")).toBe("2026-11-01");
    expect(productionDate(at("2026-10-31T12:00:00Z"), "17:00")).toBe("2026-11-01");
  });

  it("respects a custom cutoff", () => {
    expect(productionDate(at("2026-10-14T07:29:00Z"), "14:30")).toBe("2026-10-14");
    expect(productionDate(at("2026-10-14T07:30:00Z"), "14:30")).toBe("2026-10-15");
  });

  it("addDays crosses year end", () => {
    expect(addDays("2026-12-31" as never, 1)).toBe("2027-01-01");
  });
});
