import { useCallback, useState } from "react"
import { readStorage, writeStorage } from "@/lib/storage"

/** A column width kept in localStorage, clamped to [min, max]. */
export function useColumnWidth(key: string, initial: number, min: number, max: number) {
  const clamp = useCallback((w: number) => Math.min(max, Math.max(min, w)), [min, max])
  const [width, setWidth] = useState(() => {
    const saved = Number(readStorage(key))
    return saved ? clamp(saved) : initial
  })
  const update = useCallback(
    (w: number) => {
      const next = clamp(w)
      setWidth(next)
      writeStorage(key, String(next))
    },
    [key, clamp],
  )
  return { width, setWidth: update, reset: () => update(initial), min, max }
}
