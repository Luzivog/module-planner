import type { Module } from "@/data/schema"

/** A module-level review signal attributed to one of last year's lecturers. */
export type LecturerReview = {
  code: string
  short: string
  teaching: number
  count: number
  /** The other lecturers credited with the same module rating. */
  sharedWith: string[]
}

/** Lookup key for a lecturer name: case- and whitespace-insensitive. */
export const nameKey = (n: string) => n.trim().replace(/\s+/g, " ").toLowerCase()

/** Same people, ignoring order and case. */
export function sameNames(a: string[], b: string[]): boolean {
  const ka = new Set(a.map(nameKey))
  const kb = new Set(b.map(nameKey))
  return ka.size === kb.size && [...ka].every((k) => kb.has(k))
}

export function includesName(names: string[], name: string): boolean {
  return names.some((n) => nameKey(n) === nameKey(name))
}

/** How this year's team compares with last year's (who the reviews describe). */
export type TeamChange = "same" | "different" | "unknown"

export function teamVsLastYear(m: Module): TeamChange {
  const { now, lastYear } = m.lecturers
  if (lastYear === null) return "unknown"
  return sameNames(now, lastYear) ? "same" : "different"
}

/** Who set the latest published mean, when known and none of them teach it now; else null.
 * (A partly changed team, e.g. one co-lecturer added, still counts as the same.) */
export function meanSetByOthers(m: Module): string[] | null {
  const { now, meanYear } = m.lecturers
  if (meanYear === null || meanYear.length === 0) return null
  return meanYear.some((n) => includesName(now, n)) ? null : meanYear
}

/**
 * Lecturer name key -> teaching scores of modules they taught last year. Reviews
 * describe last year's run, so they're credited to `lecturers.lastYear`.
 */
export function buildLecturerIndex(modules: Module[]): Map<string, LecturerReview[]> {
  const index = new Map<string, LecturerReview[]>()
  for (const m of modules) {
    if (!m.reviews || !m.lecturers.lastYear) continue
    const team = m.lecturers.lastYear
    for (const name of team) {
      const entry = {
        code: m.code,
        short: m.short,
        teaching: m.reviews.teaching,
        count: m.reviews.count,
        sharedWith: team.filter((n) => nameKey(n) !== nameKey(name)),
      }
      index.set(nameKey(name), [...(index.get(nameKey(name)) ?? []), entry])
    }
  }
  return index
}
