import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "module-planner:selection"
// New visitors start with an empty plan; a shared ?m= link restores someone's picks.
const DEFAULT: string[] = []

const parseCodes = (raw: string) => raw.split(",").map((c) => c.trim()).filter(Boolean)

// URL (?m=...) wins, then localStorage, then an empty plan.
function initialSelection(): string[] {
  const fromUrl = new URLSearchParams(window.location.search).get("m")
  if (fromUrl !== null) return parseCodes(fromUrl)
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored !== null) return parseCodes(stored)
  return DEFAULT
}

/** Selected module codes, persisted to localStorage and mirrored in ?m= for sharing. */
export function useSelection() {
  const [codes, setCodes] = useState<string[]>(initialSelection)

  useEffect(() => {
    const joined = [...codes].sort().join(",")
    localStorage.setItem(STORAGE_KEY, joined)
    const url = new URL(window.location.href)
    url.searchParams.set("m", joined)
    window.history.replaceState(null, "", url.toString().replace(/%2C/g, ","))
  }, [codes])

  const toggle = useCallback((code: string) => {
    setCodes((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))
  }, [])

  return { codes, toggle }
}
