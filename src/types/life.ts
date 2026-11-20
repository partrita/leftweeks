export type NoteColor = "blue" | "green" | "amber" | "rose" | "purple";

export type Locale = "ko" | "en";

export type ViewMode = "local" | "shared";

export type WeekStatus = "lived" | "current" | "remaining";

export interface WeekNote {
  text: string;
  color: NoteColor;
}

export interface LifeState {
  v: 1;
  birthDate: string; // YYYY-MM-DD
  lifeExpectancy: number; // 50..120
  notes: Record<string, WeekNote>; // key: "${year}-${week}"
  locale: Locale;
}

export interface WeekCellInfo {
  year: number;
  week: number;
  startUtcMs: number;
  endUtcMs: number;
  status: WeekStatus;
}

export interface LifeSummary {
  livedWeeks: number;
  remainingWeeks: number;
  totalWeeks: number;
  percentLived: number;
  currentAge: number;
  currentWeek: { year: number; week: number } | null;
}

export const STORAGE_KEY = "leftweeks:v1";
export const MIN_LIFE_EXPECTANCY = 50;
export const MAX_LIFE_EXPECTANCY = 120;
export const DEFAULT_LIFE_EXPECTANCY = 90;
export const MAX_NOTE_LENGTH = 120;
export const MAX_SHARE_URL_LENGTH = 2000;
export const DEFAULT_SAMPLE_BIRTH_DATE = "1995-01-01";

export const NOTE_COLORS: readonly NoteColor[] = [
  "blue",
  "green",
  "amber",
  "rose",
  "purple",
] as const;

export const NOTE_COLOR_HEX: Record<NoteColor, string> = {
  blue: "#3b82f6",
  green: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
  purple: "#8b5cf6",
};

export function makeNoteKey(year: number, week: number): string {
  return `${year}-${week}`;
}
