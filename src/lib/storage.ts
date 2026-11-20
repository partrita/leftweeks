import {
  DEFAULT_LIFE_EXPECTANCY,
  DEFAULT_SAMPLE_BIRTH_DATE,
  MAX_LIFE_EXPECTANCY,
  MAX_NOTE_LENGTH,
  MIN_LIFE_EXPECTANCY,
  NOTE_COLORS,
  STORAGE_KEY,
  type LifeState,
  type Locale,
  type NoteColor,
  type WeekNote,
} from "../types/life";
import { parseIsoDateToUtcMs } from "./lifeCalendar";

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const NOTE_KEY_PATTERN = /^(\d{1,3})-(\d{1,2})$/;

function isNoteColor(val: unknown): val is NoteColor {
  return typeof val === "string" && (NOTE_COLORS as readonly string[]).includes(val);
}

export function validateLifeState(input: unknown): LifeState | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }
  const raw = input as Record<string, unknown>;
  if (raw.v !== 1) return null;

  if (typeof raw.birthDate !== "string" || parseIsoDateToUtcMs(raw.birthDate) === null) {
    return null;
  }

  if (
    typeof raw.lifeExpectancy !== "number" ||
    !Number.isInteger(raw.lifeExpectancy) ||
    raw.lifeExpectancy < MIN_LIFE_EXPECTANCY ||
    raw.lifeExpectancy > MAX_LIFE_EXPECTANCY
  ) {
    return null;
  }

  const locale: Locale = raw.locale === "en" ? "en" : "ko";

  const cleanNotes: Record<string, WeekNote> = Object.create(null) as Record<string, WeekNote>;
  if (raw.notes !== undefined) {
    if (!raw.notes || typeof raw.notes !== "object" || Array.isArray(raw.notes)) {
      return null;
    }
    for (const [key, value] of Object.entries(raw.notes as Record<string, unknown>)) {
      if (FORBIDDEN_KEYS.has(key)) continue;
      const match = NOTE_KEY_PATTERN.exec(key);
      if (!match) continue;
      const year = Number(match[1]);
      const week = Number(match[2]);
      if (year < 0 || year >= MAX_LIFE_EXPECTANCY || week < 0 || week > 51) continue;
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const noteObj = value as Record<string, unknown>;
      if (typeof noteObj.text !== "string") continue;
      const trimmed = noteObj.text.trim();
      if (trimmed.length === 0 || trimmed.length > MAX_NOTE_LENGTH) continue;
      if (!isNoteColor(noteObj.color)) continue;
      cleanNotes[key] = { text: trimmed, color: noteObj.color };
    }
  }

  return {
    v: 1,
    birthDate: raw.birthDate,
    lifeExpectancy: raw.lifeExpectancy,
    notes: { ...cleanNotes },
    locale,
  };
}

export function createSampleState(locale: Locale): LifeState {
  return {
    v: 1,
    birthDate: DEFAULT_SAMPLE_BIRTH_DATE,
    lifeExpectancy: DEFAULT_LIFE_EXPECTANCY,
    locale,
    notes:
      locale === "ko"
        ? {
            "19-8": { text: "대학교 입학", color: "blue" },
            "25-10": { text: "첫 직장 입사", color: "green" },
            "30-0": { text: "서른 살 생일", color: "amber" },
          }
        : {
            "19-8": { text: "Started university", color: "blue" },
            "25-10": { text: "First full-time job", color: "green" },
            "30-0": { text: "Turned 30", color: "amber" },
          },
  };
}

export function loadFromLocalStorage(): LifeState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return validateLifeState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveToLocalStorage(state: LifeState): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function exportStateAsJson(state: LifeState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leftweeks-${state.birthDate}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseImportedJson(jsonText: string): LifeState | null {
  try {
    const parsed: unknown = JSON.parse(jsonText);
    return validateLifeState(parsed);
  } catch {
    return null;
  }
}
