import { ExternalLink, House, Info, TriangleAlert, User, Users, Video, VideoOff } from "lucide-react"
import { Fragment, type ReactNode } from "react"
import type { Coursework, Module, Session } from "@/data/schema"
import { Hint } from "./hint"
import { BothTerms, SpansTermsTag } from "./both-terms"
import { SplitBar } from "./split-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useLayout } from "@/hooks/use-media"
import { TERM_NAMES, usePlanner } from "@/hooks/use-planner"
import { conflictsWith, describeConflict } from "@/lib/conflicts"
import { examNeeded } from "@/lib/grade"
import { includesName, meanSetByOthers, nameKey, teamVsLastYear } from "@/lib/lecturers"
import { scoreTone, THIN_REVIEWS, toneBg, toneText, type Tone } from "@/lib/scores"
import { formatDateTime, formatDay, runLabel, shortRange } from "@/lib/time"
import { cn } from "@/lib/utils"

/** Right-side details sheet for one module. `module` stays set while closing so the exit animation has content. */
export function ModuleSheet({ module: m, open, onOpenChange }: { module: Module | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const phone = useLayout() === "phone"
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={phone ? "bottom" : "right"}
        className={cn(
          "gap-0 data-[side=right]:w-[460px] data-[side=right]:sm:max-w-[460px]",
          // Phone: bottom sheet with a grab-handle look and a 40px close button.
          "data-[side=bottom]:h-[90dvh] data-[side=bottom]:rounded-t-2xl data-[side=bottom]:pb-[env(safe-area-inset-bottom)]",
          "data-[side=bottom]:[&>[data-slot=sheet-close]]:top-4 data-[side=bottom]:[&>[data-slot=sheet-close]]:size-10",
        )}
      >
        {phone && <div aria-hidden className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30" />}
        {m && <SheetBody module={m} />}
      </SheetContent>
    </Sheet>
  )
}

function SheetBody({ module: m }: { module: Module }) {
  // Each entry is one section; null = nothing to show. Separators go between.
  const sections: ReactNode[] = [
    <KeyFacts key="facts" module={m} />,
    m.examPct > 0 ? <GradeSection key="grade" module={m} /> : null,
    <WhatYouDo key="do" module={m} />,
    <WeekSection key="week" module={m} />,
    <PeopleSection key="people" module={m} />,
    <ReviewsSection key="reviews" module={m} />,
    m.means.length > 0 ? <MeansSection key="means" module={m} /> : null,
    m.notes.examiners ? <p key="examiners" className="text-xs text-muted-foreground">Examiners: {m.notes.examiners}</p> : null,
  ].filter((s) => s !== null)

  return (
    <>
      <Header module={m} />
      <ScrollArea className="min-h-0 flex-1">
        <div className="@container flex flex-col gap-4 p-4 text-[13px]">
          {sections.map((section, i) => (
            <Fragment key={i}>
              {i > 0 && <Separator />}
              {section}
            </Fragment>
          ))}
        </div>
      </ScrollArea>
    </>
  )
}

/** Name, meta, add/remove, links, then conflicts and the caveat callout. */
function Header({ module: m }: { module: Module }) {
  const { colors, isSelected, toggle, selected } = usePlanner()
  const on = isSelected(m.code)
  const conflicts = conflictsWith(m, selected)
  return (
    <SheetHeader className="gap-2 border-b pr-12">
      <div className="flex items-center gap-2">
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: colors.get(m.code) }} />
        <SheetTitle className="text-lg font-semibold">{m.short}</SheetTitle>
      </div>
      <SheetDescription className="text-xs tabular-nums">
        {m.code} · {TERM_NAMES[m.term]} · {m.ects} ECTS <BothTerms m={m} />
        {m.spansTerms && <SpansTermsTag className="ml-1.5" />}
      </SheetDescription>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <Button size="sm" variant={on ? "outline" : "default"} onClick={() => toggle(m.code)}>
          {on ? "Remove" : "Add to plan"}
        </Button>
        <ExtLink href={m.links.official} icon="./imperial.svg">Official page</ExtLink>
        {m.links.site && <ExtLink href={m.links.site}>Lecturer site</ExtLink>}
        {m.reviews && <ExtLink href={m.reviews.url} icon="./rmm.svg">Reviews</ExtLink>}
      </div>
      {conflicts.length > 0 && (
        <ul className="space-y-0.5 text-xs text-bad">
          {conflicts.map((c) => (
            <li key={describeConflict(c)} className="flex items-center gap-1.5">
              <TriangleAlert className="size-3.5 shrink-0" />
              {describeConflict(c)}
            </li>
          ))}
        </ul>
      )}
      {m.notes.caveat && (
        <p className="flex gap-2 rounded-md border border-warn/35 bg-warn/10 px-2.5 py-1.5 text-xs leading-snug">
          <TriangleAlert className="mt-px size-3.5 shrink-0 text-warn" />
          {m.notes.caveat}
        </p>
      )}
    </SheetHeader>
  )
}

