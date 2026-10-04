import type { Day, Module, Session } from "@/data/schema"
import { toMinutes } from "./time"

/** Why two modules can't comfortably be taken together. */
export type Conflict =
  | { kind: "time"; a: Module; b: Module; day: Day; start: string; end: string }
  | { kind: "examSlot"; a: Module; b: Module; slot: string }
  | { kind: "excludes"; a: Module; b: Module }

export const isInPerson = (s: Session) => s.kind !== "video"

export function sessionsOverlap(a: Session, b: Session): boolean {
  return a.day === b.day && toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end)
}

/** All conflicts between two modules (at most one time clash is reported). */
export function conflictsBetween(a: Module, b: Module): Conflict[] {
  const out: Conflict[] = []
  if (a.term === b.term) {
    outer: for (const sa of a.sessions.filter(isInPerson)) {
      for (const sb of b.sessions.filter(isInPerson)) {
        if (sessionsOverlap(sa, sb)) {
          const start = toMinutes(sa.start) > toMinutes(sb.start) ? sa.start : sb.start
          const end = toMinutes(sa.end) < toMinutes(sb.end) ? sa.end : sb.end
          out.push({ kind: "time", a, b, day: sa.day, start, end })
          break outer
        }
      }
    }
  }
  if (a.examSlot !== null && a.examSlot === b.examSlot) out.push({ kind: "examSlot", a, b, slot: a.examSlot })
  if (a.excludes.includes(b.code) || b.excludes.includes(a.code)) out.push({ kind: "excludes", a, b })
  return out
}

/** Conflicts between `m` and the selected modules (excluding itself). */
export function conflictsWith(m: Module, selected: Module[]): Conflict[] {
  return selected.filter((o) => o.code !== m.code).flatMap((o) => conflictsBetween(m, o))
}

/** Every pairwise conflict inside a plan. */
export function planConflicts(selected: Module[]): Conflict[] {
  return selected.flatMap((a, i) => selected.slice(i + 1).flatMap((b) => conflictsBetween(a, b)))
}

/** One-line description, phrased from `a`'s point of view. */
export function describeConflict(c: Conflict): string {
  switch (c.kind) {
    case "time":
      return `Clashes with ${c.b.short} · ${c.day} ${c.start}–${c.end}`
    case "examSlot":
      return `Same exam slot as ${c.b.short} (${c.slot})`
    case "excludes":
      return c.a.title === c.b.title ? `Same module as ${c.b.short} in the other term: take only one` : `Can't be taken with ${c.b.short}`
  }
}
