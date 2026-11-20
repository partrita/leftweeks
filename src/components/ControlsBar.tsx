import type { Dictionary } from "../i18n/ko";
import {
  MAX_LIFE_EXPECTANCY,
  MIN_LIFE_EXPECTANCY,
  type Locale,
} from "../types/life";

interface ControlsBarProps {
  birthDate: string;
  lifeExpectancy: number;
  locale: Locale;
  isReadOnly: boolean;
  t: Dictionary;
  onBirthDateChange: (val: string) => void;
  onLifeExpectancyChange: (val: number) => void;
  onLocaleToggle: () => void;
  onOpenShare: () => void;
  onExportPng: () => void;
  onPrint: () => void;
}

export function ControlsBar({
  birthDate,
  lifeExpectancy,
  locale,
  isReadOnly,
  t,
  onBirthDateChange,
  onLifeExpectancyChange,
  onLocaleToggle,
  onOpenShare,
  onExportPng,
  onPrint,
}: ControlsBarProps) {
  return (
    <header className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            {t.appTitle}
          </h1>
          <span className="text-xs text-slate-500">{t.appSubtitle}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <span>{t.birthDateLabel}</span>
            <input
              type="date"
              value={birthDate}
              disabled={isReadOnly}
              onChange={(e) => onBirthDateChange(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-slate-900 focus:outline-none disabled:bg-slate-100"
            />
          </label>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <span>
              {t.lifeExpectancyLabel}:{" "}
              <strong className="tabular-nums text-slate-900">
                {lifeExpectancy}
                {t.yearsUnit}
              </strong>
            </span>
            <input
              type="range"
              min={MIN_LIFE_EXPECTANCY}
              max={MAX_LIFE_EXPECTANCY}
              value={lifeExpectancy}
              disabled={isReadOnly}
              onChange={(e) => onLifeExpectancyChange(Number(e.target.value))}
              className="w-24 accent-slate-900 sm:w-32"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenShare}
            className="rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
          >
            {t.shareBtn}
          </button>
          <button
            type="button"
            onClick={onExportPng}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {t.pngBtn}
          </button>
          <button
            type="button"
            onClick={onPrint}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {t.printBtn}
          </button>
          <button
            type="button"
            onClick={onLocaleToggle}
            className="rounded-md border border-slate-300 bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-200"
            aria-label="Toggle language"
          >
            {locale === "ko" ? "EN" : "KO"}
          </button>
        </div>
      </div>
    </header>
  );
}
