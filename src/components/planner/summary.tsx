import { Check, Link } from "lucide-react"
import { useState, type ReactNode } from "react"
import { Disclaimer } from "./disclaimer"
import { SplitBar } from "./split-bar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useTouch } from "@/hooks/use-media"
import { TERM_NAMES, usePlanner } from "@/hooks/use-planner"
import { isTermTwin, twinName, type Conflict } from "@/lib/conflicts"
import { planStats, plural } from "@/lib/plan"
import { formatDay } from "@/lib/time"
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
            <div className="text-xs text-muted-foreground tabular-nums">{plural(t.exams, "exam")}</div>
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
            <span className="font-medium text-foreground">Both terms</span> close {formatDay(data.selection.closes)}
          </p>
          <p>Spring changes may be possible early in spring term — check with the programme team.</p>
        </div>
        <Disclaimer className="text-center" />
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
        {conflicts.map((c) => {
          const key = `${c.kind}-${c.a.code}-${c.b.code}`
          if (isTermTwin(c)) {
            const [first, second] = c.a.term <= c.b.term ? [c.a, c.b] : [c.b, c.a]
            return (
              <li key={key}>
                <button type="button" className="hover:underline" onClick={() => openSheet(first.code)}>{twinName(first)}</button> ×{" "}
                <button type="button" className="hover:underline" onClick={() => openSheet(second.code)}>{twinName(second)}</button>
                <span className="text-muted-foreground">: same module, take only one</span>
              </li>
            )
          }
          return (
            <li key={key} className="flex flex-wrap gap-x-1">
              <button type="button" className="hover:underline" onClick={() => openSheet(c.a.code)}>{c.a.short}</button>×
              <button type="button" className="hover:underline" onClick={() => openSheet(c.b.code)}>{c.b.short}</button>
              <span className="text-muted-foreground">{conflictDetail(c)}</span>
            </li>
          )
        })}
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

/**
 * Shares the current URL (which carries ?m=). Touch devices get the system share
 * sheet when there is one; otherwise it's copied, with a prompt as the fallback
 * when the clipboard is unavailable. `compact` = icon only.
 */
export function CopyLink({ compact = false }: { compact?: boolean }) {
  const touch = useTouch()
  const [copied, setCopied] = useState(false)
  const share = async () => {
    const url = window.location.href
    if (touch && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "My module plan", url })
        return
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      window.prompt("Copy this link to your plan:", url)
    }
  }
  const label = touch ? "Share plan link" : "Copy plan link"
  return (
    <Button variant="outline" size={compact ? "icon-sm" : "sm"} className={compact ? "" : "w-full"} aria-label={label} onClick={() => void share()}>
      {copied ? <Check /> : <Link />}
      {!compact && (copied ? "Copied" : label)}
    </Button>
  )
}
