import { cn } from "@/lib/utils"

/** Exam (dark slate) vs coursework (emerald) share. `lg` adds labels. */
export function SplitBar({ examPct, size = "sm", className }: { examPct: number; size?: "sm" | "lg"; className?: string }) {
  const bar = (
    <div className={cn("flex overflow-hidden rounded-full bg-coursework", size === "sm" ? "h-1.5" : "h-2.5", className)}>
      <div className="bg-exam" style={{ width: `${examPct}%` }} />
    </div>
  )
  if (size === "sm") return bar
  return (
    <div className="space-y-1">
      {bar}
      <div className="flex justify-between text-xs">
        <span>
          <span className="font-semibold tabular-nums">{examPct}%</span> <span className="text-muted-foreground">exam</span>
        </span>
        <span>
          <span className="text-muted-foreground">coursework</span>{" "}
          <span className="font-semibold tabular-nums text-good">{100 - examPct}%</span>
        </span>
      </div>
    </div>
  )
}
