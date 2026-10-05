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

/** Average weekly hours of a module's sessions: a session running 4 of 8 weeks counts half. */
const hoursOf = (m: Module, video: boolean, teachingWeeks: number) =>
  m.sessions
    .filter((s) => (s.kind === "video") === video)
    .reduce((h, s) => h + (durationMinutes(s) / 60) * Math.min(1, s.weeks / Math.max(1, teachingWeeks)), 0)

export function termWorkload(modules: Module[], teachingWeeks: number): Workload {
  const sum = (f: (m: Module) => number) => modules.reduce((h, m) => h + f(m), 0)
  const pieces = modules.flatMap((m) => m.coursework)
  const inPerson = sum((m) => hoursOf(m, false, teachingWeeks))
  const video = sum((m) => hoursOf(m, true, teachingWeeks))
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
 * Deadlines bucketed into `columns` week columns starting at `monday`: those due
 * before week 1 go in `before`, anything after the last column is clamped into it.
 */
export function deadlinesByWeek(modules: Module[], monday: Date, columns: number): { before: Deadline[]; weeks: Deadline[][] } {
  const before: Deadline[] = []
  const weeks: Deadline[][] = Array.from({ length: columns }, () => [])
  for (const module of modules) {
    for (const piece of module.coursework) {
      const due = new Date(piece.due)
      if (Number.isNaN(due.getTime())) continue
      const i = weekIndex(due, monday)
      if (i < 0) before.push({ module, piece, due })
      else weeks[Math.min(columns - 1, i)].push({ module, piece, due })
    }
  }
  for (const col of [before, ...weeks]) col.sort((a, b) => a.due.getTime() - b.due.getTime())
  return { before, weeks }
}
