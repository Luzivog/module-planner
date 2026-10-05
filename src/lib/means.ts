import type { Mean, Module } from "@/data/schema"
import { includesName } from "@/lib/lecturers"

export const CAP_NOTE = "Since 2024-25, class averages above 75 are scaled down to 75, so 75.0 means 'at least 75'."

/** A 2024-25-or-later mean at the 75 cap (75.0–75.2), i.e. "at least 75". */
export function isCapped(x: Mean): boolean {
  const startYear = Number(x.year.slice(0, 4))
  return startYear >= 2024 && x.mean >= 75 && Math.round(x.mean * 10) <= 752
}

/** Tooltip for a mean set when a different team taught the module. */
export const otherTeamNote = (year: string) => `Set in ${year}, when a different team taught it`

/** Tooltip for a mean whose year's team isn't known. */
export const UNKNOWN_TEAM_NOTE = "Who taught this year isn't known"

/** Who set a mean compared with this year's team: "different" when none of that year's
 * lecturers teach it now (a partly changed team, e.g. one co-lecturer added, still counts
 * as the same); "unknown" when that year's team isn't known. */
export function meanTeam(m: Module, x: Mean): "same" | "different" | "unknown" {
  if (x.team === null || x.team.length === 0) return "unknown"
  return x.team.some((n) => includesName(m.lecturers.now, n)) ? "same" : "different"
}
