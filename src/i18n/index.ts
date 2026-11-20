import type { Locale } from "../types/life";
import { en } from "./en";
import { ko, type Dictionary } from "./ko";

export function detectInitialLocale(): Locale {
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en";
  }
  return "ko";
}

export function getDictionary(locale: Locale): Dictionary {
  return locale === "en" ? en : ko;
}

export function formatDateRangeUtc(
  startUtcMs: number,
  endUtcMs: number,
  locale: Locale,
): string {
  const formatter = new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `${formatter.format(new Date(startUtcMs))} – ${formatter.format(new Date(endUtcMs))}`;
}
