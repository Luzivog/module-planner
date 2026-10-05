import type { Dataset, Module } from "@/data/schema"
import { planConflicts } from "./conflicts"

/** Whole-plan numbers shared by the summary column and the tablet summary bar. */
export function planStats(data: Dataset, selected: Module[]) {
  const rules = data.rules.map((rule) => {
    const ects = selected.filter((m) => m.group === rule.group).reduce((sum, m) => sum + m.ects, 0)
    const status = ects > rule.max ? ("over" as const) : ects >= rule.min ? ("ok" as const) : ("under" as const)
    return { ...rule, ects, status }
  })
  const terms = ([1, 2] as const).map((term) => {
    const mods = selected.filter((m) => m.term === term)
    return { term, count: mods.length, exams: mods.filter((m) => m.examPct > 0).length }
  })
  const avgCoursework = selected.length ? Math.round(selected.reduce((sum, m) => sum + (100 - m.examPct), 0) / selected.length) : 0
  return { rules, terms, conflicts: planConflicts(selected), avgCoursework }
}

/** First-visit guidance, e.g. "Switch modules on to build your plan (45 ECTS of selectives)". */
export function guidance(data: Dataset): string {
  const goal = data.rules.map((r) => `${r.max} ECTS of ${r.group.toLowerCase()}s`).join(" + ")
  return `Switch modules on to build your plan${goal ? ` (${goal})` : ""}`
}

/** "1 exam", "2 exams". */
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`
