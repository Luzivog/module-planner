import { useState, type CSSProperties } from "react"
import { CircleHelp, House, Video, VideoOff } from "lucide-react"
import type { Day, Module, Session } from "@/data/schema"
import { DeadlineStrip } from "./deadline-strip"
import { Hint } from "./hint"
import { TERM_NAMES, usePlanner } from "@/hooks/use-planner"
import { useTermWeeks } from "@/hooks/use-term-weeks"
import { tint } from "@/lib/colors"
import { isInPerson, sessionsOverlap } from "@/lib/conflicts"
import { layoutLanes } from "@/lib/lanes"
import { durationMinutes, shortRange, toMinutes } from "@/lib/time"
import { cn } from "@/lib/utils"
import { termWorkload, type Workload } from "@/lib/workload"
import { guidance } from "@/lib/plan"

const DAYS: Day[] = ["Mon", "Tue", "Wed", "Thu", "Fri"]
const HOUR_PX = 56

/** A selected module's session placed on the grid; `idx` = its index in `module.sessions` (for unique keys). */
type Block = { module: Module; session: Session; idx: number; start: string; end: string; clash: boolean }

const blockKey = (b: Block) => `${b.module.code}-${b.session.day}-${b.start}-${b.end}-${b.session.kind}-${b.idx}`

/** Today's weekday, or Monday at weekends. */
function today(): Day {
  return DAYS[new Date().getDay() - 1] ?? "Mon"
}

/**
 * Week of the selected modules for one term. Desktop/tablet: Mon–Fri grid.
 * `compact` (phones): a tappable week overview that picks one day, shown full
 * width below it. `onTermChange` adds a term switch to the header (phones,
 * where the list's term tabs are on another tab).
 */
export function Timetable({ term, compact = false, onTermChange }: { term: Module["term"]; compact?: boolean; onTermChange?: (t: Module["term"]) => void }) {
  const [day, setDay] = useState<Day>(today)
  const { data, selected } = usePlanner()
  const termInfo = data.terms[term]

  // Hour range from *all* term modules, so toggling never resizes the grid.
  const allSessions = data.modules.filter((m) => m.term === term).flatMap((m) => m.sessions)
  const firstHour = Math.min(9, ...allSessions.map((s) => Math.floor(toMinutes(s.start) / 60)))
  const lastHour = Math.max(18, ...allSessions.map((s) => Math.ceil(toMinutes(s.end) / 60)))
  const hours = Array.from({ length: lastHour - firstHour }, (_, i) => firstHour + i)

  const termModules = selected.filter((m) => m.term === term)
  const sessions = termModules.flatMap((module) => module.sessions.map((session, idx) => ({ module, session, idx })))
  const blocks: Block[] = sessions.map(({ module, session, idx }) => ({
    module,
    session,
    idx,
    start: session.start,
    end: session.end,
    clash:
      isInPerson(session) &&
      sessions.some((o) => o.module.code !== module.code && isInPerson(o.session) && sessionsOverlap(session, o.session)),
  }))
  const { teaching } = useTermWeeks(term)
  const load = termWorkload(termModules, teaching)

  return (
    <main id="timetable" tabIndex={-1} aria-label="Weekly timetable" className="flex min-h-0 min-w-0 flex-1 flex-col outline-none">
      <header
        className={cn(
          "flex shrink-0 flex-wrap items-center border-b text-[13px]",
          compact ? "gap-x-4 gap-y-1 px-4 py-2" : "min-h-[57px] gap-x-5 gap-y-0.5 px-5 py-2",
        )}
      >
        {onTermChange ? <TermSwitch term={term} onChange={onTermChange} /> : <span className="font-semibold">{TERM_NAMES[term]}</span>}
        <Stat label="teaching" value={termInfo.teaching} />
        <Stat label="exams" value={termInfo.exams} />
        <Stat label="in person / wk" value={`${fmtHours(load.inPerson)} h`} />
        <Hint label={<WorkloadBreakdown load={load} weeks={teaching} />}>
          <span className="flex items-baseline gap-1.5 underline decoration-muted-foreground/50 decoration-dotted underline-offset-4">
            <span className="text-xs text-muted-foreground">timetabled + coursework</span>
            <span className="font-medium tabular-nums">
              ≈ {Math.round(load.total)}
              {load.unpublished.length > 0 ? "+" : ""} h/wk
            </span>
          </span>
        </Hint>
      </header>
      {compact ? (
        <div className="relative min-h-0 flex-1 overflow-y-auto px-3 pt-2 pb-4">
          {selected.length === 0 && <EmptyPlan className="top-44" />}
          <WeekOverview blocks={blocks} firstHour={firstHour} hours={hours.length} day={day} onDay={setDay} />
          <div className="mt-3 flex">
            <HourAxis hours={hours} lastHour={lastHour} />
            <DayColumn blocks={blocks.filter((b) => b.session.day === day)} firstHour={firstHour} hours={hours.length} />
          </div>
        </div>
      ) : (
        <div className="relative min-h-0 flex-1 overflow-y-auto px-5 pt-3 pb-5">
          {selected.length === 0 && <EmptyPlan className="top-28" />}
          <div className="flex">
            <div className="w-10 shrink-0" />
            {DAYS.map((day) => {
              const free = !blocks.some((b) => b.session.day === day && isInPerson(b.session))
              return (
                <div key={day} className="flex h-7 flex-1 items-baseline justify-center gap-1.5 text-xs font-medium">
                  {day}
                  {free && <span className="text-[11px] font-normal text-good">free</span>}
                </div>
              )
            })}
          </div>
          <div className="flex">
            <HourAxis hours={hours} lastHour={lastHour} />
            {DAYS.map((day) => (
              <DayColumn key={day} blocks={blocks.filter((b) => b.session.day === day)} firstHour={firstHour} hours={hours.length} />
            ))}
          </div>
        </div>
      )}
      <DeadlineStrip term={term} />
    </main>
  )
}

