import type { Module } from "@/data/schema"
import { usePlanner } from "./use-planner"
import { addDays, teachingWeeks, weekIndex } from "@/lib/time"

/** Extra columns allowed after teaching for late deadlines (e.g. exam weeks). */
const MAX_EXTRA_WEEKS = 4

/**
 * Week columns for a term's deadline strip: the teaching weeks (Mondays parsed
 * from the term label; autumn's year comes from the selection deadline), plus
 * enough extra weeks for any module's late deadline. Computed from *all* the
 * term's modules so toggling never changes the strip.
 */
export function useTermWeeks(term: Module["term"]): { mondays: Date[]; teaching: number; hasBefore: boolean } {
  const { data } = usePlanner()
  const year = new Date(data.selection.closes).getFullYear() + (term === 2 ? 1 : 0)
  const teach = teachingWeeks(data.terms[term].teaching, year)
  if (teach.length === 0) return { mondays: [], teaching: 0, hasBefore: false }
  const dueWeeks = data.modules
    .filter((m) => m.term === term)
    .flatMap((m) => m.coursework.map((c) => weekIndex(new Date(c.due), teach[0])))
    .filter((i) => Number.isFinite(i))
  const lastDue = Math.max(0, ...dueWeeks)
  const extra = Math.min(MAX_EXTRA_WEEKS, Math.max(0, lastDue + 1 - teach.length))
  const mondays = [...teach, ...Array.from({ length: extra }, (_, i) => addDays(teach[teach.length - 1], (i + 1) * 7))]
  // A "before" column exists when any module of the term has a deadline before week 1.
  return { mondays, teaching: teach.length, hasBefore: dueWeeks.some((i) => i < 0) }
}
