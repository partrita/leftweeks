import type { LifeSummary, WeekCellInfo, WeekStatus } from "../types/life";

const MS_PER_DAY = 86_400_000;
export const WEEKS_PER_YEAR = 52;

/**
 * `Date.UTC` maps years 0–99 to 1900–1999, so an ISO year below 100 cannot be
 * represented directly and is treated as invalid instead of silently shifted.
 */
const MIN_PARSEABLE_YEAR = 100;

/** Oldest birth year the app accepts as a real birth date. */
export const MIN_BIRTH_YEAR = 1900;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function parseIsoDateToUtcMs(isoDate: string): number | null {
  if (typeof isoDate !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (y < MIN_PARSEABLE_YEAR) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const utcMs = Date.UTC(y, m - 1, d);
  const check = new Date(utcMs);
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== m - 1 ||
    check.getUTCDate() !== d
  ) {
    return null;
  }
  return utcMs;
}

/** True when the text is a real `YYYY-MM-DD` calendar date. */
export function isValidIsoDate(value: string): boolean {
  return parseIsoDateToUtcMs(value) !== null;
}

export function getLocalTodayUtcMs(now: Date = new Date()): number {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Local calendar day of `now` as `YYYY-MM-DD`, the format of the date field. */
export function getLocalTodayIsoDate(now: Date = new Date()): string {
  const year = String(now.getFullYear()).padStart(4, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * True when `value` may be used as a birth date: a real calendar date between
 * 1900-01-01 and today. Half-typed or out-of-range values (`0001-01-01`, `""`,
 * `1995-01`) fail here, so the caller keeps the last valid chart instead of
 * feeding an unusable date into the grid.
 */
export function isPlausibleBirthDate(
  value: string,
  todayUtcMs: number = getLocalTodayUtcMs(),
): boolean {
  const utcMs = parseIsoDateToUtcMs(value);
  if (utcMs === null) return false;
  return utcMs >= Date.UTC(MIN_BIRTH_YEAR, 0, 1) && utcMs <= todayUtcMs;
}

/**
 * The birthday that falls `ageYear` years after `baseUtcMs`, clamping Feb 29 to
 * Feb 28 in non-leap years.
 */
function addYearsUtcMs(baseUtcMs: number, ageYear: number): number {
  const base = new Date(baseUtcMs);
  const targetYear = base.getUTCFullYear() + ageYear;
  const month = base.getUTCMonth();
  let day = base.getUTCDate();
  if (month === 1 && day === 29 && !isLeapYear(targetYear)) {
    day = 28;
  }
  return Date.UTC(targetYear, month, day);
}

/**
 * Birthday `ageYear` years after the birth date, or null when `birthDate` is
 * not a real date. Returning null instead of throwing keeps a bad value from
 * taking the whole render down.
 */
export function getBirthdayUtcMs(birthDate: string, ageYear: number): number | null {
  const baseMs = parseIsoDateToUtcMs(birthDate);
  if (baseMs === null) return null;
  return addYearsUtcMs(baseMs, ageYear);
}

/** Week cell info, or null when `birthDate` cannot be used. */
export function getWeekRange(
  birthDate: string,
  year: number,
  week: number,
  todayUtcMs: number = getLocalTodayUtcMs(),
): WeekCellInfo | null {
  const rowStart = getBirthdayUtcMs(birthDate, year);
  const nextRowStart = getBirthdayUtcMs(birthDate, year + 1);
  if (rowStart === null || nextRowStart === null) return null;

  const startUtcMs = rowStart + week * 7 * MS_PER_DAY;
  const endUtcMs =
    week < WEEKS_PER_YEAR - 1
      ? startUtcMs + 6 * MS_PER_DAY
      : nextRowStart - MS_PER_DAY;

  let status: WeekStatus;
  if (todayUtcMs > endUtcMs) {
    status = "lived";
  } else if (todayUtcMs >= startUtcMs && todayUtcMs <= endUtcMs) {
    status = "current";
  } else {
    status = "remaining";
  }

  return {
    year,
    week,
    startUtcMs,
    endUtcMs,
    status,
  };
}

export function buildLifeSummary(
  birthDate: string,
  lifeExpectancy: number,
  todayUtcMs: number = getLocalTodayUtcMs(),
): LifeSummary {
  const totalWeeks = lifeExpectancy * WEEKS_PER_YEAR;
  const birthUtcMs = parseIsoDateToUtcMs(birthDate);
  if (birthUtcMs === null) {
    return {
      livedWeeks: 0,
      remainingWeeks: totalWeeks,
      totalWeeks,
      percentLived: 0,
      currentAge: 0,
      currentWeek: null,
    };
  }

  if (todayUtcMs < birthUtcMs) {
    return {
      livedWeeks: 0,
      remainingWeeks: totalWeeks,
      totalWeeks,
      percentLived: 0,
      currentAge: 0,
      currentWeek: null,
    };
  }

  const finalEndUtcMs = addYearsUtcMs(birthUtcMs, lifeExpectancy) - MS_PER_DAY;
  if (todayUtcMs > finalEndUtcMs) {
    const birth = new Date(birthUtcMs);
    const today = new Date(todayUtcMs);
    let age = today.getUTCFullYear() - birth.getUTCFullYear();
    const birthdayThisYear = addYearsUtcMs(birthUtcMs, age);
    if (todayUtcMs < birthdayThisYear) age -= 1;
    return {
      livedWeeks: totalWeeks,
      remainingWeeks: 0,
      totalWeeks,
      percentLived: 100,
      currentAge: Math.max(0, age),
      currentWeek: null,
    };
  }

  const birth = new Date(birthUtcMs);
  const today = new Date(todayUtcMs);
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  if (todayUtcMs < addYearsUtcMs(birthUtcMs, age)) {
    age -= 1;
  }
  const currentYear = Math.max(0, Math.min(lifeExpectancy - 1, age));
  const rowStart = addYearsUtcMs(birthUtcMs, currentYear);
  const daysIntoYear = Math.floor((todayUtcMs - rowStart) / MS_PER_DAY);
  const currentWeekIdx = Math.min(WEEKS_PER_YEAR - 1, Math.max(0, Math.floor(daysIntoYear / 7)));

  const livedWeeks = currentYear * WEEKS_PER_YEAR + currentWeekIdx;
  const remainingWeeks = Math.max(0, totalWeeks - livedWeeks - 1);
  const percentLived = Number(((livedWeeks / totalWeeks) * 100).toFixed(1));

  return {
    livedWeeks,
    remainingWeeks,
    totalWeeks,
    percentLived,
    currentAge: currentYear,
    currentWeek: { year: currentYear, week: currentWeekIdx },
  };
}