// External link; `icon` is an optional logo shown before the label.
function ExtLink({ href, icon, children }: { href: string; icon?: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
      {icon && <img src={icon} alt="" className="size-3.5 rounded-[3px]" />}
      {children}
      <ExternalLink className="size-3" />
    </a>
  )
}

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {title}
        {aside}
      </h3>
      {children}
    </section>
  )
}

/** Four tiles answering "is this module good for me?". */
function KeyFacts({ module: m }: { module: Module }) {
  const r = m.reviews
  const thin = r !== null && r.count < THIN_REVIEWS
  const mean = m.means[0]
  const setBy = meanSetByOthers(m)
  return (
    <div className="grid grid-cols-2 gap-2 @sm:grid-cols-4">
      <Fact label="exam" value={`${m.examPct}%`} sub={m.examPct === 0 ? "coursework only" : `${100 - m.examPct}% cw`} />
      <Fact
        label="teaching"
        value={r ? r.teaching.toFixed(1) : "–"}
        tone={r && !thin ? scoreTone(r.teaching) : "neutral"}
        muted={!r || thin}
        sub={r ? `${r.count} review${r.count === 1 ? "" : "s"}${thin ? " · thin" : ""}` : "no reviews"}
      />
      <Fact
        label="difficulty"
        value={r ? r.difficulty.toFixed(1) : "–"}
        tone={r && !thin ? scoreTone(r.difficulty, true) : "neutral"}
        muted={!r || thin}
        sub="5 = hardest"
      />
      <Fact
        label="average"
        value={mean ? mean.mean.toFixed(1) : "–"}
        muted={!mean}
        tag={mean && isCapped(mean.mean) ? <CapTag /> : null}
        sub={
          !mean ? "none published" : setBy ? (
            <Hint label={`Set by ${setBy.join(", ")}`}>
              <span className="text-warn">different lecturer</span>
            </Hint>
          ) : (
            runLabel(mean.year, m.term)
          )
        }
      />
    </div>
  )
}

function Fact(props: { label: string; value: string; sub: ReactNode; tone?: Tone; muted?: boolean; tag?: ReactNode }) {
  const { label, value, sub, tone = "neutral", muted = false, tag } = props
  return (
    <div className={cn("rounded-lg px-2.5 py-2", toneBg[tone])}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={cn("text-xl font-semibold tabular-nums", muted ? "text-muted-foreground" : toneText[tone])}>{value}</span>
        {tag}
      </div>
      <div className="truncate text-[10px] text-muted-foreground">{sub}</div>
    </div>
  )
}

const TARGETS = [
  { mark: 50, label: "Pass (50)" },
  { mark: 60, label: "60" },
  { mark: 70, label: "70" },
]

