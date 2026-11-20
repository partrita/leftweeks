import { formatDateRangeUtc } from "../i18n";
import type { Dictionary } from "../i18n/ko";
import { NOTE_COLOR_HEX, type Locale, type WeekCellInfo, type WeekNote } from "../types/life";

interface WeekTooltipProps {
  cell: WeekCellInfo;
  note?: WeekNote;
  x: number;
  y: number;
  locale: Locale;
  t: Dictionary;
}

export function WeekTooltip({ cell, note, x, y, locale, t }: WeekTooltipProps) {
  return (
    <div
      className="pointer-events-none fixed z-40 max-w-xs rounded-lg border border-slate-200 bg-slate-900 px-3 py-2 text-xs text-white shadow-lg"
      style={{
        left: Math.min(x + 14, window.innerWidth - 260),
        top: Math.max(y - 12, 8),
      }}
    >
      <div className="font-semibold">
        {t.ageFormat(cell.year)} · {t.weekLabel(cell.week)}
      </div>
      <div className="mt-0.5 text-slate-300">
        {formatDateRangeUtc(cell.startUtcMs, cell.endUtcMs, locale)}
      </div>
      {note && (
        <div className="mt-1.5 flex items-center gap-1.5 border-t border-slate-700 pt-1.5 text-slate-100">
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: NOTE_COLOR_HEX[note.color] }}
          />
          <span className="break-words">{note.text}</span>
        </div>
      )}
    </div>
  );
}
