import { CLINIC_TIMEZONE, CLINIC_SLOTS } from "../constants/slots.js";

/**
 * Returns current calendar date in CLINIC_TIMEZONE formatted as "YYYY-MM-DD".
 */
export function getClinicTodayString(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

/**
 * Returns current minutes since midnight in CLINIC_TIMEZONE.
 */
export function getClinicCurrentMinutes(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: CLINIC_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
  return hour * 60 + minute;
}

/**
 * Converts a slot string like "09:30 AM" or "02:00 PM" to minutes since midnight.
 */
export function parseSlotMinutes(slotString) {
  const match = slotString.match(/^(\d{2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return -1;
  let [, h, m, meridiem] = match;
  let hour = parseInt(h, 10);
  const minute = parseInt(m, 10);
  if (meridiem.toUpperCase() === "PM" && hour < 12) hour += 12;
  if (meridiem.toUpperCase() === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

/**
 * Validates whether a date string is a real calendar date (round-trip check).
 * Rejects "2026-02-30", "2026-04-31", invalid leaps, etc.
 */
export function isValidCalendarDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

/**
 * Normalizes a valid "YYYY-MM-DD" string to a Date object at UTC midnight.
 */
export function parseDateToUtc(dateStr) {
  return new Date(`${dateStr}T00:00:00.000Z`);
}
