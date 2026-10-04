import { Flower2, Leaf } from "lucide-react"
import { Hint } from "./hint"
import type { Module } from "@/data/schema"
import { usePlanner } from "@/hooks/use-planner"
import { cn } from "@/lib/utils"

/** The same module offered in the other term (same title, different code), if any. */
function useTermTwin(m: Module): Module | undefined {
  const { byCode } = usePlanner()
  return m.excludes.map((c) => byCode.get(c)).find((t) => t && t.term !== m.term && t.title === m.title)
}

/**
 * Leaf + flower icons for a module tied to both terms: either offered in each
 * term (a twin code) or running across both (`spansTerms`, e.g. the ISO).
 */
export function BothTerms({ m }: { m: Module }) {
  const twin = useTermTwin(m)
  if (!twin && !m.spansTerms) return null
  const label = twin ? (
    <>
      <span className="font-medium">Offered in both terms</span>
      <span>
        Autumn ({m.term === 1 ? m.code : twin.code}) and Spring ({m.term === 2 ? m.code : twin.code}): same module, take only one.
      </span>
    </>
  ) : (
    <>
      <span className="font-medium">Runs across both terms</span>
      <span>Needs a supervisor.</span>
    </>
  )
  return (
    <Hint label={label}>
      <span className="inline-flex shrink-0 items-center gap-0.5 align-middle" aria-label={twin ? "Offered in both terms" : "Runs across both terms"}>
        <Leaf className="size-4 text-orange-500 dark:text-orange-400" />
        <Flower2 className="size-4 text-pink-500 dark:text-pink-400" />
      </span>
    </Hint>
  )
}

/** Small tag for modules that run across both terms (e.g. the ISO). */
export function SpansTermsTag({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex h-4 items-center rounded-sm bg-muted px-1.5 text-[10px] whitespace-nowrap text-muted-foreground", className)}>
      both terms · needs a supervisor
    </span>
  )
}
