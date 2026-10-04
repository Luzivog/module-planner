import type { Coursework, Module } from "@/data/schema"
import { durationMinutes, weekIndex } from "./time"

/** Weekly hour estimate for a set of modules in one term, with its parts. */
export type Workload = {
  inPerson: number
  video: number
  extra: number
  /** Coursework hours spread evenly over the teaching weeks. */
  coursework: number
  total: number
  /** Modules with a coursework component but no published pieces yet. */
  unpublished: Module[]
  /** Published pieces without an hour estimate. */
  unestimated: number
}

const hoursOf = (m: Module, video: boolean) =>
  m.sessions.filter((s) => (s.kind === "video") === video).reduce((h, s) => h + durationMinutes(s) / 60, 0)

export function termWorkload(modules: Module[], teachingWeeks: number): Workload {
  const sum = (f: (m: Module) => number) => modules.reduce((h, m) => h + f(m), 0)
  const pieces = modules.flatMap((m) => m.coursework)
  const inPerson = sum((m) => hoursOf(m, false))
  const video = sum((m) => hoursOf(m, true))
  const extra = sum((m) => m.notes.extraHoursPerWeek ?? 0)
  const coursework = pieces.reduce((h, p) => h + (p.hours ?? 0), 0) / Math.max(1, teachingWeeks)
  return {
    inPerson,
    video,
    extra,
    coursework,
    total: inPerson + video + extra + coursework,
    unpublished: modules.filter((m) => m.examPct < 100 && m.coursework.length === 0),
    unestimated: pieces.filter((p) => p.hours === null).length,
  }
}

/** A coursework piece placed on the deadline strip. */
export type Deadline = { module: Module; piece: Coursework; due: Date }

/**
 * Deadlines bucketed into `columns` week columns starting at `monday`
 * (anything earlier/later is clamped into the first/last column).
 */
export function deadlinesByWeek(modules: Module[], monday: Date, columns: number): Deadline[][] {
  const out: Deadline[][] = Array.from({ length: columns }, () => [])
  for (const module of modules) {
    for (const piece of module.coursework) {
      const due = new Date(piece.due)
      if (Number.isNaN(due.getTime())) continue
      const i = Math.min(columns - 1, Math.max(0, weekIndex(due, monday)))
      out[i].push({ module, piece, due })
    }
  }
  for (const col of out) col.sort((a, b) => a.due.getTime() - b.due.getTime())
  return out
}