/** Split bar plus the exam mark needed per target, as a range over coursework 90%..70%. */
function GradeSection({ module: m }: { module: Module }) {
  return (
    <Section
      title="Grade"
      aside={
        <Hint label="Exam mark needed, assuming coursework between 90% (lower bound) and 70% (upper bound). “100+” = out of reach at that coursework mark.">
          <Info className="size-3" />
        </Hint>
      }
    >
      <SplitBar examPct={m.examPct} size="lg" />
      <ul className="space-y-0.5 text-xs tabular-nums">
        {TARGETS.map((t) => {
          const lo = examNeeded(t.mark, 90, m.examPct)
          const hi = examNeeded(t.mark, 70, m.examPct)
          const fmt = (n: number | null) => (n === null ? "100+" : String(n))
          const range = lo === hi ? fmt(lo) : `${fmt(lo)}–${fmt(hi)}`
          return (
            <li key={t.mark} className="flex gap-2">
              <span className="w-16 text-muted-foreground">{t.label}</span>
              <span>
                → <span className="font-medium">{range}%</span> on the exam
              </span>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}

/** Coursework and exam notes as labelled blocks; exam slot as a badge. */
function WhatYouDo({ module: m }: { module: Module }) {
  const { coursework, exam } = m.notes
  const { data } = usePlanner()
  return (
    <Section title="What you do">
      <div className="space-y-2.5 text-xs">
        <div className="space-y-1">
          <div className="font-medium">Coursework</div>
          {coursework && <p className="text-muted-foreground">{coursework}</p>}
          {m.coursework.length > 0 ? (
            <ul className="space-y-0.5">
              {m.coursework.map((c) => (
                <CourseworkPiece key={`${c.title}-${c.due}`} piece={c} />
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Pieces not published yet.</p>
          )}
        </div>
        {m.examPct > 0 && (
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 font-medium">
              Exam
              {m.examSlot && <Badge variant="secondary" className="h-4 text-[10px] font-normal tabular-nums">slot {m.examSlot}</Badge>}
            </div>
            <p className="tabular-nums">
              {m.examDate ? formatDateTime(m.examDate) : <span className="text-muted-foreground">Exam date: TBA ({data.terms[m.term].exams})</span>}
            </p>
            {exam && <p className="text-muted-foreground">{exam}</p>}
          </div>
        )}
      </div>
    </Section>
  )
}

/** One coursework piece: title · due · weight · hours · group/individual. */
function CourseworkPiece({ piece: c }: { piece: Coursework }) {
  const Icon = c.group ? Users : User
  return (
    <li className="flex items-center gap-2">
      <Hint label={c.group ? "Group work" : "Individual"}>
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      </Hint>
      <span className="min-w-0 flex-1 truncate">{c.title}</span>
      <span className="shrink-0 text-muted-foreground tabular-nums">
        <Hint label={`Due ${formatDateTime(c.due)}`}>
          <span>{formatDay(c.due)}</span>
        </Hint>
        {c.weightPct !== null && <> · {c.weightPct}%</>}
        {c.hours !== null && <> · ~{c.hours} h</>}
      </span>
    </li>
  )
}

/** Compact weekly sessions. */
function WeekSection({ module: m }: { module: Module }) {
  return (
    <Section title="Week">
      {m.sessions.length === 0 ? (
        <p className="text-xs text-muted-foreground">No sessions timetabled.</p>
      ) : (
        <ul className="space-y-1 text-xs">
          {m.sessions.map((s) => (
            <li key={`${s.day}-${s.start}-${s.kind}`} className="grid grid-cols-[2rem_3.5rem_4.5rem_1fr_1rem] items-center gap-2">
              <span className="font-medium">{s.day}</span>
              <span className="tabular-nums">{shortRange(s.start, s.end)}</span>
              <Badge variant="outline" className="h-4 text-[10px] font-normal">{s.kind}</Badge>
              <span className="truncate text-muted-foreground">
                {s.rooms.join(", ")}
                {s.weeks !== 8 && ` · ${s.weeks} wks`}
              </span>
              <CaptureIcon session={s} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function CaptureIcon({ session: s }: { session: Session }) {
  if (s.kind === "video") return <Hint label="watch at home"><House className="size-3.5 text-muted-foreground" /></Hint>
  if (s.recorded === true) return <Hint label="This lecture is recorded"><Video className="size-3.5 text-good" /></Hint>
  if (s.recorded === false) return <Hint label="not recorded"><VideoOff className="size-3.5 text-warn" /></Hint>
  return <span />
}

/** Current lecturers vs last year, with their module ratings from other modules. */
function PeopleSection({ module: m }: { module: Module }) {
  const { lecturerIndex } = usePlanner()
  const { lastYear } = m.lecturers
  const team = teamVsLastYear(m)
  return (
    <Section
      title="People"
      aside={
        <Hint label="Ratings are per module (Rate My Modules), credited to everyone who taught it last year.">
          <Info className="size-3" />
        </Hint>
      }
    >
      <ul className="space-y-1.5 text-xs">
        {m.lecturers.now.map((name) => {
          const elsewhere = (lecturerIndex.get(nameKey(name)) ?? []).filter((r) => r.code !== m.code)
          return (
            <li key={name}>
              <div className="flex items-center gap-2">
                <span className="font-medium">{name}</span>
                {lastYear === null ? (
                  <Badge variant="secondary" className="h-4 text-[10px] font-normal text-muted-foreground">last year unknown</Badge>
                ) : includesName(lastYear, name) ? (
                  <Badge variant="secondary" className="h-4 text-[10px] font-normal">same as last year</Badge>
                ) : (
                  <Badge variant="outline" className="h-4 border-warn/40 text-[10px] font-normal text-warn">new</Badge>
                )}
              </div>
              {elsewhere.map((r) => (
                <div key={r.code} className="truncate text-muted-foreground">
                  {r.short} module rating{" "}
                  <span className={cn("font-medium tabular-nums", r.count >= THIN_REVIEWS && toneText[scoreTone(r.teaching)])}>{r.teaching.toFixed(1)}</span>
                  {" "}· {r.count} review{r.count === 1 ? "" : "s"}
                  {r.sharedWith.length > 0 && <> · shared with {r.sharedWith.join(", ")}</>}
                </div>
              ))}
            </li>
          )
        })}
        {m.lecturers.now.length === 0 && <li className="text-muted-foreground">Not announced.</li>}
      </ul>
      {team === "different" && lastYear && lastYear.length > 0 && (
        <p className="text-xs text-muted-foreground">Last year: {lastYear.join(", ")}</p>
      )}
    </Section>
  )
}

/** Review summary sentence and source link (scores live in the key facts). */
function ReviewsSection({ module: m }: { module: Module }) {
  const r = m.reviews
  return (
    <Section title="Reviews">
      {r ? (
        <div className="space-y-1 text-xs">
          {r.summary && <p>{r.summary}</p>}
          <div className="flex flex-wrap items-center gap-x-2 text-muted-foreground">
            <ExtLink href={r.url}>
              {r.count} review{r.count === 1 ? "" : "s"} · {runLabel(r.year, m.term)}
            </ExtLink>
            {teamVsLastYear(m) === "different" && <span className="text-warn">describes last year's team</span>}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No reviews.</p>
      )}
    </Section>
  )
}

/** Class averages above 75 are scaled down to 75, so a mean right at 75 means "at least 75". */
const isCapped = (mean: number) => mean >= 75 && Math.round(mean * 10) <= 752

function CapTag() {
  return (
    <Hint label="Class averages above 75 are scaled down to 75, so 75.0 means 'at least 75'">
      <span className="rounded-sm bg-muted px-1 text-[9px] font-medium tracking-wide text-muted-foreground uppercase">cap</span>
    </Hint>
  )
}

/** Published class means on one line, newest first; the latest is flagged if a different team set it. */
function MeansSection({ module: m }: { module: Module }) {
  const setBy = meanSetByOthers(m)
  return (
    <Section
      title="Class average"
      aside={
        <Hint label="Class averages above 75 are scaled down to 75, so 75.0 means 'at least 75'">
          <Info className="size-3" />
        </Hint>
      }
    >
      <p className="text-xs tabular-nums">
        {m.means.map((x, i) => (
          <Fragment key={x.year}>
            {i > 0 && <span className="text-muted-foreground"> · </span>}
            <span className="font-medium">{x.mean.toFixed(1)}</span>
            {isCapped(x.mean) && <> <CapTag /></>} <span className="text-muted-foreground">{runLabel(x.year, m.term)}</span>
            {i === 0 && setBy && (
              <>
                {" "}
                <Hint label={`Set by ${setBy.join(", ")}`}>
                  <span className="text-warn">(different lecturer)</span>
                </Hint>
              </>
            )}
          </Fragment>
        ))}
      </p>
    </Section>
  )
}
