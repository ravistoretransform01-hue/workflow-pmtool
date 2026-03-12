/**
 * Date utilities for parsing and formatting API date/time strings.
 * Expected input format (from API): "YYYY-MM-DD HH:mm:ss" (seconds optional)
 */

export function parseApiDateTime(input: string | null | undefined): Date | null {
  if (!input || typeof input !== "string" || input.startsWith("0000-00-00")) return null;
  const re = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;
  const m = input.trim().match(re);
  if (!m) return null;
  const [, y, mm, d, hh, min, ss] = m;
  const year = Number(y);
  const month = Number(mm) - 1; // JS Date months are 0-based
  const day = Number(d);
  const hour = Number(hh);
  const minute = Number(min);
  const second = ss ? Number(ss) : 0;

  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

export function formatApiDateTimeToLocale(
  input: string | Date | null | undefined,
  locale = "default",
  options?: Intl.DateTimeFormatOptions
): string {
  const date = typeof input === "string" ? parseApiDateTime(input) : input instanceof Date ? input : null;
  if (!date) return "";

  const opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...options,
  };

  return new Intl.DateTimeFormat(locale, opts).format(date);
}

export function formatApiDateToShortDate(input: string | Date | null | undefined, locale = "default"): string {
  const date = typeof input === "string" ? parseApiDateTime(input) : input instanceof Date ? input : null;
  if (!date) return "";

  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(date);
}

export function formatApiTime(input: string | Date | null | undefined, locale = "default") {
  const date = typeof input === "string" ? parseApiDateTime(input) : input instanceof Date ? input : null;
  if (!date) return "";

  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", hour12: true }).format(date);
}

export function timeAgoFromApiDate(input: string | Date | null | undefined): string {
  const date = typeof input === "string" ? parseApiDateTime(input) : input instanceof Date ? input : null;
  if (!date || isNaN(date.getTime())) return "Recently";

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return formatApiDateTimeToLocale(date);

  const sec = Math.floor(diffMs / 1000);
  if (sec < 10) return "just now";
  if (sec < 60) return `${sec}s ago`;

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;

  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;

  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;

  // Older than a week - show short date
  return formatApiDateToShortDate(date);
}

export default {
  parseApiDateTime,
  formatApiDateTimeToLocale,
  formatApiDateToShortDate,
  formatApiTime,
  timeAgoFromApiDate,
};
