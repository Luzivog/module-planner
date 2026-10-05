import { TriangleAlert } from "lucide-react"
import { ConflictList, CopyLink } from "./summary"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TERM_NAMES, usePlanner } from "@/hooks/use-planner"
import { planStats, plural } from "@/lib/plan"
import { cn } from "@/lib/utils"

/** Tablet: the summary column squeezed into one bar above the timetable. */
export function SummaryBar() {
  const { data, selected } = usePlanner()
  const { rules, terms, conflicts } = planStats(data, selected)
  return (
    <div className="flex h-11 shrink-0 items-center gap-4 border-b px-4 text-xs">
      {rules.map((r) => (
        <span key={r.group} className="flex items-baseline gap-1">
          <span className={cn("text-base font-semibold tabular-nums", r.status === "ok" ? "text-good" : r.status === "over" && "text-bad")}>
            {r.ects}
          </span>
          <span className="text-muted-foreground tabular-nums">/{r.max} ECTS</span>
        </span>
      ))}
      {terms.map((t) => (
        <span key={t.term} className="text-muted-foreground tabular-nums">
          <span className="font-medium text-foreground">{t.count}</span> {TERM_NAMES[t.term].toLowerCase()} · {plural(t.exams, "exam")}
        </span>
      ))}
      <span className="ml-auto flex items-center gap-2">
        {conflicts.length > 0 && (
          <Popover>
            <PopoverTrigger className="inline-flex h-7 items-center gap-1 rounded-full bg-bad/10 px-2.5 font-medium text-bad">
              <TriangleAlert className="size-3.5" />
              {conflicts.length}
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-3">
              <ConflictList conflicts={conflicts} />
            </PopoverContent>
          </Popover>
        )}
        <CopyLink compact />
      </span>
    </div>
  )
}
