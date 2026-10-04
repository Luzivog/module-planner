// Colour rules for 1-5 review scores.

export type Tone = "good" | "bad" | "neutral"

export function scoreTone(score: number, inverse = false): Tone {
  if (inverse) return score <= 3 ? "good" : score >= 4 ? "bad" : "neutral"
  return score >= 4.5 ? "good" : score < 3 ? "bad" : "neutral"
}

export const toneText: Record<Tone, string> = {
  good: "text-good",
  bad: "text-bad",
  neutral: "text-foreground",
}

/** Subtle tile background; the coloured number carries the signal. */
export const toneBg: Record<Tone, string> = {
  good: "bg-good/8",
  bad: "bg-bad/8",
  neutral: "bg-muted/60",
}

/** Fewer reviews than this = treat as thin. */
export const THIN_REVIEWS = 3
