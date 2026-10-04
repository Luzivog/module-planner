import { ArrowDown, ArrowUp, TriangleAlert } from "lucide-react"
import type { Module } from "@/data/schema"
import { FilterBar } from "./filter-bar"
import { Hint } from "./hint"
import { BothTerms } from "./both-terms"
import { SplitBar } from "./split-bar"
import { ThemeToggle } from "./theme-toggle"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFilters } from "@/hooks/use-filters"
import { useListSort, type ListSort, type SortKey } from "@/hooks/use-list-sort"
import { TERM_NAMES, usePlanner } from "@/hooks/use-planner"
import { conflictsWith, describeConflict } from "@/lib/conflicts"
import { failedFilters, passes } from "@/lib/filters"
import { meanSetByOthers } from "@/lib/lecturers"
import { scoreTone, THIN_REVIEWS, toneText } from "@/lib/scores"
import { cn } from "@/lib/utils"

type Term = Module["term"]

/** Left column: term tabs, filters and that term's modules (selected first, or sorted by a column). */
export function ModuleList({ term, onTermChange, themeToggle = true }: { term: Term; onTermChange: (t: Term) => void; themeToggle?: boolean }) {
  const { data, isSelected, selected } = usePlanner()
  const { sort, cycle, compare } = useListSort()
  const { filters, set, clear } = useFilters()
  const termModules = data.modules.filter((m) => m.term === term)
  const modules = termModules.filter((m) => passes(m, filters, { selected })).sort(compare(isSelected))

  return (
    <aside className="flex h-full min-h-0 w-full flex-col">
      <div className="p-3 pb-2">
        <Tabs value={String(term)} onValueChange={(v) => onTermChange(v === "2" ? 2 : 1)}>
          <TabsList className="w-full">
            {([1, 2] as const).map((t) => (
              <TabsTrigger key={t} value={String(t)} className="text-[13px]">
                {TERM_NAMES[t]}
                <span className="text-xs tabular-nums text-muted-foreground">{selected.filter((m) => m.term === t).length}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <FilterBar filters={filters} set={set} clear={clear} shown={modules.length} total={termModules.length} />
      <div className="flex items-center gap-1.5 pr-[18px] pl-3 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        <span className="flex-1 pl-[44px] pointer-coarse:pl-[58px]">Module</span>
        <span className="w-4" />
        <Hint label="Exam / coursework split">
          <span className="w-6 text-center">E/C</span>
        </Hint>
        <SortHeader label="Tch" hint="Teaching score from Rate My Modules (grey = fewer than 3 reviews)" sortKey="teaching" sort={sort} onCycle={cycle} />
        <SortHeader label="Avg" hint="Last published class average (grey = set by a previous lecturer)" sortKey="mean" sort={sort} onCycle={cycle} />
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <ul className="pr-3 pb-3 pl-1.5">
          {modules.map((m) => (
            <ModuleRow key={m.code} module={m} failed={failedFilters(m, filters, { selected })} />
          ))}
        </ul>
      </ScrollArea>
      {themeToggle && (
        <div className="px-2 py-1">
          <ThemeToggle />
        </div>
      )}
    </aside>
  )
}

/** Clickable column header; the arrow's space is always reserved so nothing shifts. */
function SortHeader(props: { label: string; hint: string; sortKey: SortKey; sort: ListSort; onCycle: (k: SortKey) => void }) {
  const active = props.sort?.key === props.sortKey ? props.sort.dir : null
  const Arrow = active === "asc" ? ArrowUp : ArrowDown
  return (
    <Hint label={props.hint} touch="none">
      <button
        type="button"
        onClick={() => props.onCycle(props.sortKey)}
        className={cn("flex w-8 items-center justify-end gap-0.5 uppercase hover:text-foreground pointer-coarse:h-8", active && "text-foreground")}
      >
        <Arrow className={cn("size-2.5", !active && "invisible")} />
        {props.label}
      </button>
    </Hint>
  )
}

/** One module: toggle, colour, name and compact signals. Row click opens the sheet.
 * `failed` lists active filters it doesn't pass (only non-empty for selected modules). */
function ModuleRow({ module: m, failed }: { module: Module; failed: string[] }) {
  const { colors, isSelected, toggle, openSheet, selected } = usePlanner()
  const on = isSelected(m.code)
  const conflicts = conflictsWith(m, selected)
  const mean = m.means[0]?.mean
  const setBy = meanSetByOthers(m)

  return (
    <li
      className={cn(
        "flex h-9 cursor-pointer items-center gap-1.5 rounded-md px-1.5 text-[13px] hover:bg-muted pointer-coarse:h-11",
        !on && "text-muted-foreground",
        failed.length > 0 && "opacity-45",
      )}
      onClick={() => openSheet(m.code)}
    >
      {/* Stops row clicks; on touch it's a 40px target around the small switch. */}
      <span
        onClick={(e) => {
          e.stopPropagation()
          if (e.target === e.currentTarget) toggle(m.code)
        }}
        className="flex items-center pointer-coarse:-mx-1.5 pointer-coarse:size-10 pointer-coarse:justify-center"
      >
        <Switch size="sm" checked={on} onCheckedChange={() => toggle(m.code)} aria-label={`Select ${m.short}`} />
      </span>
      <span className="size-2 shrink-0 rounded-full" style={{ background: colors.get(m.code) }} />
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        {failed.length > 0 ? (
          <Hint label={<span>Doesn't pass: {failed.join(", ")}</span>} touch="none">
            <button type="button" className={cn("min-w-0 truncate text-left", on && "font-medium text-foreground")}>
              {m.short}
            </button>
          </Hint>
        ) : (
          <button type="button" className={cn("min-w-0 truncate text-left", on && "font-medium text-foreground")}>
            {m.short}
          </button>
        )}
        <BothTerms m={m} />
      </span>
      <span className="flex w-4 justify-center">
        {conflicts.length > 0 && (
          <Hint label={conflicts.map((c) => <span key={describeConflict(c)}>{describeConflict(c)}</span>)}>
            <TriangleAlert className={cn("size-3.5", on ? "text-bad" : "text-warn")} />
          </Hint>
        )}
      </span>
      <SplitBar examPct={m.examPct} className="w-6 shrink-0" />
      <span
        className={cn(
          "w-8 text-right text-xs tabular-nums",
          !m.reviews || m.reviews.count < THIN_REVIEWS ? "text-muted-foreground/60" : toneText[scoreTone(m.reviews.teaching)],
        )}
      >
        {m.reviews ? m.reviews.teaching.toFixed(1) : "–"}
      </span>
      {setBy && mean !== undefined ? (
        <Hint label={`Set by a previous lecturer (${setBy.join(", ")})`}>
          <span className="w-8 text-right text-xs tabular-nums text-muted-foreground/60">{Math.round(mean)}</span>
        </Hint>
      ) : (
        <span className="w-8 text-right text-xs tabular-nums">{mean !== undefined ? Math.round(mean) : "–"}</span>
      )}
    </li>
  )
}
