import { ArrowDown, ArrowUp, CircleHelp, Flower2, Leaf, TriangleAlert } from "lucide-react"
import { useState, type ReactNode } from "react"
import type { Module } from "@/data/schema"
import { FilterBar } from "./filter-bar"
import { Hint } from "./hint"
import { BothTerms } from "./both-terms"
import { SplitBar } from "./split-bar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFilters } from "@/hooks/use-filters"
import { useListSort, type ListSort, type SortKey } from "@/hooks/use-list-sort"
import { TERM_NAMES, usePlanner } from "@/hooks/use-planner"
import { conflictsWith, describeConflict } from "@/lib/conflicts"
import { failedFilters, passes } from "@/lib/filters"
import { meanByOtherTeam, teamVsReviewed } from "@/lib/lecturers"
import { otherTeamNote } from "@/lib/means"
import { guidance } from "@/lib/plan"
import { HIGH_TEACHING, THIN_REVIEWS } from "@/lib/scores"
import { cn } from "@/lib/utils"

type Term = Module["term"]

// The E/C bar is dropped when the list is narrower than this (tablet), so names fit.
const COMPACT = "@max-[22rem]:hidden"

/**
 * Left column / Modules tab: term tabs, filters and that term's modules.
 * `footer` is pinned under the list; `endNote` follows the last row.
 */
export function ModuleList({ term, onTermChange, footer, endNote }: { term: Term; onTermChange: (t: Term) => void; footer?: ReactNode; endNote?: ReactNode }) {
  const { data, selected } = usePlanner()
  const { sort, cycle, compare } = useListSort()
  const { filters, set, clear } = useFilters()

  // What was selected when the term, sort or filters last changed. It decides
  // "selected first" and keeps just-deselected rows listed, so toggling never
  // moves a row (a second tap always hits the same module).
  const viewKey = JSON.stringify([term, sort, filters])
  const [pin, setPin] = useState(() => ({ key: viewKey, codes: new Set(selected.map((m) => m.code)) }))
  if (pin.key !== viewKey) setPin({ key: viewKey, codes: new Set(selected.map((m) => m.code)) })

  const termModules = data.modules.filter((m) => m.term === term)
  const modules = termModules
    .filter((m) => pin.codes.has(m.code) || passes(m, filters, { selected }))
    .sort(compare((code) => pin.codes.has(code)))

  return (
    <aside aria-label="Modules" className="@container flex h-full min-h-0 w-full flex-col">
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
      <FilterBar
        filters={filters}
        set={set}
        clear={clear}
        shown={modules.length}
        total={termModules.length}
        idleHint={selected.length === 0 ? guidance(data) : null}
      />
      <div className="flex items-center gap-1.5 pr-[18px] pb-1 pl-3 text-[10px] tracking-wide text-muted-foreground uppercase">
        <span className="flex flex-1 items-center gap-1 pl-[44px] pointer-coarse:pl-[58px]">
          Module
          <ListHelp />
        </span>
        <span className="w-4" />
        <Hint label="Exam / coursework split of the final mark">
          <span className={cn("w-6 text-center", COMPACT)}>E/C</span>
        </Hint>
        <SortHeader label="Tch" hint="Teaching score from Rate My Modules, 1–5 (italic = fewer than 3 reviews; grey = reviews describe a different team)" sortKey="teaching" sort={sort} onCycle={cycle} />
        <SortHeader label="Avg" hint="Last published class average (grey = set when a different team taught it)" sortKey="mean" sort={sort} onCycle={cycle} />
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <ul className="pr-3 pb-3 pl-1.5">
          {modules.map((m) => (
            <ModuleRow key={m.code} module={m} failed={failedFilters(m, filters, { selected })} />
          ))}
        </ul>
        {endNote}
      </ScrollArea>
      {footer}
    </aside>
  )
}

