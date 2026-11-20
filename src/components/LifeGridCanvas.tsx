import { useEffect, useRef, useState } from "react";
import { formatDateRangeUtc } from "../i18n";
import type { Dictionary } from "../i18n/ko";
import { getWeekRange, WEEKS_PER_YEAR } from "../lib/lifeCalendar";
import {
  NOTE_COLOR_HEX,
  makeNoteKey,
  type LifeState,
  type LifeSummary,
  type WeekCellInfo,
} from "../types/life";
import { WeekTooltip } from "./WeekTooltip";

interface LifeGridCanvasProps {
  state: LifeState;
  summary: LifeSummary;
  t: Dictionary;
  onDesktopCellClick: (cell: WeekCellInfo) => void;
  onMobileYearTap: (year: number) => void;
}

interface LayoutMetrics {
  gridOffsetX: number;
  gridOffsetY: number;
  cellSize: number;
  gap: number;
  width: number;
  height: number;
}

function computeLayout(containerWidth: number, rows: number): LayoutMetrics {
  const gridOffsetX = 30;
  const gridOffsetY = 20;
  const usableWidth = Math.max(260, containerWidth - gridOffsetX - 8);
  const gap = usableWidth < 420 ? 1.5 : 2.5;
  const cellSize = Math.max(
    4,
    Math.min(13, (usableWidth - gap * (WEEKS_PER_YEAR - 1)) / WEEKS_PER_YEAR),
  );
  const step = cellSize + gap;
  const width = gridOffsetX + WEEKS_PER_YEAR * step;
  const height = gridOffsetY + rows * step + 8;
  return { gridOffsetX, gridOffsetY, cellSize, gap, width, height };
}

