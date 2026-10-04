// "HH:MM" helpers for timetable maths.

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

export function durationMinutes(s: { start: string; end: string }): number {
  return toMinutes(s.end) - toMinutes(s.start)
}

/** Compact range for blocks: "10–12" or "10:30–12". */
export function shortRange(start: string, end: string): string {
  const trim = (t: string) => (t.endsWith(":00") ? String(Number(t.slice(0, 2))) : t)
  return `${trim(start)}–${trim(end)}`
}

/** The term a module ran in, from an academic year: ("2024-25", 1) -> "Autumn 2024", ("2024-25", 2) -> "Spring 2025". */
export function runLabel(year: string, term: 1 | 2): string {
  const start = Number(year.slice(0, 4))
  return term === 1 ? `Autumn ${start}` : `Spring ${start + 1}`
}

const DAY_MS = 24 * 60 * 60 * 1000

/** "Tue 8 Dec, 14:00" from an ISO datetime (local time); the raw string if unparseable. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const day = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  return `${day}, ${time}`
}

/** "8 Dec" from an ISO date. */
export function formatDay(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

/**
 * Teaching weeks of a term from its label ("5 Oct – 27 Nov"): the Monday each
 * week starts. `year` is the calendar year the term starts in.
 */
export function teachingWeeks(teaching: string, year: number): Date[] {
  const [from, to] = teaching.split(/\s*[–-]\s*/)
  const start = new Date(`${from} ${year}`)
  let end = new Date(`${to} ${year}`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return []
  if (end < start) end = new Date(`${to} ${year + 1}`)
  // Calendar arithmetic (setDate), not milliseconds: clocks change in late October.
  const monday = addDays(start, -((start.getDay() + 6) % 7))
  const count = Math.floor(Math.round((end.getTime() - monday.getTime()) / DAY_MS) / 7) + 1
  return Array.from({ length: count }, (_, i) => addDays(monday, i * 7))
}

/** 0-based week index of `date` relative to the week starting at `monday` (may be negative). */
export function weekIndex(date: Date, monday: Date): number {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.floor(Math.round((day.getTime() - monday.getTime()) / DAY_MS) / 7)
}

/** `date` moved by whole calendar days, at local midnight. */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}
