import type { LifeSummary, WeekCellInfo, WeekStatus } from "../types/life";

const MS_PER_DAY = 86_400_000;
export const WEEKS_PER_YEAR = 52;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function parseIsoDateToUtcMs(isoDate: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
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

export function getLocalTodayUtcMs(now: Date = new Date()): number {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

export function getBirthdayUtcMs(birthDate: string, ageYear: number): number {
  const baseMs = parseIsoDateToUtcMs(birthDate);
  if (baseMs === null) {
    throw new Error(`Invalid birthDate: ${birthDate}`);
  }
  const base = new Date(baseMs);
  const targetYear = base.getUTCFullYear() + ageYear;
  const month = base.getUTCMonth();
  let day = base.getUTCDate();
  if (month === 1 && day === 29 && !isLeapYear(targetYear)) {
    day = 28;
  }
  return Date.UTC(targetYear, month, day);
}

export function getWeekRange(
  birthDate: string,
  year: number,
  week: number,
  todayUtcMs: number = getLocalTodayUtcMs(),
): WeekCellInfo {
  const rowStart = getBirthdayUtcMs(birthDate, year);
  const nextRowStart = getBirthdayUtcMs(birthDate, year + 1);

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

  const finalEndUtcMs = getBirthdayUtcMs(birthDate, lifeExpectancy) - MS_PER_DAY;
  if (todayUtcMs > finalEndUtcMs) {
    const birth = new Date(birthUtcMs);
    const today = new Date(todayUtcMs);
    let age = today.getUTCFullYear() - birth.getUTCFullYear();
    const birthdayThisYear = getBirthdayUtcMs(birthDate, age);
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
  if (todayUtcMs < getBirthdayUtcMs(birthDate, age)) {
    age -= 1;
  }
  const currentYear = Math.max(0, Math.min(lifeExpectancy - 1, age));
  const rowStart = getBirthdayUtcMs(birthDate, currentYear);
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
