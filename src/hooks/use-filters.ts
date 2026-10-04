import { useCallback, useEffect, useState } from "react"
import { Filters, NO_FILTERS } from "@/lib/filters"

const STORAGE_KEY = "module-planner:filters"

function readFilters(): Filters {
  try {
    return Filters.parse(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"))
  } catch {
    return NO_FILTERS
  }
}

/** List filters, persisted in localStorage. `set` patches; `clear` resets all. */
export function useFilters() {
  const [filters, setFilters] = useState<Filters>(readFilters)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
  }, [filters])

  const set = useCallback((patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch })), [])
  const clear = useCallback(() => setFilters(NO_FILTERS), [])

  return { filters, set, clear }
}
