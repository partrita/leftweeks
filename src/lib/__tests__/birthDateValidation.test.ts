import { describe, expect, it } from "vitest";
import {
  buildLifeSummary,
  getBirthdayUtcMs,
  getWeekRange,
  isValidIsoDate,
  isPlausibleBirthDate,
  parseIsoDateToUtcMs,
} from "../lifeCalendar";

/** Values a `<input type="date">` can hand over while the date is incomplete. */
const UNPARSEABLE_DATES = [
  "",
  "0001-01-01",
  "0002-01-01",
  "0019-11-27",
  "1995-01",
  "1995-1-1",
  "1995-01-01 ",
  "1995/01/01",
  "19950101",
  "2023-02-29",
  "2024-13-01",
  "2024-00-10",
  "0000-00-00",
  "abcdefgh",
];

/** A real calendar date, but older than the app treats as a birth date. */
const IMPLAUSIBLE_DATES = ["0198-11-27", "1899-12-31"];

describe("birth date validation", () => {
  const today = Date.UTC(2026, 10, 27);

  it("rejects incomplete and out-of-range dates without throwing", () => {
    for (const value of UNPARSEABLE_DATES) {
      expect(parseIsoDateToUtcMs(value)).toBeNull();
      expect(isValidIsoDate(value)).toBe(false);
      expect(isPlausibleBirthDate(value, today)).toBe(false);
    }
    for (const value of IMPLAUSIBLE_DATES) {
      expect(isValidIsoDate(value)).toBe(true);
      expect(isPlausibleBirthDate(value, today)).toBe(false);
    }
  });

  it("returns null instead of throwing when a birthday cannot be derived", () => {
    for (const value of UNPARSEABLE_DATES) {
      expect(() => getBirthdayUtcMs(value, 0)).not.toThrow();
      expect(getBirthdayUtcMs(value, 0)).toBeNull();
    }
  });

  it("returns a null week cell instead of throwing for an unusable birth date", () => {
    for (const value of UNPARSEABLE_DATES) {
      expect(() => getWeekRange(value, 0, 0, today)).not.toThrow();
      expect(getWeekRange(value, 0, 0, today)).toBeNull();
      expect(getWeekRange(value, 51, 51, today)).toBeNull();
    }
  });

  it("builds a neutral summary instead of throwing for an unusable birth date", () => {
    for (const value of UNPARSEABLE_DATES) {
      const summary = buildLifeSummary(value, 90, today);
      expect(summary.livedWeeks).toBe(0);
      expect(summary.remainingWeeks).toBe(90 * 52);
      expect(summary.totalWeeks).toBe(90 * 52);
      expect(summary.percentLived).toBe(0);
      expect(summary.currentWeek).toBeNull();
    }
  });

  it("accepts every keystroke state up to a real birth date", () => {
    const typed = ["0001-11-27", "0019-11-27", "0198-11-27", "1987-11-27"];
    expect(typed.map((value) => isPlausibleBirthDate(value, today))).toEqual([
      false,
      false,
      false,
      true,
    ]);
  });

  it("accepts plausible birth dates and keeps them working as before", () => {
    expect(isPlausibleBirthDate("1995-01-01", today)).toBe(true);
    expect(isPlausibleBirthDate("1987-11-04", today)).toBe(true);
    expect(isPlausibleBirthDate("1900-01-01", today)).toBe(true);
    expect(isPlausibleBirthDate("2026-11-27", today)).toBe(true);
    expect(isPlausibleBirthDate("2026-11-28", today)).toBe(false);

    const cell = getWeekRange("1995-01-01", 0, 0, today);
    expect(cell).not.toBeNull();
    expect(cell?.startUtcMs).toBe(Date.UTC(1995, 0, 1));
    expect(cell?.endUtcMs).toBe(Date.UTC(1995, 0, 7));
    expect(cell?.status).toBe("lived");
  });
});
