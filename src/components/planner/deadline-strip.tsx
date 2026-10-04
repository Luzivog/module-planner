import type { Module } from "@/data/schema"
import { Hint } from "./hint"
import { useTouch } from "@/hooks/use-media"
import { usePlanner } from "@/hooks/use-planner"
import { useTermWeeks } from "@/hooks/use-term-weeks"
import { formatDateTime, formatDay } from "@/lib/time"
import { cn } from "@/lib/utils"
import { deadlinesByWeek } from "@/lib/workload"

/** Weeks with this many deadlines or more get a warning tint. */
const BUSY_WEEK = 3

/**
 * Thin strip under the timetable: one column per week, a marker in the module's
 * colour for each selected module's coursework due that week. Fixed height and
 * columns from all term modules, so toggling never shifts anything.
 */
export function DeadlineStrip({ term }: { term: Module["term"] }) {
  const { data, selected, colors, openSheet } = usePlanner()
  const { mondays, teaching } = useTermWeeks(term)
  const touch = useTouch()
  if (mondays.length === 0) return null
  const weeks = deadlinesByWeek(selected.filter((m) => m.term === term), mondays[0], mondays.length)
  const published = data.modules.some((m) => m.term === term && m.coursework.length > 0)

  return (
    <div className="relative h-12 shrink-0 border-t">
      {/* Scrolls sideways on narrow screens; the "Due" label stays put. */}
      <div className="flex h-full overflow-x-auto overflow-y-hidden px-3 py-1.5 [scrollbar-width:none] sm:px-5">
        <div className="sticky left-0 z-10 w-10 shrink-0 bg-background pt-px text-[10px] text-muted-foreground">Due</div>
        {weeks.map((due, i) => (
          <div key={i} className={cn("min-w-16 flex-1 rounded-sm px-1", due.length >= BUSY_WEEK && "bg-warn/12")}>
            <div className={cn("truncate text-[10px] tabular-nums text-muted-foreground", i >= teaching && "opacity-60")}>
              {i < teaching ? <span className="font-medium">W{i + 1}</span> : "after"} {formatDay(mondays[i])}
            </div>
            <div className="mt-1 flex flex-wrap gap-0.5">
              {due.map((d) => (
                <Hint
                  key={`${d.module.code}-${d.piece.title}-${d.piece.due}`}
                  label={
                    <>
                      <span className="font-medium">{d.module.short}</span>
                      <span>{d.piece.title}</span>
                      <span>due {formatDateTime(d.piece.due)}</span>
                    </>
                  }
                >
                  <button
                    type="button"
                    onClick={touch ? undefined : () => openSheet(d.module.code)}
                    aria-label={`${d.module.short}: ${d.piece.title}`}
                    className="h-2 w-3 rounded-full pointer-coarse:h-3 pointer-coarse:w-4"
                    style={{ background: colors.get(d.module.code) }}
                  />
                </Hint>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!published && (
        <div className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[11px] text-muted-foreground">
          Coursework deadlines not published yet
        </div>
      )}
    </div>
  )
}
