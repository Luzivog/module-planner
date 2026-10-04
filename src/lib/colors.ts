import type { Module } from "@/data/schema"

// Calm, distinct hues (oklch). Blocks use a light tint of each with dark text.
const PALETTE = [
  "oklch(0.64 0.13 25)", // coral
  "oklch(0.72 0.13 65)", // orange
  "oklch(0.78 0.12 95)", // amber
  "oklch(0.68 0.12 135)", // leaf
  "oklch(0.66 0.10 175)", // teal
  "oklch(0.68 0.10 215)", // sky
  "oklch(0.60 0.13 260)", // blue
  "oklch(0.60 0.14 295)", // violet
  "oklch(0.62 0.13 340)", // pink
  "oklch(0.60 0.04 250)", // slate
] as const

function hash(s: string): number {
  let h = 5381
  for (const ch of s) h = (h * 33) ^ ch.charCodeAt(0)
  return Math.abs(h)
}

/**
 * Colour per module code: its hash picks a palette slot. Terms have more
 * modules than hues, so among the *selected* modules of a term, collisions are
 * resolved by probing forward in code order: a module only changes colour when
 * an earlier-coded selected module already holds its hue.
 */
export function assignColors(modules: Module[], selected: Set<string>): Map<string, string> {
  const colors = new Map<string, string>()
  for (const term of [1, 2] as const) {
    const used = new Set<number>()
    const inTerm = modules.filter((m) => m.term === term).sort((a, b) => a.code.localeCompare(b.code))
    for (const m of inTerm) {
      let i = hash(m.code) % PALETTE.length
      if (selected.has(m.code)) {
        for (let tries = 0; used.has(i) && tries < PALETTE.length; tries++) i = (i + 1) % PALETTE.length
        used.add(i)
      }
      colors.set(m.code, PALETTE[i])
    }
  }
  return colors
}

/** Soft tint of a palette colour over the page background (stronger in dark mode via --tint-scale). */
export function tint(color: string, pct = 16): string {
  // oklab, not oklch: the grey background has hue 0, which would drag every tint towards pink.
  return `color-mix(in oklab, ${color} calc(${pct}% * var(--tint-scale)), var(--background))`
}
