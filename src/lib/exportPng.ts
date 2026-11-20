import {
  NOTE_COLOR_HEX,
  makeNoteKey,
  type LifeState,
  type LifeSummary,
} from "../types/life";
import { WEEKS_PER_YEAR } from "./lifeCalendar";

export function exportChartAsPng(
  state: LifeState,
  summary: LifeSummary,
  title: string,
  subtitle: string,
): void {
  const scale = 2;
  const cellSize = 11;
  const gap = 3;
  const step = cellSize + gap;
  const paddingX = 48;
  const headerHeight = 72;
  const footerHeight = 40;
  const axisLeft = 36;

  const gridWidth = WEEKS_PER_YEAR * step - gap;
  const gridHeight = state.lifeExpectancy * step - gap;
  const width = paddingX * 2 + axisLeft + gridWidth;
  const height = headerHeight + gridHeight + footerHeight;

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Header
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(title, paddingX, 34);
  ctx.fillStyle = "#475569";
  ctx.font = "12px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(subtitle, paddingX, 54);

  const originX = paddingX + axisLeft;
  const originY = headerHeight;

  // Axis labels
  ctx.fillStyle = "#64748b";
  ctx.font = "10px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  for (let y = 0; y < state.lifeExpectancy; y++) {
    if (y % 5 === 0) {
      ctx.fillText(String(y), originX - 8, originY + y * step + cellSize / 2);
    }
    for (let w = 0; w < WEEKS_PER_YEAR; w++) {
      const x = originX + w * step;
      const py = originY + y * step;
      const idx = y * WEEKS_PER_YEAR + w;
      const note = state.notes[makeNoteKey(y, w)];
      const isCurrent =
        summary.currentWeek?.year === y && summary.currentWeek?.week === w;
      const isLived = idx < summary.livedWeeks;

      if (note) {
        ctx.fillStyle = NOTE_COLOR_HEX[note.color];
      } else if (isCurrent) {
        ctx.fillStyle = "#0f172a";
      } else if (isLived) {
        ctx.fillStyle = "#94a3b8";
      } else {
        ctx.fillStyle = "#f1f5f9";
      }

      ctx.fillRect(x, py, cellSize, cellSize);
      ctx.strokeStyle = isCurrent ? "#ef4444" : "#cbd5e1";
      ctx.lineWidth = isCurrent ? 1.5 : 0.6;
      ctx.strokeRect(x, py, cellSize, cellSize);
    }
  }

  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `leftweeks-${state.birthDate}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
