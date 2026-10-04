import { useCallback, useEffect, useState } from "react"

// Must match the inline script in index.html.
const STORAGE_KEY = "module-planner:theme"
const media = window.matchMedia("(prefers-color-scheme: dark)")

type Override = "light" | "dark" | null

function readOverride(): Override {
  const v = localStorage.getItem(STORAGE_KEY)
  return v === "light" || v === "dark" ? v : null
}

/** Dark mode: follows the system until the user toggles, then the override is persisted. */
export function useTheme() {
  const [override, setOverride] = useState<Override>(readOverride)
  const [systemDark, setSystemDark] = useState(media.matches)
  const dark = override ? override === "dark" : systemDark

  useEffect(() => {
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
  }, [dark])

  const toggle = useCallback(() => {
    const next = dark ? "light" : "dark"
    localStorage.setItem(STORAGE_KEY, next)
    setOverride(next)
  }, [dark])

  return { dark, toggle }
}
