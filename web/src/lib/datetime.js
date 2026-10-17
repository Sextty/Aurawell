export const CLINIC_TIMEZONE = "Africa/Tunis";

/**
 * Current calendar date in the clinic timezone as "YYYY-MM-DD".
 */
export function todayString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Extracts "YYYY-MM-DD" from a date value (ISO string or Date).
 */
export function datePart(value) {
  return typeof value === "string" ? value.slice(0, 10) : new Date(value).toISOString().slice(0, 10);
}

/**
 * True when the appointment's date is before today in the clinic timezone.
 */
export function isPast(appointment) {
  return datePart(appointment.date) < todayString();
}

/**
 * Converts a slot string like "09:30 AM" or "02:00 PM" to minutes since midnight.
 */
export function parseSlotMinutes(slotString) {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(slotString || "");
  if (!match) return Number.MAX_SAFE_INTEGER;
  let [, h, m, meridiem] = match;
  let hour = parseInt(h, 10);
  const minute = parseInt(m, 10);
  if (meridiem.toUpperCase() === "PM" && hour < 12) hour += 12;
  if (meridiem.toUpperCase() === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

/**
 * Sorts appointments by date, then by real slot time (not the "02:00 PM" /
 * "09:30 AM" lexicographic order which puts afternoons before mornings).
 */
export function sortAppointments(list) {
  return [...list].sort((a, b) => {
    const byDate = datePart(a.date).localeCompare(datePart(b.date));
    if (byDate !== 0) return byDate;
    return parseSlotMinutes(a.time) - parseSlotMinutes(b.time);
  });
}
