import { createContext, useContext } from "react"
import type { Dataset, Module } from "@/data/schema"
import type { LecturerReview } from "@/lib/lecturers"

/** Everything the planner panels share: data, derived lookups and actions. */
export type Planner = {
  data: Dataset
  byCode: Map<string, Module>
  colors: Map<string, string>
  lecturerIndex: Map<string, LecturerReview[]>
  /** Selected modules that exist in the dataset. */
  selected: Module[]
  isSelected: (code: string) => boolean
  toggle: (code: string) => void
  openSheet: (code: string) => void
}

export const PlannerContext = createContext<Planner | null>(null)

export function usePlanner(): Planner {
  const planner = useContext(PlannerContext)
  if (!planner) throw new Error("usePlanner outside PlannerContext")
  return planner
}

export const TERM_NAMES = { 1: "Autumn", 2: "Spring" } as const satisfies Record<Module["term"], string>
