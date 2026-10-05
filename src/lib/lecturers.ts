import type { Module } from "@/data/schema"

/** Lookup key for a lecturer name: case- and whitespace-insensitive. */
const nameKey = (n: string) => n.trim().replace(/\s+/g, " ").toLowerCase()

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

/** How this year's team compares with the team the reviews describe
 * (`reviews.team`, or last year's team when there are no reviews or they don't say). */
export function teamVsReviewed(m: Module): TeamChange {
  const reviewed = m.reviews?.team ?? m.lecturers.lastYear
  if (reviewed === null) return "unknown"
  return sameNames(m.lecturers.now, reviewed) ? "same" : "different"
}
