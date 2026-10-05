import { SlidersHorizontal } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"
import type { Day } from "@/data/schema"
import { Hint } from "./hint"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { activeCount, moreCount, START_HOURS, type Filters } from "@/lib/filters"
import { cn } from "@/lib/utils"

type Props = {
  filters: Filters
  set: (patch: Partial<Filters>) => void
  clear: () => void
  shown: number
  total: number
  /** Shown in the status line when no filter is active (first-visit guidance). */
  idleHint: string | null
}

const EXAM_NEXT = { any: "max70", max70: "none", none: "any" } as const satisfies Record<Filters["exam"], Filters["exam"]>
const EXAM_LABEL = { any: "Any exam", max70: "≤ 70% exam", none: "No exam" } as const satisfies Record<Filters["exam"], string>
const DAYS: Day[] = ["Mon", "Tue", "Wed", "Thu", "Fri"]
const pad = (h: number) => `${String(h).padStart(2, "0")}:00`

/**
 * Filter chips above the module list, a "More" popover for rarer filters, and
 * a status line. Chips that change label have fixed widths and the status line
 * always takes its height, so toggling never shifts the list.
 */
export function FilterBar({ filters: f, set, clear, shown, total, idleHint }: Props) {
  const more = moreCount(f)
  return (
    <div className="space-y-1.5 px-3 pb-2">
      <div className="flex flex-wrap gap-1 pointer-coarse:gap-1.5">
        <Popover>
          <Hint label="Hide modules with an in-person session starting earlier" touch="none">
            <PopoverTrigger render={<Chip active={f.startFrom !== null} className="w-[76px] pointer-coarse:w-[88px]" />}>
              {f.startFrom === null ? "Start: any" : `From ${pad(f.startFrom)}`}
            </PopoverTrigger>
          </Hint>
          <PopoverContent align="start" className="w-auto gap-1.5 p-2">
            <div className="text-[11px] text-muted-foreground">First in-person session from</div>
            <div className="flex max-w-[calc(100vw-2.5rem)] flex-wrap gap-1">
              <Chip active={f.startFrom === null} onClick={() => set({ startFrom: null })}>Any</Chip>
              {START_HOURS.map((h) => (
                <Chip key={h} active={f.startFrom === h} onClick={() => set({ startFrom: h })} className="tabular-nums">
                  {String(h).padStart(2, "0")}
                </Chip>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Hint label="Only modules taught by the same team as last year (whom the reviews describe)" touch="none">
          <Chip active={f.sameLecturer} onClick={() => set({ sameLecturer: !f.sameLecturer })}>Same lecturer</Chip>
        </Hint>
        <Hint label="Hide modules that clash with your plan (time, exam slot or exclusion)" touch="none">
          <Chip active={f.fitsPlan} onClick={() => set({ fitsPlan: !f.fitsPlan })}>Fits my plan</Chip>
        </Hint>
        <Hint label="Click to cycle: any exam weight → at most 70% exam → coursework only" touch="none">
          <Chip active={f.exam !== "any"} onClick={() => set({ exam: EXAM_NEXT[f.exam] })} className="w-[78px] pointer-coarse:w-[92px]">
            {EXAM_LABEL[f.exam]}
          </Chip>
        </Hint>
        <Hint label="Only modules whose lectures are all recorded (labs and tutorials ignored)" touch="none">
          <Chip active={f.recorded} onClick={() => set({ recorded: !f.recorded })}>Recorded</Chip>
        </Hint>
        <Popover>
          <Hint label="More filters: free day, teaching, difficulty, average, has run before" touch="none">
            <PopoverTrigger render={<Chip active={more > 0} className="w-[62px] pointer-coarse:w-[74px]" />}>
              <SlidersHorizontal className="size-3" />
              More{more > 0 && <span className="tabular-nums">{more}</span>}
            </PopoverTrigger>
          </Hint>
          <PopoverContent align="start" className="w-64 gap-2.5 p-3 text-xs pointer-coarse:w-[min(20rem,calc(100vw-1.5rem))]">
            <MoreFilters f={f} set={set} />
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex h-4 items-center gap-1.5 text-[11px] text-muted-foreground pointer-coarse:h-6 pointer-coarse:text-xs">
        {activeCount(f) === 0 && idleHint && <span className="truncate text-foreground">{idleHint}</span>}
        {activeCount(f) > 0 && (
          <>
            <span className="tabular-nums">
              {shown} of {total} shown
            </span>
            ·
            <button type="button" onClick={clear} className="hover:text-foreground hover:underline pointer-coarse:-my-2 pointer-coarse:px-2 pointer-coarse:py-2.5">
              Clear
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/** The popover's rarer filters, as switches. */
function MoreFilters({ f, set }: { f: Filters; set: (patch: Partial<Filters>) => void }) {
  return (
    <>
      <div className="space-y-1.5">
        <div className="font-medium">Leaves a day free</div>
        <div className="grid grid-cols-5 gap-1">
          {DAYS.map((d) => (
            <Chip key={d} active={f.freeDay === d} onClick={() => set({ freeDay: f.freeDay === d ? null : d })} className="px-0 pointer-coarse:px-0">
              {d}
            </Chip>
          ))}
        </div>
      </div>
      <Toggle label="Teaching ≥ 4" hint="Rate My Modules teaching score" checked={f.teaching4} onChange={(v) => set({ teaching4: v })} />
      <Toggle
        label="≥ 3 reviews"
        hint="Ignore scores from too few reviews"
        checked={f.teachingSolid}
        disabled={!f.teaching4}
        onChange={(v) => set({ teachingSolid: v })}
        className="pl-4"
      />
      <Toggle label="Difficulty ≤ 3" hint="5 = hardest; needs reviews" checked={f.difficulty3} onChange={(v) => set({ difficulty3: v })} />
      <Toggle label="Average ≥ 70" hint="Latest published class average" checked={f.average70} onChange={(v) => set({ average70: v })} />
      <Toggle label="Has run before" hint="Has a published average, so past papers exist" checked={f.hasRun} onChange={(v) => set({ hasRun: v })} />
    </>
  )
}

function Toggle(props: { label: string; hint: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void; className?: string }) {
  return (
    <label className={cn("flex items-center justify-between gap-3", props.disabled && "opacity-50", props.className)}>
      <span>
        <span className="block">{props.label}</span>
        <span className="block text-[11px] text-muted-foreground">{props.hint}</span>
      </span>
      <Switch size="sm" checked={props.checked} disabled={props.disabled} onCheckedChange={props.onChange} />
    </label>
  )
}

/** Small pill button; `active` fills it. */
function Chip({ active, className, children, ...props }: ComponentProps<"button"> & { active: boolean; children?: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex h-6 shrink-0 items-center justify-center gap-1 rounded-full border px-2 text-[11px] whitespace-nowrap transition-colors pointer-coarse:h-9 pointer-coarse:px-3 pointer-coarse:text-xs",
        active ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
