import { z } from "zod"
import { Day, type Module } from "@/data/schema"
import { conflictsWith } from "./conflicts"
import { teamVsReviewed } from "./lecturers"
import { THIN_REVIEWS } from "./scores"
import { toMinutes } from "./time"

/** Every list filter; the schema doubles as the localStorage validator (bad/old data falls back to defaults). */
export const Filters = z.object({
  /** Hide modules with an in-person session starting before this hour. */
  startFrom: z.number().int().nullable().catch(null),
  sameLecturer: z.boolean().catch(false),
  fitsPlan: z.boolean().catch(false),
  exam: z.enum(["any", "max70", "none"]).catch("any"),
  recorded: z.boolean().catch(false),
  /** Hide modules with an in-person session on this day. */
  freeDay: Day.nullable().catch(null),
  teaching4: z.boolean().catch(false),
  /** Only with teaching4: also require at least THIN_REVIEWS reviews. */
  teachingSolid: z.boolean().catch(false),
  difficulty3: z.boolean().catch(false),
  average70: z.boolean().catch(false),
  hasRun: z.boolean().catch(false),
})
export type Filters = z.infer<typeof Filters>

export const NO_FILTERS: Filters = Filters.parse({})

export const START_HOURS = [9, 10, 11, 12, 13, 14] as const

/** Context a filter may need besides the module itself. */
type Ctx = { selected: Module[] }

const inPerson = (m: Module) => m.sessions.filter((s) => s.kind !== "video")

// Each entry: is the filter on, and does the module pass it.
// `label` names the filter in the "doesn't pass" tooltip.
const RULES: { label: (f: Filters, m: Module) => string; on: (f: Filters) => boolean; pass: (m: Module, f: Filters, ctx: Ctx) => boolean }[] = [
  { label: (f) => `From ${String(f.startFrom).padStart(2, "0")}:00`, on: (f) => f.startFrom !== null, pass: (m, f) => inPerson(m).every((s) => toMinutes(s.start) >= (f.startFrom ?? 0) * 60) },
  // Modules whose last-year team is unknown don't pass either (the tooltip says why).
  {
    label: (_f, m) => (teamVsReviewed(m) === "unknown" ? "Same lecturer (last year unknown)" : "Same lecturer"),
    on: (f) => f.sameLecturer,
    pass: (m) => teamVsReviewed(m) === "same",
  },
  { label: () => "Fits my plan", on: (f) => f.fitsPlan, pass: (m, _f, ctx) => conflictsWith(m, ctx.selected).length === 0 },
  { label: (f) => (f.exam === "none" ? "No exam" : "≤ 70% exam"), on: (f) => f.exam !== "any", pass: (m, f) => (f.exam === "none" ? m.examPct === 0 : m.examPct <= 70) },
  { label: () => "Recorded", on: (f) => f.recorded, pass: (m) => m.sessions.filter((s) => s.kind === "lecture").every((s) => s.recorded === true) },
  { label: (f) => `${f.freeDay} free`, on: (f) => f.freeDay !== null, pass: (m, f) => inPerson(m).every((s) => s.day !== f.freeDay) },
  {
    label: () => "Teaching ≥ 4",
    on: (f) => f.teaching4,
    pass: (m, f) => m.reviews !== null && m.reviews.teaching >= 4 && (!f.teachingSolid || m.reviews.count >= THIN_REVIEWS),
  },
  { label: () => "Difficulty ≤ 3", on: (f) => f.difficulty3, pass: (m) => m.reviews !== null && m.reviews.difficulty <= 3 },
  { label: () => "Average ≥ 70", on: (f) => f.average70, pass: (m) => (m.means[0]?.mean ?? 0) >= 70 },
  { label: () => "Has run before", on: (f) => f.hasRun, pass: (m) => m.means.length > 0 },
]

/** Labels of the active filters the module fails. A selected module is checked against the
 * other picks only (it can't conflict with itself). */
export function failedFilters(m: Module, f: Filters, ctx: Ctx): string[] {
  const others = { selected: ctx.selected.filter((s) => s.code !== m.code) }
  return RULES.filter((r) => r.on(f) && !r.pass(m, f, others)).map((r) => r.label(f, m))
}

/** True if the module should be listed: selected modules always are (dimmed if they fail). */
export function passes(m: Module, f: Filters, ctx: Ctx): boolean {
  return ctx.selected.some((s) => s.code === m.code) || failedFilters(m, f, ctx).length === 0
}

/** Number of active filters (the "≥ 3 reviews" sub-toggle doesn't count on its own). */
export function activeCount(f: Filters): number {
  return RULES.filter((r) => r.on(f)).length
}

/** Active filters among the "More" popover's ones. */
export function moreCount(f: Filters): number {
  return [f.freeDay !== null, f.teaching4, f.difficulty3, f.average70, f.hasRun].filter(Boolean).length
}
