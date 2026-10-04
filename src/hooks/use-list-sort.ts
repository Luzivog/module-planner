import { useCallback, useEffect, useState } from "react"
import type { Module } from "@/data/schema"

const STORAGE_KEY = "module-planner:sort"

export type SortKey = "teaching" | "mean"
export type ListSort = { key: SortKey; dir: "desc" | "asc" } | null

const VALUE: Record<SortKey, (m: Module) => number | null> = {
  teaching: (m) => m.reviews?.teaching ?? null,
  mean: (m) => m.means[0]?.mean ?? null,
}

function readSort(): ListSort {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")
    if (typeof v === "object" && v !== null && "key" in v && "dir" in v) {
      const { key, dir } = v
      if ((key === "teaching" || key === "mean") && (dir === "asc" || dir === "desc")) return { key, dir }
    }
  } catch {
    // ignore malformed storage
  }
  return null
}

/**
 * Column sort for the module list (persisted). Clicking a column cycles
 * desc -> asc -> default. Default = selected first, then code.
 */
export function useListSort() {
  const [sort, setSort] = useState<ListSort>(readSort)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sort))
  }, [sort])

  const cycle = useCallback((key: SortKey) => {
    setSort((s) => (s?.key !== key ? { key, dir: "desc" } : s.dir === "desc" ? { key, dir: "asc" } : null))
  }, [])

  const compare = useCallback(
    (isSelected: (code: string) => boolean) =>
      (a: Module, b: Module): number => {
        if (!sort) return Number(isSelected(b.code)) - Number(isSelected(a.code)) || a.code.localeCompare(b.code)
        const va = VALUE[sort.key](a)
        const vb = VALUE[sort.key](b)
        // Missing values sort last in both directions.
        if (va === null || vb === null) return (va === null ? 1 : 0) - (vb === null ? 1 : 0) || a.code.localeCompare(b.code)
        return (sort.dir === "desc" ? vb - va : va - vb) || a.code.localeCompare(b.code)
      },
    [sort],
  )

  return { sort, cycle, compare }
}
