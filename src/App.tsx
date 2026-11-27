import { useEffect, useMemo, useRef, useState } from "react";
import { ControlsBar } from "./components/ControlsBar";
import { LifeGridCanvas } from "./components/LifeGridCanvas";
import { MobileYearSheet } from "./components/MobileYearSheet";
import { NoteEditorModal } from "./components/NoteEditorModal";
import { ShareModal } from "./components/ShareModal";
import { detectInitialLocale, formatDateRangeUtc, getDictionary } from "./i18n";
import { exportChartAsPng } from "./lib/exportPng";
import { buildLifeSummary, getWeekRange } from "./lib/lifeCalendar";
import { decodeStateFromHash } from "./lib/shareUrl";
import {
  createSampleState,
  loadFromLocalStorage,
  saveToLocalStorage,
} from "./lib/storage";
import {
  makeNoteKey,
  type LifeState,
  type ViewMode,
  type WeekCellInfo,
  type WeekNote,
} from "./types/life";

function initApp(): { state: LifeState; viewMode: ViewMode; hydrated: boolean } {
  const fromHash = decodeStateFromHash(window.location.hash);
  if (fromHash) {
    return { state: fromHash, viewMode: "shared", hydrated: true };
  }
  // The saved state is encrypted, so it is decrypted after the first render.
  return {
    state: createSampleState(detectInitialLocale()),
    viewMode: "local",
    hydrated: false,
  };
}

