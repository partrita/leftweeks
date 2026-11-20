import { useState } from "react";
import { formatDateRangeUtc } from "../i18n";
import type { Dictionary } from "../i18n/ko";
import { getWeekRange, WEEKS_PER_YEAR } from "../lib/lifeCalendar";
import {
  NOTE_COLOR_HEX,
  makeNoteKey,
  type Locale,
  type WeekCellInfo,
  type WeekNote,
} from "../types/life";

interface MobileYearSheetProps {
  year: number;
  lifeExpectancy: number;
  birthDate: string;
  notes: Record<string, WeekNote>;
  locale: Locale;
  isReadOnly: boolean;
  t: Dictionary;
  onChangeYear: (nextYear: number) => void;
  onEditNote: (cell: WeekCellInfo) => void;
  onClose: () => void;
}

export function MobileYearSheet({
  year,
  lifeExpectancy,
  birthDate,
  notes,
  locale,
  isReadOnly,
  t,
  onChangeYear,
  onEditNote,
  onClose,
}: MobileYearSheetProps) {
  const [selectedWeek, setSelectedWeek] = useState<number>(0);

  const selectedCell = getWeekRange(birthDate, year, selectedWeek);
  const selectedNote = notes[makeNoteKey(year, selectedWeek)];

  return (
    <div
      className="no-print fixed inset-0 z-40 flex items-end bg-slate-900/40"
      onClick={onClose}
    >
      <div
        className="max-h-[82vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={year <= 0}
              onClick={() => onChangeYear(year - 1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-sm font-bold text-slate-700 disabled:opacity-30"
              aria-label="Previous year"
            >
              ‹
            </button>
            <span className="min-w-[84px] text-center text-base font-bold text-slate-900">
              {t.ageFormat(year)}
            </span>
            <button
              type="button"
              disabled={year >= lifeExpectancy - 1}
              onClick={() => onChangeYear(year + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-sm font-bold text-slate-700 disabled:opacity-30"
              aria-label="Next year"
            >
              ›
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
          >
            {t.closeBtn}
          </button>
        </div>

        <div className="mt-3 rounded-lg bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-slate-900">
                {t.ageFormat(year)} · {t.weekLabel(selectedWeek)}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                {formatDateRangeUtc(selectedCell.startUtcMs, selectedCell.endUtcMs, locale)}
              </div>
            </div>
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => onEditNote(selectedCell)}
                className="shrink-0 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
              >
                {t.editNoteBtn}
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-700">
            {selectedNote ? selectedNote.text : t.noNoteText}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-8">
          {Array.from({ length: WEEKS_PER_YEAR }, (_, w) => {
            const cell = getWeekRange(birthDate, year, w);
            const note = notes[makeNoteKey(year, w)];
            const isSelected = w === selectedWeek;
            return (
              <button
                key={w}
                type="button"
                onClick={() => setSelectedWeek(w)}
                className={`relative flex h-11 items-center justify-center rounded-lg border text-xs font-medium transition ${
                  isSelected
                    ? "border-slate-900 ring-2 ring-slate-900"
                    : "border-slate-200"
                } ${
                  cell.status === "current"
                    ? "bg-slate-900 text-white"
                    : cell.status === "lived"
                      ? "bg-slate-200 text-slate-800"
                      : "bg-white text-slate-600"
                }`}
              >
                <span>{w + 1}</span>
                {note && (
                  <span
                    className="absolute right-1 top-1 h-2 w-2 rounded-full"
                    style={{ backgroundColor: NOTE_COLOR_HEX[note.color] }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
