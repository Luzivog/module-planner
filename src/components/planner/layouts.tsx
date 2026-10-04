import { CalendarDays, ClipboardList, List } from "lucide-react"
import { useState, type ReactNode } from "react"
import type { Module } from "@/data/schema"
import { ModuleList } from "./module-list"
import { ResizeHandle } from "./resize-handle"
import { Summary } from "./summary"
import { SummaryBar } from "./summary-bar"
import { ThemeToggle } from "./theme-toggle"
import { Timetable } from "./timetable"
import { useColumnWidth } from "@/hooks/use-column-width"
import { usePlanner } from "@/hooks/use-planner"
import { cn } from "@/lib/utils"

type TermProps = { term: Module["term"]; onTermChange: (t: Module["term"]) => void }

/** ≥ 1280px: list | timetable | summary, with draggable dividers. */
export function DesktopLayout({ term, onTermChange }: TermProps) {
  const left = useColumnWidth("col-left", 340, 260, 560)
  const right = useColumnWidth("col-right", 260, 220, 420)
  return (
    <div className="flex h-dvh overflow-hidden text-[13px]">
      <div className="h-full shrink-0" style={{ width: left.width }}>
        <ModuleList term={term} onTermChange={onTermChange} />
      </div>
      <ResizeHandle side="left" width={left.width} onResize={left.setWidth} onReset={left.reset} />
      <Timetable term={term} />
      <ResizeHandle side="right" width={right.width} onResize={right.setWidth} onReset={right.reset} />
      <div className="h-full shrink-0" style={{ width: right.width }}>
        <Summary />
      </div>
    </div>
  )
}

/** 768–1279px: list | timetable, with the summary as a bar above the timetable. */
export function TabletLayout({ term, onTermChange }: TermProps) {
  return (
    <div className="flex h-dvh overflow-hidden text-[13px]">
      <div className="h-full w-[300px] shrink-0 border-r lg:w-[340px]">
        <ModuleList term={term} onTermChange={onTermChange} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <SummaryBar />
        <Timetable term={term} />
      </div>
    </div>
  )
}

const TABS = [
  { id: "modules", label: "Modules", Icon: List },
  { id: "week", label: "Week", Icon: CalendarDays },
  { id: "plan", label: "Plan", Icon: ClipboardList },
] as const
type Tab = (typeof TABS)[number]["id"]

const TAB_KEY = "module-planner:tab"
const readTab = (): Tab => TABS.find((t) => t.id === localStorage.getItem(TAB_KEY))?.id ?? "modules"

/** < 768px: one panel at a time with a bottom tab bar (remembered). */
export function PhoneLayout({ term, onTermChange }: TermProps) {
  const [tab, setTab] = useState<Tab>(readTab)
  const { selected } = usePlanner()
  const choose = (t: Tab) => {
    setTab(t)
    localStorage.setItem(TAB_KEY, t)
  }
  const panels: Record<Tab, ReactNode> = {
    modules: <ModuleList term={term} onTermChange={onTermChange} themeToggle={false} />,
    week: <Timetable term={term} compact onTermChange={onTermChange} />,
    plan: (
      <Summary
        footer={
          <div className="flex justify-center">
            <ThemeToggle />
          </div>
        }
      />
    ),
  }
  return (
    <div className="flex h-dvh flex-col overflow-hidden text-[13px]">
      <div className="flex min-h-0 flex-1 flex-col">{panels[tab]}</div>
      <nav className="flex shrink-0 border-t bg-background pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => choose(id)}
            aria-current={tab === id ? "page" : undefined}
            className={cn("flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px]", tab === id ? "text-foreground" : "text-muted-foreground")}
          >
            <span className="relative">
              <Icon className="size-5" />
              {id === "modules" && (
                <span className="absolute -top-1.5 -right-3 rounded-full bg-foreground px-1 text-[9px] leading-3.5 font-medium text-background tabular-nums">
                  {selected.length}
                </span>
              )}
            </span>
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}
