import { useState } from "react";
import { formatDateRangeUtc } from "../i18n";
import type { Dictionary } from "../i18n/ko";
import {
  MAX_NOTE_LENGTH,
  NOTE_COLORS,
  NOTE_COLOR_HEX,
  type Locale,
  type NoteColor,
  type WeekCellInfo,
  type WeekNote,
} from "../types/life";

interface NoteEditorModalProps {
  cell: WeekCellInfo;
  initialNote?: WeekNote;
  locale: Locale;
  t: Dictionary;
  onSave: (note: WeekNote) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function NoteEditorModal({
  cell,
  initialNote,
  locale,
  t,
  onSave,
  onDelete,
  onClose,
}: NoteEditorModalProps) {
  const [text, setText] = useState(initialNote?.text ?? "");
  const [color, setColor] = useState<NoteColor>(initialNote?.color ?? "blue");

  const trimmed = text.trim();

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {t.noteModalTitle}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {t.ageFormat(cell.year)} · {t.weekLabel(cell.week)} (
              {formatDateRangeUtc(cell.startUtcMs, cell.endUtcMs, locale)})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-400 hover:text-slate-700"
            aria-label={t.closeBtn}
          >
            ✕
          </button>
        </div>

        <div className="mt-4">
          <textarea
            rows={3}
            maxLength={MAX_NOTE_LENGTH}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.notePlaceholder}
            autoFocus
            className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
          />
          <div className="mt-1 text-right text-xs text-slate-400 tabular-nums">
            {text.length} / {MAX_NOTE_LENGTH}
          </div>
        </div>

        <div className="mt-3">
          <div className="text-xs font-medium text-slate-700">{t.colorLabel}</div>
          <div className="mt-2 flex items-center gap-2.5">
            {NOTE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-7 w-7 rounded-full transition-transform ${
                  color === c ? "scale-110 ring-2 ring-slate-900 ring-offset-2" : ""
                }`}
                style={{ backgroundColor: NOTE_COLOR_HEX[c] }}
                aria-label={c}
              />
            ))}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          {initialNote ? (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
            >
              {t.deleteBtn}
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {t.cancelBtn}
            </button>
            <button
              type="button"
              disabled={trimmed.length === 0}
              onClick={() => onSave({ text: trimmed, color })}
              className="rounded-md bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-40"
            >
              {t.saveBtn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
