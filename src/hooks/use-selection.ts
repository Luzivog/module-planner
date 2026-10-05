import { useCallback, useEffect, useState } from "react"
import { readStorage, writeStorage } from "@/lib/storage"

const STORAGE_KEY = "module-planner:selection"

/**
 * "own": the visitor's plan, saved in localStorage.
 * "shared": a plan from a ?m= link that differs from theirs; shown but not saved
 * until they pick "Use this one" or edit it, so a link never overwrites `mine`.
 */
type SelectionState = { mode: "own"; codes: string[] } | { mode: "shared"; codes: string[]; mine: string[] }

/** Known codes only, no duplicates, sorted (the stored and shared form). */
function clean(raw: string | null, valid: ReadonlySet<string>): string[] {
  if (!raw) return []
  const codes = raw.split(",").map((c) => c.trim()).filter((c) => valid.has(c))
  return [...new Set(codes)].sort()
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((c) => b.includes(c))

function initial(valid: ReadonlySet<string>): SelectionState {
  const mine = clean(readStorage(STORAGE_KEY), valid)
  const shared = clean(new URLSearchParams(window.location.search).get("m"), valid)
  // An empty or unknown-only ?m= is ignored rather than wiping anything.
  if (shared.length === 0 || sameSet(shared, mine)) return { mode: "own", codes: mine }
  return { mode: "shared", codes: shared, mine }
}

/** Mirrors the plan in ?m= (dropped when empty), so the address bar is always a shareable link. */
function writeUrl(codes: string[]) {
  const url = new URL(window.location.href)
  if (codes.length > 0) url.searchParams.set("m", codes.join(","))
  else url.searchParams.delete("m")
  window.history.replaceState(null, "", url.toString().replace(/%2C/g, ","))
}

/**
 * Selected module codes (only codes in `valid`). Saved to localStorage and
 * mirrored in the URL; a shared link is previewed until the visitor chooses.
 */
export function useSelection(valid: ReadonlySet<string>) {
  const [state, setState] = useState<SelectionState>(() => initial(valid))

  useEffect(() => {
    if (state.mode === "own") writeStorage(STORAGE_KEY, state.codes.join(","))
    writeUrl(state.codes)
  }, [state])

  // Editing a shared plan adopts it as yours.
  const toggle = useCallback((code: string) => {
    setState((s) => {
      const codes = s.codes.includes(code) ? s.codes.filter((c) => c !== code) : [...s.codes, code].sort()
      return { mode: "own", codes }
    })
  }, [])

  const keepMine = useCallback(() => setState((s) => (s.mode === "shared" ? { mode: "own", codes: s.mine } : s)), [])
  const adoptShared = useCallback(() => setState((s) => ({ mode: "own", codes: s.codes })), [])

  return {
    codes: state.codes,
    toggle,
    /** Set while previewing someone else's plan; `hasMine` = the visitor has a saved plan of their own. */
    shared: state.mode === "shared" ? { hasMine: state.mine.length > 0 } : null,
    keepMine,
    adoptShared,
  }
}
