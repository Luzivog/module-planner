import type { Mean } from "@/data/schema"

export const CAP_NOTE = "Since 2024-25, class averages above 75 are scaled down to 75, so 75.0 means 'at least 75'."

/** A 2024-25-or-later mean at the 75 cap (75.0–75.2), i.e. "at least 75". */
export function isCapped(x: Mean): boolean {
  const startYear = Number(x.year.slice(0, 4))
  return startYear >= 2024 && x.mean >= 75 && Math.round(x.mean * 10) <= 752
}

/** Tooltip for a mean set when a different team taught the module. */
export const otherTeamNote = (year: string) => `Set in ${year}, when a different team taught it`