/** "?" next to the column headers: what each column, icon and filter means (works on touch too). */
function ListHelp() {
  const rows: { id: string; mark: ReactNode; text: string }[] = [
    { id: "ec", mark: <span className="w-6"><SplitBar examPct={70} /></span>, text: "Exam (dark) vs coursework (green) share of the final mark" },
    { id: "tch", mark: "TCH", text: "Rate My Modules teaching score, 1–5. Italic: fewer than 3 reviews. Grey: reviews describe a different team. Bold: 4.5 or more" },
    { id: "avg", mark: "AVG", text: "Latest published class average. Grey: set when a different team taught it" },
    { id: "warn", mark: <TriangleAlert className="size-3.5 text-warn" />, text: "Conflicts with your plan: same time, same exam slot, or can't take both" },
    {
      id: "terms",
      mark: (
        <span className="flex gap-0.5">
          <Leaf className="size-3.5 text-orange-500" />
          <Flower2 className="size-3.5 text-pink-500" />
        </span>
      ),
      text: "Offered in both terms (take one), or runs across both",
    },
  ]
  const chips: [string, string][] = [
    ["Start", "first in-person session from a given hour"],
    ["Same lecturer", "same team as last year, whom the reviews describe"],
    ["Fits my plan", "hides modules that conflict with your picks"],
    ["Exam", "tap to cycle: any, ≤ 70% exam, coursework only"],
    ["Recorded", "every lecture is recorded"],
    ["More", "free day, teaching, difficulty, average, has run before"],
  ]
  return (
    <Popover>
      <PopoverTrigger
        aria-label="What the columns and filters mean"
        className="-m-1.5 inline-flex size-6 items-center justify-center rounded-full normal-case hover:text-foreground pointer-coarse:size-9"
      >
        <CircleHelp className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 max-w-[calc(100vw-1.5rem)] gap-2 p-3 text-xs">
        <ul className="space-y-1.5">
          {rows.map((row) => (
            <li key={row.id} className="grid grid-cols-[2.5rem_1fr] items-center gap-2">
              <span className="text-[10px] font-medium tracking-wide text-muted-foreground">{row.mark}</span>
              <span>{row.text}</span>
            </li>
          ))}
        </ul>
        <div className="border-t pt-2 font-medium">Filters</div>
        <ul className="space-y-1">
          {chips.map(([chip, text]) => (
            <li key={chip}>
              <span className="font-medium">{chip}</span> <span className="text-muted-foreground">· {text}</span>
            </li>
          ))}
        </ul>
        <p className="border-t pt-2 text-muted-foreground">Tap a row for details; use the switch to add it to your plan.</p>
      </PopoverContent>
    </Popover>
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
        aria-label={`Sort by ${props.label === "Tch" ? "teaching score" : "class average"}`}
        className={cn("flex w-8 items-center justify-end gap-0.5 uppercase hover:text-foreground pointer-coarse:h-8", active && "text-foreground")}
      >
        <Arrow className={cn("size-2.5", !active && "invisible")} />
        {props.label}
      </button>
    </Hint>
  )
}

/** One module: toggle, colour, name and compact signals. Row click opens the sheet.
 * `failed` lists active filters it doesn't pass (non-empty only for rows kept because they're picked). */
function ModuleRow({ module: m, failed }: { module: Module; failed: string[] }) {
  const { colors, isSelected, toggle, openSheet, selected } = usePlanner()
  const on = isSelected(m.code)
  const conflicts = conflictsWith(m, selected)
  const mean = m.means[0]
  const r = m.reviews
  const thin = r !== null && r.count < THIN_REVIEWS
  // Scores about a different team than this year's are greyed, like AVG.
  const otherReviewed = r !== null && teamVsReviewed(m) === "different"
  const nameButton = (
    <button type="button" className={cn("min-w-0 truncate text-left", on && "font-medium text-foreground")}>
      {m.short}
    </button>
  )

  return (
    <li
      className={cn(
        "flex h-9 cursor-pointer items-center gap-1.5 rounded-md px-1.5 text-[13px] hover:bg-muted pointer-coarse:h-11",
        !on && "text-muted-foreground",
        failed.length > 0 && "opacity-60",
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
        <Switch size="sm" checked={on} onCheckedChange={() => toggle(m.code)} aria-label={`Add ${m.short} to plan`} />
      </span>
      <span className="size-2 shrink-0 rounded-full" style={{ background: colors.get(m.code) }} />
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        {failed.length > 0 ? (
          <Hint label={<span>Doesn't pass: {failed.join(", ")}</span>} touch="none">
            {nameButton}
          </Hint>
        ) : (
          nameButton
        )}
        <BothTerms m={m} />
      </span>
      <span className="flex w-4 justify-center">
        {conflicts.length > 0 && (
          <Hint label={conflicts.map((c) => <span key={describeConflict(c)}>{describeConflict(c)}</span>)}>
            <TriangleAlert role="img" aria-label="Conflicts with your plan" className={cn("size-3.5", on ? "text-bad" : "text-warn")} />
          </Hint>
        )}
      </span>
      <SplitBar examPct={m.examPct} className={cn("w-6 shrink-0", COMPACT)} />
      <span
        className={cn(
          "w-8 text-right text-xs tabular-nums",
          !r || otherReviewed ? "text-muted-foreground" : "text-foreground",
          thin && "italic",
          r && !thin && !otherReviewed && r.teaching >= HIGH_TEACHING && "font-semibold",
        )}
      >
        {r ? r.teaching.toFixed(1) : "–"}
      </span>
      {mean && meanByOtherTeam(m) ? (
        <Hint label={otherTeamNote(mean.year)}>
          <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">{Math.round(mean.mean)}</span>
        </Hint>
      ) : (
        <span className="w-8 text-right text-xs tabular-nums">{mean ? Math.round(mean.mean) : "–"}</span>
      )}
    </li>
  )
}
