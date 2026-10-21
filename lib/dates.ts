// Date/month helpers. Dates are calendar dates stored as UTC-midnight DateTimes
// and month filters are [UTC 1st, UTC 1st of next month) ranges (D13) — the UI
// never shifts dates by timezone.

import { APP_LOCALE } from "./constants";

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATE_RE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** "YYYY-MM" → { start, end } UTC range. Throws on malformed input. */
export function parseMonth(month: string): { start: Date; end: Date } {
  const m = MONTH_RE.exec(month);
  if (!m) throw new Error(`Invalid month "${month}" — expected YYYY-MM`);
  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1;
  return {
    start: new Date(Date.UTC(year, monthIndex, 1)),
    // Date.UTC rolls over to January of the next year automatically.
    end: new Date(Date.UTC(year, monthIndex + 1, 1)),
  };
}

/** "YYYY-MM-DD" → Date at UTC midnight. Throws on malformed or overflowing dates. */
export function parseDate(input: string): Date {
  const m = DATE_RE.exec(input);
  if (!m) throw new Error(`Invalid date "${input}" — expected YYYY-MM-DD`);
  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1;
  const day = Number(m[3]);
  const date = new Date(Date.UTC(year, monthIndex, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthIndex ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid date "${input}"`);
  }
  return date;
}

/** Date → "YYYY-MM-DD" using UTC parts (D13 — no timezone shifting). */
export function formatDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "YYYY-MM" → human label, e.g. "October 2026". */
export function monthLabel(month: string): string {
  const { start } = parseMonth(month);
  return start.toLocaleDateString(APP_LOCALE, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "YYYY-MM" → compact chart label, e.g. "Oct ’26". */
export function shortMonthLabel(month: string): string {
  const { start } = parseMonth(month);
  const monthName = start.toLocaleDateString(APP_LOCALE, {
    month: "short",
    timeZone: "UTC",
  });
  return `${monthName} ’${String(start.getUTCFullYear()).slice(-2)}`;
}

/** Current month as "YYYY-MM", from UTC parts (consistent with stored UTC dates). */
export function currentMonth(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Shift "YYYY-MM" by ±N months, e.g. ("2026-01", -1) → "2025-12". */
export function shiftMonth(month: string, delta: number): string {
  const { start } = parseMonth(month);
  return currentMonth(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + delta, 1)));
}
