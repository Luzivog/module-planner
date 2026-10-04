import { Check, Link } from "lucide-react"
import { useState, type ReactNode } from "react"
import { Hint } from "./hint"
import { SplitBar } from "./split-bar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { TERM_NAMES, usePlanner } from "@/hooks/use-planner"
import type { Conflict } from "@/lib/conflicts"
import { planStats } from "@/lib/plan"
import { cn } from "@/lib/utils"

/** Right column (desktop) / Plan tab (phone): whole-plan health in a few big numbers. `footer` goes at the very bottom. */
export function Summary({ footer }: { footer?: ReactNode }) {
  const { data, selected } = usePlanner()
  const { rules, terms, conflicts, avgCoursework } = planStats(data, selected)

  return (
    <aside className="flex h-full min-h-0 w-full flex-col gap-5 overflow-y-auto p-4">
      {rules.map(({ ects, status, ...rule }) => {
        const ok = status === "ok"
        return (
          <div key={rule.group} className="space-y-1.5">
            <div className="flex items-baseline gap-1">
              <span className={cn("text-3xl font-semibold tabular-nums", ok ? "text-good" : ects > rule.max ? "text-bad" : "")}>
                {ects}
              </span>
              <span className="text-lg text-muted-foreground tabular-nums">/{rule.max}</span>
              <span className="ml-auto text-xs text-muted-foreground">ECTS · {rule.group.toLowerCase()}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", ok ? "bg-coursework" : ects > rule.max ? "bg-bad" : "bg-exam")}
                style={{ width: `${Math.min(100, (ects / rule.max) * 100)}%` }}
              />
            </div>
          </div>
        )
      })}

      <div className="grid grid-cols-2 gap-2">
        {terms.map((t) => (
          <div key={t.term} className="rounded-lg bg-muted/60 p-2.5">
            <div className="text-xs text-muted-foreground">{TERM_NAMES[t.term]}</div>
            <div className="text-2xl font-semibold tabular-nums">{t.count}</div>
            <div className="text-xs text-muted-foreground tabular-nums">{t.exams} exams</div>
          </div>
        ))}
      </div>

      {/* Conflicts only take space when there are some. */}
      {conflicts.length > 0 && (
        <div className="rounded-lg bg-bad/8 p-2.5">
          <ConflictList conflicts={conflicts} />
        </div>
      )}

      <Separator />
      <div className="space-y-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-semibold tabular-nums text-good">{avgCoursework}%</span>
          <span className="text-xs text-muted-foreground">avg coursework</span>
        </div>
        <SplitBar examPct={100 - avgCoursework} />
      </div>

      <div className="mt-auto space-y-2 text-xs text-muted-foreground">
        <CopyLink />
        <div className="space-y-0.5 text-center">
          <p>
            <span className="font-medium text-foreground">Both terms</span> close {formatDate(data.selection.closes)}
          </p>
          <p>Spring picks can be swapped until 29 Jan (end of week 4), but not how many.</p>
        </div>
        <Hint
          label={
            <>
              <span>Imperial timetable: sessions, rooms, recording</span>
              <span>Scientia: modules, ECTS, exam slots, coursework</span>
              <span>Exams site: class averages, papers, examiners' reports</span>
              <span>Rate My Modules: student reviews</span>
            </>
          }
        >
          <p className="truncate text-center text-[10px] text-muted-foreground/80">
            Data: timetable, Scientia, exams, RMM · {formatDate(data.generatedAt)}
          </p>
        </Hint>
        {footer}
      </div>
    </aside>
  )
}

/** "N conflicts" heading plus one line per conflict; module names open their sheet. */
export function ConflictList({ conflicts }: { conflicts: Conflict[] }) {
  const { openSheet } = usePlanner()
  return (
    <div className="space-y-1.5 text-xs">
      <div className="font-medium text-bad">{conflicts.length === 1 ? "1 conflict" : `${conflicts.length} conflicts`}</div>
      <ul className="space-y-1">
        {conflicts.map((c) => (
          <li key={`${c.kind}-${c.a.code}-${c.b.code}`} className="flex flex-wrap gap-x-1">
            <button type="button" className="hover:underline" onClick={() => openSheet(c.a.code)}>{c.a.short}</button>×
            <button type="button" className="hover:underline" onClick={() => openSheet(c.b.code)}>{c.b.short}</button>
            <span className="text-muted-foreground">{conflictDetail(c)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function conflictDetail(c: Conflict): string {
  switch (c.kind) {
    case "time":
      return `both ${c.day} ${c.start}`
    case "examSlot":
      return "exams at the same time"
    case "excludes":
      return "can't take both"
  }
}

/** Copies the current URL (which carries ?m=) to the clipboard. `compact` = icon only. */
export function CopyLink({ compact = false }: { compact?: boolean }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="outline"
      size={compact ? "icon-sm" : "sm"}
      className={compact ? "" : "w-full"}
      aria-label="Copy plan link"
      onClick={() => {
        void navigator.clipboard.writeText(window.location.href).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        })
      }}
    >
      {copied ? <Check /> : <Link />}
      {!compact && (copied ? "Copied" : "Copy plan link")}
    </Button>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}
