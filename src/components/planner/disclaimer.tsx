import { Hint } from "./hint"
import { usePlanner } from "@/hooks/use-planner"
import { formatDay } from "@/lib/time"
import { cn } from "@/lib/utils"

/** Where each part of the dataset comes from (tooltip on the data date). */
const SOURCES = [
  "Imperial timetable: sessions, rooms, recording",
  "Scientia: modules, ECTS, exam slots, coursework",
  "Exams site: class averages, examiners' feedback",
  "Rate My Modules: student review scores",
]

/**
 * The unofficial-project notice, shown in every layout. `withClose` adds the
 * selection deadline (tablet, where there's no summary column).
 */
export function Disclaimer({ withClose = false, className }: { withClose?: boolean; className?: string }) {
  const { data } = usePlanner()
  return (
    <p className={cn("text-[11px] leading-snug text-muted-foreground", className)}>
      Unofficial student project, not affiliated with Imperial ·{" "}
      <Hint label={SOURCES.map((s) => <span key={s}>{s}</span>)}>
        <span className="underline decoration-dotted underline-offset-2">data as of {formatDay(data.generatedAt)}</span>
      </Hint>{" "}
      · check Scientia before choosing.
      {withClose && <> Choices close {formatDay(data.selection.closes)}.</>}
    </p>
  )
}