/** First-visit guidance floating over the empty grid (no layout change when it goes). */
function EmptyPlan({ className }: { className: string }) {
  const { data } = usePlanner()
  return (
    <div className={cn("pointer-events-none absolute inset-x-0 z-10 flex justify-center px-4", className)}>
      <div className="rounded-lg border bg-background/95 px-4 py-3 text-center shadow-sm">
        <h2 className="text-sm font-semibold">Module planner</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{guidance(data)}</p>
      </div>
    </div>
  )
}

/** Hour labels down the left of the grid, including the closing hour. */
function HourAxis({ hours, lastHour }: { hours: number[]; lastHour: number }) {
  return (
    <div className="relative w-10 shrink-0" style={{ height: hours.length * HOUR_PX }}>
      {[...hours, lastHour].map((h, i) => (
        <span key={h} className="absolute -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground" style={{ top: i * HOUR_PX }}>
          {String(h).padStart(2, "0")}
        </span>
      ))}
    </div>
  )
}

/** Autumn/Spring segmented switch for the phone header. */
function TermSwitch({ term, onChange }: { term: Module["term"]; onChange: (t: Module["term"]) => void }) {
  return (
    <div className="inline-flex rounded-lg bg-muted p-0.5">
      {([1, 2] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={cn("h-8 rounded-md px-3 text-[13px] font-medium", t === term ? "bg-background shadow-sm" : "text-muted-foreground")}
        >
          {TERM_NAMES[t]}
        </button>
      ))}
    </div>
  )
}

const MINI_HOUR_PX = 7

/**
 * Phone day picker: five thin columns showing the week's shape (coloured
 * blocks only, clashes outlined). Tapping a column shows that day below.
 */
function WeekOverview(props: { blocks: Block[]; firstHour: number; hours: number; day: Day; onDay: (d: Day) => void }) {
  const { colors } = usePlanner()
  return (
    <div role="tablist" aria-label="Day" className="flex gap-1">
      {DAYS.map((d) => {
        const dayBlocks = props.blocks.filter((b) => b.session.day === d)
        const free = !dayBlocks.some((b) => isInPerson(b.session))
        const active = d === props.day
        return (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => props.onDay(d)}
            className={cn("flex-1 rounded-lg border p-1 text-center transition-colors", active ? "border-foreground/50 bg-muted" : "border-transparent")}
          >
            <div className={cn("text-xs font-medium", !active && "text-muted-foreground")}>{d}</div>
            <div className={cn("h-3.5 text-[10px] leading-3.5 text-good", !free && "invisible")}>free</div>
            <div className="relative mt-0.5 rounded-sm bg-muted/60" style={{ height: props.hours * MINI_HOUR_PX }}>
              {layoutLanes(dayBlocks).map(({ item, lane, lanes }) => {
                const color = colors.get(item.module.code) ?? "gray"
                return (
                  <span
                    key={blockKey(item)}
                    className={cn("absolute rounded-[2px]", item.clash && "ring-1 ring-bad")}
                    style={{
                      top: ((toMinutes(item.start) - props.firstHour * 60) / 60) * MINI_HOUR_PX,
                      height: (durationMinutes(item) / 60) * MINI_HOUR_PX - 1,
                      left: `${(lane / lanes) * 100}%`,
                      width: `calc(${100 / lanes}% - 1px)`,
                      background: item.session.kind === "video" ? tint(color, 30) : color,
                    }}
                  />
                )
              })}
            </div>
          </button>
        )
      })}
    </div>
  )
}

const fmtHours = (h: number) => String(Number(h.toFixed(1)))

/** Tooltip body for the weekly hours estimate. */
function WorkloadBreakdown({ load, weeks }: { load: Workload; weeks: number }) {
  const rows: [string, number][] = [
    ["in person", load.inPerson],
    ["videos", load.video],
    ["extra study (notes)", load.extra],
    [`coursework ÷ ${weeks} wks`, load.coursework],
  ]
  return (
    <>
      <span className="font-medium">Estimated hours per teaching week</span>
      {rows.map(([label, h]) => (
        <span key={label} className="tabular-nums">
          {fmtHours(h)} h {label}
        </span>
      ))}
      {load.unpublished.length > 0 && (
        <span>Coursework not published yet: {load.unpublished.map((m) => m.short).join(", ")}</span>
      )}
      {load.unestimated > 0 && <span>{load.unestimated} piece(s) without an hour estimate</span>}
      <span className="opacity-80">Not included: self-study and revision (5 ECTS ≈ 125 h of work per module).</span>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="font-medium tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </span>
  )
}