export function LifeGridCanvas({
  state,
  summary,
  t,
  onDesktopCellClick,
  onMobileYearTap,
}: LifeGridCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [containerWidth, setContainerWidth] = useState(860);
  const [hovered, setHovered] = useState<{
    cell: WeekCellInfo;
    clientX: number;
    clientY: number;
  } | null>(null);
  const [focused, setFocused] = useState<{ year: number; week: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerWidth(Math.floor(entry.contentRect.width));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const layout = computeLayout(containerWidth, state.lifeExpectancy);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(layout.width * dpr);
    canvas.height = Math.round(layout.height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, layout.width, layout.height);

    const step = layout.cellSize + layout.gap;

    // Top week markers
    ctx.fillStyle = "#64748b";
    ctx.font = "10px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    for (let w = 0; w < WEEKS_PER_YEAR; w += 10) {
      ctx.fillText(
        String(w + 1),
        layout.gridOffsetX + w * step + layout.cellSize / 2,
        layout.gridOffsetY - 4,
      );
    }

    // Rows & cells
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let y = 0; y < state.lifeExpectancy; y++) {
      if (y % 5 === 0) {
        ctx.fillStyle = "#64748b";
        ctx.fillText(
          String(y),
          layout.gridOffsetX - 6,
          layout.gridOffsetY + y * step + layout.cellSize / 2,
        );
      }
      for (let w = 0; w < WEEKS_PER_YEAR; w++) {
        const x = layout.gridOffsetX + w * step;
        const py = layout.gridOffsetY + y * step;
        const idx = y * WEEKS_PER_YEAR + w;
        const note = state.notes[makeNoteKey(y, w)];
        const isCurrent =
          summary.currentWeek?.year === y && summary.currentWeek?.week === w;
        const isLived = idx < summary.livedWeeks;
        const isFocused = focused?.year === y && focused?.week === w;

        if (note) {
          ctx.fillStyle = NOTE_COLOR_HEX[note.color];
        } else if (isCurrent) {
          ctx.fillStyle = "#0f172a";
        } else if (isLived) {
          ctx.fillStyle = "#94a3b8";
        } else {
          ctx.fillStyle = "#f8fafc";
        }

        ctx.fillRect(x, py, layout.cellSize, layout.cellSize);

        if (isFocused) {
          ctx.strokeStyle = "#2563eb";
          ctx.lineWidth = 2;
        } else if (isCurrent) {
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 1.5;
        } else {
          ctx.strokeStyle = "#cbd5e1";
          ctx.lineWidth = 0.6;
        }
        ctx.strokeRect(x, py, layout.cellSize, layout.cellSize);
      }
    }
  }, [layout, state, summary, focused]);

  function hitTest(clientX: number, clientY: number): { year: number; week: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const localX = clientX - rect.left - layout.gridOffsetX;
    const localY = clientY - rect.top - layout.gridOffsetY;
    if (localX < 0 || localY < 0) return null;

    const step = layout.cellSize + layout.gap;
    const week = Math.floor(localX / step);
    const year = Math.floor(localY / step);
    if (week < 0 || week >= WEEKS_PER_YEAR || year < 0 || year >= state.lifeExpectancy) {
      return null;
    }

    const offsetInCellX = localX - week * step;
    const offsetInCellY = localY - year * step;
    if (offsetInCellX > layout.cellSize || offsetInCellY > layout.cellSize) {
      return null;
    }
    return { year, week };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.pointerType === "touch") return;
    const hit = hitTest(e.clientX, e.clientY);
    if (!hit) {
      setHovered(null);
      return;
    }
    const cell = getWeekRange(state.birthDate, hit.year, hit.week);
    setHovered({ cell, clientX: e.clientX, clientY: e.clientY });
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    const hit = hitTest(e.clientX, e.clientY);
    if (!hit) {
      // On touch, allow tapping anywhere along a row's vertical band
      if (e.pointerType === "touch" && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const localY = e.clientY - rect.top - layout.gridOffsetY;
        const year = Math.floor(localY / (layout.cellSize + layout.gap));
        if (year >= 0 && year < state.lifeExpectancy) {
          onMobileYearTap(year);
        }
      }
      return;
    }
    if (e.pointerType === "touch") {
      onMobileYearTap(hit.year);
    } else {
      const cell = getWeekRange(state.birthDate, hit.year, hit.week);
      onDesktopCellClick(cell);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLCanvasElement>) {
    const cur = focused ?? summary.currentWeek ?? { year: 0, week: 0 };
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setFocused({ year: cur.year, week: Math.min(WEEKS_PER_YEAR - 1, cur.week + 1) });
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setFocused({ year: cur.year, week: Math.max(0, cur.week - 1) });
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocused({ year: Math.min(state.lifeExpectancy - 1, cur.year + 1), week: cur.week });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocused({ year: Math.max(0, cur.year - 1), week: cur.week });
    } else if (e.key === "Enter" && focused) {
      e.preventDefault();
      onDesktopCellClick(getWeekRange(state.birthDate, focused.year, focused.week));
    }
  }

  const focusedCell = focused
    ? getWeekRange(state.birthDate, focused.year, focused.week)
    : null;
  const focusedNote = focused
    ? state.notes[makeNoteKey(focused.year, focused.week)]
    : undefined;

  return (
    <div ref={containerRef} className="w-full overflow-x-auto">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="grid"
        aria-label={t.appSubtitle}
        style={{ width: layout.width, height: layout.height }}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHovered(null)}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
        className="mx-auto block cursor-pointer touch-manipulation focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      />

      <div className="sr-only" aria-live="polite">
        {focusedCell &&
          `${t.ageFormat(focusedCell.year)} ${t.weekLabel(focusedCell.week)} ${formatDateRangeUtc(
            focusedCell.startUtcMs,
            focusedCell.endUtcMs,
            state.locale,
          )} ${focusedNote ? focusedNote.text : ""}`}
      </div>

      {hovered && (
        <WeekTooltip
          cell={hovered.cell}
          note={state.notes[makeNoteKey(hovered.cell.year, hovered.cell.week)]}
          x={hovered.clientX}
          y={hovered.clientY}
          locale={state.locale}
          t={t}
        />
      )}
    </div>
  );
}
