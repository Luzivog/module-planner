/**
 * Exam mark (0-100) needed to reach `target` overall given a coursework mark,
 * or null when even 100% isn't enough. Assumes examPct > 0.
 */
export function examNeeded(target: number, coursework: number, examPct: number): number | null {
  const e = examPct / 100
  const need = (target - coursework * (1 - e)) / e
  if (need > 100) return null
  return Math.max(0, Math.ceil(need))
}