/** One day: hour lines plus absolutely positioned session blocks in lanes. */
function DayColumn({ blocks, firstHour, hours }: { blocks: Block[]; firstHour: number; hours: number }) {
  return (
    <div className="relative flex-1 border-l" style={{ height: hours * HOUR_PX }}>
      {Array.from({ length: hours + 1 }, (_, i) => (
        <div key={i} className="absolute inset-x-0 border-t border-border/70" style={{ top: i * HOUR_PX }} />
      ))}
      {layoutLanes(blocks).map(({ item, lane, lanes }) => (
        <SessionBlock
          key={blockKey(item)}
          block={item}
          narrow={lanes > 1}
          style={{
            top: ((toMinutes(item.start) - firstHour * 60) / 60) * HOUR_PX,
            height: (durationMinutes(item) / 60) * HOUR_PX,
            left: `calc(${(lane / lanes) * 100}% + 2px)`,
            width: `calc(${100 / lanes}% - 4px)`,
          }}
        />
      ))}
    </div>
  )
}

/** "HXLY 210 +3": first room plus how many more. */
const shortRooms = (rooms: string[]) => (rooms.length > 1 ? `${rooms[0]} +${rooms.length - 1}` : (rooms[0] ?? ""))

const RECORDING = {
  video: { Icon: House, label: "Video: watch at home", className: "text-foreground/50" },
  yes: { Icon: Video, label: "Recorded", className: "text-good" },
  no: { Icon: VideoOff, label: "Not recorded: attend in person", className: "text-warn" },
  unknown: { Icon: CircleHelp, label: "Recording unknown", className: "text-foreground/40" },
} as const

function recording(s: Session) {
  if (s.kind === "video") return RECORDING.video
  return s.recorded === true ? RECORDING.yes : s.recorded === false ? RECORDING.no : RECORDING.unknown
}

/**
 * A coloured session block; video sessions are hatched, clashes outlined red.
 * The grid already shows the time, so the block shows only the kind (when not a
 * plain lecture) and room; the tooltip has everything.
 */
function SessionBlock({ block, style, narrow }: { block: Block; style: CSSProperties; narrow: boolean }) {
  const { colors, openSheet } = usePlanner()
  const { module: m, session: s } = block
  const color = colors.get(m.code) ?? "gray"
  const video = s.kind === "video"
  const tall = durationMinutes(s) >= 120
  const rec = recording(s)
  const detail = [s.kind === "lecture" ? null : s.kind, shortRooms(s.rooms) || null].filter((x) => x !== null).join(" · ")

  return (
    <Hint
      touch="none"
      label={
        <>
          <span className="font-medium">{m.short}</span>
          <span>
            {s.kind} · {s.day} {shortRange(s.start, s.end)}
          </span>
          {s.rooms.length > 0 && <span>{s.rooms.join(", ")}</span>}
          <span>{rec.label}</span>
          {block.clash && <span>Clashes with another selected module</span>}
        </>
      }
    >
      <button
        type="button"
        onClick={() => openSheet(m.code)}
        className={cn(
          "absolute overflow-hidden rounded-md px-1.5 py-1 text-left leading-tight transition-shadow hover:shadow-md",
          video && "border border-dashed",
          block.clash && "ring-2 ring-bad ring-offset-1 ring-offset-background",
        )}
        style={{
          ...style,
          borderColor: color,
          background: video
            ? `repeating-linear-gradient(135deg, ${tint(color, 20)} 0 5px, var(--background) 5px 10px)`
            : tint(color, 24),
        }}
      >
        <BlockName name={m.short} wrap={tall && !narrow} />
        {detail && <div className="truncate text-[11px] text-foreground/70">{detail}</div>}
        {block.clash && <div className="text-[11px] font-semibold text-bad">clash</div>}
        <span className="absolute top-1.5 right-1.5" role="img" aria-label={rec.label}>
          <rec.Icon className={cn("size-3", rec.className)} />
        </span>
      </button>
    </Hint>
  )
}

/**
 * Module name in a block. `wrap`: up to two lines, breaking only between words;
 * a word too long for the block ends in "…" instead of being split. Otherwise
 * one truncated line. The full name is in the tooltip and the sheet.
 */
function BlockName({ name, wrap }: { name: string; wrap: boolean }) {
  if (!wrap) return <div className="truncate pr-3.5 text-xs font-medium">{name}</div>
  return (
    <div className="line-clamp-2 pr-3.5 text-xs font-medium">
      {name.split(" ").map((word, i) => (
        <span key={i}>
          {i > 0 && " "}
          <span className="inline-block max-w-full truncate align-bottom">{word}</span>
        </span>
      ))}
    </div>
  )
}
