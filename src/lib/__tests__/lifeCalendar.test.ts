import { describe, expect, it } from "vitest";
import {
  buildLifeSummary,
  getBirthdayUtcMs,
  getWeekRange,
  parseIsoDateToUtcMs,
} from "../lifeCalendar";

describe("lifeCalendar", () => {
  it("parses valid ISO dates in UTC and rejects invalid calendar dates", () => {
    expect(parseIsoDateToUtcMs("1995-01-01")).toBe(Date.UTC(1995, 0, 1));
    expect(parseIsoDateToUtcMs("2024-02-29")).toBe(Date.UTC(2024, 1, 29));
    expect(parseIsoDateToUtcMs("2023-02-29")).toBeNull();
    expect(parseIsoDateToUtcMs("2024-13-01")).toBeNull();
  });

  it("handles Feb 29 leap-year birthdays consistently on non-leap years", () => {
    expect(getBirthdayUtcMs("2000-02-29", 0)).toBe(Date.UTC(2000, 1, 29));
    expect(getBirthdayUtcMs("2000-02-29", 1)).toBe(Date.UTC(2001, 1, 28));
    expect(getBirthdayUtcMs("2000-02-29", 4)).toBe(Date.UTC(2004, 1, 29));
  });

  it("absorbs leftover days in week 51 (8 days in normal year, 9 in leap year)", () => {
    const w51Normal = getWeekRange("1995-01-01", 0, 51, Date.UTC(2025, 0, 1));
    expect(w51Normal).not.toBeNull();
    expect((w51Normal!.endUtcMs - w51Normal!.startUtcMs) / 86_400_000 + 1).toBe(8);
    expect(w51Normal!.endUtcMs).toBe(Date.UTC(1995, 11, 31));

    const w51Leap = getWeekRange("1996-01-01", 0, 51, Date.UTC(2025, 0, 1));
    expect(w51Leap).not.toBeNull();
    expect((w51Leap!.endUtcMs - w51Leap!.startUtcMs) / 86_400_000 + 1).toBe(9);
    expect(w51Leap!.endUtcMs).toBe(Date.UTC(1996, 11, 31));
  });

  it("handles future birth dates and ages exceeding life expectancy without error", () => {
    const future = buildLifeSummary("2030-01-01", 90, Date.UTC(2026, 0, 1));
    expect(future.livedWeeks).toBe(0);
    expect(future.remainingWeeks).toBe(90 * 52);
    expect(future.currentWeek).toBeNull();

    const exceeded = buildLifeSummary("1920-01-01", 90, Date.UTC(2026, 0, 1));
    expect(exceeded.livedWeeks).toBe(90 * 52);
    expect(exceeded.remainingWeeks).toBe(0);
    expect(exceeded.percentLived).toBe(100);
    expect(exceeded.currentWeek).toBeNull();
  });
});
