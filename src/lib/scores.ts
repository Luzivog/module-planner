// Display rules for 1-5 review scores. Teaching is never coloured: a low score
// from a handful of students isn't a verdict on anyone, so it stays neutral and
// only very high ones are emphasised. Easy difficulty (≤ 3) is shown in green.

export type Tone = "good" | "neutral"

/** Difficulty: 5 = hardest, so a low score is the good news. */
export const difficultyTone = (score: number): Tone => (score <= 3 ? "good" : "neutral")

/** Teaching scores at or above this are shown in bold. */
export const HIGH_TEACHING = 4.5

export const toneText: Record<Tone, string> = {
  good: "text-good",
  neutral: "text-foreground",
}

/** Subtle tile background; the coloured number carries the signal. */
export const toneBg: Record<Tone, string> = {
  good: "bg-good/8",
  neutral: "bg-muted/60",
}

/** Fewer reviews than this = treat as thin. */
export const THIN_REVIEWS = 3