export function App() {
  const initial = useMemo(() => initApp(), []);
  const [state, setState] = useState<LifeState>(initial.state);
  const [viewMode, setViewMode] = useState<ViewMode>(initial.viewMode);
  const [hydrated, setHydrated] = useState(initial.hydrated);
  const [editingCell, setEditingCell] = useState<WeekCellInfo | null>(null);
  const [mobileYear, setMobileYear] = useState<number | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (hydrated) return;
    let cancelled = false;
    void loadFromLocalStorage()
      .then((stored) => {
        if (cancelled) return;
        if (stored) setState(stored);
        setHydrated(true);
      })
      .catch(() => {
        // Never leave the page blank because a read failed.
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  useEffect(() => {
    if (viewMode !== "local" || !hydrated) return;
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      void saveToLocalStorage(state);
    }, 250);
    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [state, viewMode, hydrated]);

  const t = getDictionary(state.locale);
  const summary = useMemo(
    () => buildLifeSummary(state.birthDate, state.lifeExpectancy),
    [state.birthDate, state.lifeExpectancy],
  );

  function handleAdoptShared() {
    void saveToLocalStorage(state);
    setViewMode("local");
    window.history.replaceState(null, "", window.location.pathname);
  }

  async function handleReturnToLocal() {
    const local = (await loadFromLocalStorage()) ?? createSampleState(state.locale);
    setState(local);
    setViewMode("local");
    window.history.replaceState(null, "", window.location.pathname);
  }

  function handleSaveNote(cell: WeekCellInfo, note: WeekNote) {
    setState((prev) => ({
      ...prev,
      notes: {
        ...prev.notes,
        [makeNoteKey(cell.year, cell.week)]: note,
      },
    }));
    setEditingCell(null);
  }

  function handleDeleteNote(cell: WeekCellInfo) {
    setState((prev) => {
      const nextNotes = { ...prev.notes };
      delete nextNotes[makeNoteKey(cell.year, cell.week)];
      return { ...prev, notes: nextNotes };
    });
    setEditingCell(null);
  }

  const sortedNotes = useMemo(() => {
    return Object.entries(state.notes)
      .map(([key, note]) => {
        const [yStr, wStr] = key.split("-");
        const year = Number(yStr);
        const week = Number(wStr);
        return { key, year, week, note };
      })
      .filter((item) => item.year < state.lifeExpectancy)
      .sort((a, b) => a.year - b.year || a.week - b.week);
  }, [state.notes, state.lifeExpectancy]);

  if (!hydrated) {
    return <div className="min-h-screen bg-slate-50" aria-busy="true" />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <ControlsBar
        birthDate={state.birthDate}
        lifeExpectancy={state.lifeExpectancy}
        locale={state.locale}
        isReadOnly={viewMode === "shared"}
        t={t}
        onBirthDateChange={(birthDate) =>
          birthDate && setState((prev) => ({ ...prev, birthDate }))
        }
        onLifeExpectancyChange={(lifeExpectancy) =>
          setState((prev) => ({ ...prev, lifeExpectancy }))
        }
        onLocaleToggle={() =>
          setState((prev) => ({
            ...prev,
            locale: prev.locale === "ko" ? "en" : "ko",
          }))
        }
        onOpenShare={() => setShareOpen(true)}
        onExportPng={() =>
          exportChartAsPng(
            state,
            summary,
            `${t.appTitle} — ${t.appSubtitle}`,
            `${state.birthDate} · ${summary.livedWeeks}/${summary.totalWeeks} ${t.weeksUnit} (${summary.percentLived}%)`,
          )
        }
        onPrint={() => window.print()}
      />

      {viewMode === "shared" && (
        <div className="no-print border-b border-amber-200 bg-amber-50 px-4 py-2.5">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
            <span>{t.sharedBannerText}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAdoptShared}
                className="rounded-md bg-amber-900 px-2.5 py-1 font-medium text-white hover:bg-amber-800"
              >
                {t.adoptSharedBtn}
              </button>
              <button
                type="button"
                onClick={handleReturnToLocal}
                className="rounded-md border border-amber-400 bg-white px-2.5 py-1 font-medium text-amber-900 hover:bg-amber-100"
              >
                {t.backToMyChartBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-4 pt-5">
        <section className="mb-4 grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-white p-3 text-center shadow-xs sm:p-4">
          <div>
            <div className="text-xs text-slate-500">{t.livedWeeks}</div>
            <div className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">
              {summary.livedWeeks.toLocaleString()}
              <span className="ml-0.5 text-xs font-normal text-slate-500">
                {t.weeksUnit}
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">{t.remainingWeeks}</div>
            <div className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">
              {summary.remainingWeeks.toLocaleString()}
              <span className="ml-0.5 text-xs font-normal text-slate-500">
                {t.weeksUnit}
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">{t.progress}</div>
            <div className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">
              {summary.percentLived}%
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs sm:p-5">
          <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span className="hidden sm:inline">{t.desktopHint}</span>
            <span className="sm:hidden">{t.mobileHint}</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-xs bg-slate-400" />
                {t.legendLived}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-xs border border-red-500 bg-slate-900" />
                {t.legendCurrent}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-xs border border-slate-300 bg-slate-50" />
                {t.legendRemaining}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-xs bg-blue-500" />
                {t.legendMilestone}
              </span>
            </div>
          </div>

          <LifeGridCanvas
            state={state}
            summary={summary}
            t={t}
            onDesktopCellClick={(cell) => {
              if (viewMode === "local") setEditingCell(cell);
            }}
            onMobileYearTap={(year) => setMobileYear(year)}
          />
        </section>

        {sortedNotes.length > 0 && (
          <section className="print-only mt-6 hidden">
            <h2 className="text-sm font-bold text-slate-900">
              {t.printEventsTitle}
            </h2>
            <ul className="mt-2 space-y-1 text-xs text-slate-700">
              {sortedNotes.map(({ key, year, week, note }) => {
                const cell = getWeekRange(state.birthDate, year, week);
                return (
                  <li key={key}>
                    <strong>
                      {t.ageFormat(year)} · {t.weekLabel(week)}
                    </strong>{" "}
                    ({formatDateRangeUtc(cell.startUtcMs, cell.endUtcMs, state.locale)}):{" "}
                    {note.text}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>

      {mobileYear !== null && (
        <MobileYearSheet
          year={mobileYear}
          lifeExpectancy={state.lifeExpectancy}
          birthDate={state.birthDate}
          notes={state.notes}
          locale={state.locale}
          isReadOnly={viewMode === "shared"}
          t={t}
          onChangeYear={setMobileYear}
          onEditNote={(cell) => setEditingCell(cell)}
          onClose={() => setMobileYear(null)}
        />
      )}

      {editingCell && (
        <NoteEditorModal
          cell={editingCell}
          initialNote={state.notes[makeNoteKey(editingCell.year, editingCell.week)]}
          locale={state.locale}
          t={t}
          onSave={(note) => handleSaveNote(editingCell, note)}
          onDelete={() => handleDeleteNote(editingCell)}
          onClose={() => setEditingCell(null)}
        />
      )}

      {shareOpen && (
        <ShareModal
          state={state}
          t={t}
          onImportState={(next) => {
            setState(next);
            setViewMode("local");
            void saveToLocalStorage(next);
          }}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}
