// Builds public/data.json: every SELECTIVE module offered to MSc Advanced Computing
// for 2026-27, from the read-only Imperial CLIs on this laptop (imperial-doc,
// imperial-timetable), Rate My Modules, archived module pages on the Wayback Machine
// and the hand notes in data/notes.yaml. Run with `pnpm data`.
// Review texts go to data/.reviews-cache.json (local only: copyrighted, never
// published). Wayback lookups are cached in data/wayback.json (archived pages don't
// change); delete an entry to look it up again. data/celcat-2025-26.json keeps each
// module's 2025-26 run (staff, start date), since CELCAT stops showing it.
import { execFile } from "node:child_process"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { promisify } from "node:util"
import { parse as parseYaml } from "yaml"
import { z } from "zod"
import { type Coursework, Dataset, Day, type Mean, type Module, type Reviews, type Session } from "../src/data/schema.ts"

const ROOT = new URL("..", import.meta.url)
const OUT = new URL("public/data.json", ROOT)
const NOTES = new URL("data/notes.yaml", ROOT)
const REVIEWS_CACHE = new URL("data/.reviews-cache.json", ROOT)
const WAYBACK_CACHE = new URL("data/wayback.json", ROOT)
const PAST_RUNS = new URL("data/celcat-2025-26.json", ROOT)

/** First day of 2026-27 in CELCAT's merged feed; earlier events are 2025-26. */
const THIS_YEAR_FROM = "2026-09-26"
const LAST_YEAR_FROM = "2025-09-01"
const AVERAGE_YEARS = ["2024-2025", "2023-2024", "2022-2023"] // newest first
const RMM = "https://www.ratemymodules.co.uk"
const RMM_COURSE = `${RMM}/icl/adv-comp`
/** The year `lecturers.meanYear` describes (the latest published means). */
const MEAN_YEAR = "2024-25"
/** Wayback snapshot windows: teaching months of each year, aiming for the middle. */
const ARCHIVE_YEARS = {
  "2025-26": { from: "20251001", to: "20260331", aim: "20251215" },
  "2024-25": { from: "20241001", to: "20250331", aim: "20241215" },
} as const
type ArchiveYear = keyof typeof ARCHIVE_YEARS

const TERMS = {
  1: { teaching: "5 Oct – 27 Nov", exams: "7–11 Dec" },
  2: { teaching: "11 Jan – 5 Mar", exams: "15–19 Mar" },
}

const execFileAsync = promisify(execFile)

/** Runs a CLI and returns its stdout. */
async function run(cmd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(cmd, args, { maxBuffer: 64 * 1024 * 1024 })
  return stdout
}

/** Maps over items with at most `limit` running at once, keeping order. */
async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const round2 = (n: number) => Math.round(n * 100) / 100
const errorText = (e: unknown) => (e instanceof Error ? e.message.split("\n")[0] : String(e))

// --- Scientia: modules on offer (imperial-doc) ---------------------------------

// Only the public fields; `choice`/`clashes`/`tally.chosen` are the signed-in student's own picks
// and are never read.
const DocModules = z.object({
  window: z.object({ end: z.string().nullable() }),
  tally: z.object({ groups: z.array(z.object({ label: z.string(), min: z.number(), max: z.number() })) }),
  modules: z.array(
    z.object({
      code: z.string(),
      title: z.string(),
      ects: z.number(),
      terms: z.array(z.number()),
      group: z.string(),
      exam: z.number().nullable(),
      slot: z.string().nullable(),
    }),
  ),
})
type DocModule = z.infer<typeof DocModules>["modules"][number]

/** Scientia's module list for the degree. */
async function fetchOffer() {
  return DocModules.parse(JSON.parse(await run("imperial-doc", ["modules", "--json"])))
}

// Only the exercise's own fields; submissions, marks and other personal fields are never read.
const Exercise = z.object({
  module_code: z.string(),
  title: z.string(),
  start: z.string(),
  end: z.string(),
  type: z.string(),
  requires_submission: z.boolean(),
  requires_group: z.boolean(),
  weight: z.number().nullable(),
  expected_hours: z.number().nullable(),
})

/** This year's assessed coursework per 5-digit module code, oldest due first. */
async function fetchCoursework(): Promise<Map<string, Coursework[]>> {
  const out = new Map<string, Coursework[]>()
  try {
    const raw = z.array(Exercise).parse(JSON.parse(await run("imperial-doc", ["get", "scientia:/me/2627/exercises"])))
    // Assessed coursework only: no tutorials (TUT), tests (T) or zero-weight items.
    for (const e of raw.filter((e) => e.type === "CW" && e.requires_submission && (e.weight === null || e.weight > 0))) {
      const list = out.get(e.module_code) ?? []
      list.push({
        title: e.title.trim().replace(/\s+TODO$/, "").trim(),
        opens: e.start,
        due: e.end,
        weightPct: e.weight,
        hours: e.expected_hours,
        group: e.requires_group,
      })
      out.set(e.module_code, list)
    }
    for (const list of out.values()) list.sort((a, b) => a.due.localeCompare(b.due))
  } catch (e) {
    console.warn(`coursework: ${errorText(e)}`)
  }
  return out
}

const ExamTimetable = z.object({
  timetable: z.object({ published: z.boolean() }).nullable(),
  exams: z.array(z.object({ code: z.string(), day: z.string().nullable(), time: z.string() })),
})

/** Real exam dates by 5-digit code, once the department publishes the timetable (CELCAT's are placeholders). */
async function fetchExamDates(): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  try {
    const t = ExamTimetable.parse(JSON.parse(await run("imperial-doc", ["exams", "--all", "--json"])))
    if (!t.timetable?.published) return out
    for (const e of t.exams) {
      if (!e.day) continue
      const time = e.time.match(/^\d\d:\d\d$/)?.[0]
      out.set(e.code.replace(/^COMP/, ""), time ? `${e.day}T${time}` : e.day)
    }
  } catch (e) {
    console.warn(`exam timetable: ${errorText(e)}`)
  }
  return out
}

// --- CELCAT timetable (imperial-timetable) -------------------------------------

const TimetableEvent = z.object({
  start: z.string(), // local "2026-10-06T09:00"
  end: z.string(),
  kind: z.string(),
  recorded: z.boolean().nullable(),
  rooms: z.array(z.string()),
  staff: z.array(z.string()),
})
type TimetableEvent = z.infer<typeof TimetableEvent>
const Timetable = z.object({ events: z.array(TimetableEvent) })

/** All CELCAT events for a module (both academic years); [] if the fetch fails. */
async function fetchEvents(code: string): Promise<TimetableEvent[]> {
  try {
    return Timetable.parse(JSON.parse(await run("imperial-timetable", ["module", code, "--json"]))).events
  } catch (e) {
    console.warn(`timetable ${code}: ${errorText(e)}`)
    return []
  }
}

const DAYS: (Day | null)[] = [null, "Mon", "Tue", "Wed", "Thu", "Fri", null]
const SKIPPED_KINDS = new Set(["examination", "presentation"])

/** CELCAT kind -> our session kind. */
function sessionKind(kind: string): Session["kind"] {
  if (kind === "online") return "video"
  if (kind === "office hours") return "tutorial"
  if (kind === "lab") return "lab"
  return "lecture"
}

/** Kind order for ties when slots merge: in-person teaching first. */
const KIND_PRIORITY: Session["kind"][] = ["lecture", "lab", "tutorial", "video"]
/** Distinct dates: some sessions are booked twice on one date (an overflow room). */
const datesOf = (evs: TimetableEvent[]) => new Set(evs.map((e) => e.start.slice(0, 10)))
const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))

type Slot = { day: Day; start: string; end: string; parts: { kind: Session["kind"]; events: TimetableEvent[] }[] }

/**
 * Collapses this year's events into weekly sessions, dropping one-offs, exams and
 * presentations. Slots inside another slot on the same day merge into it, so each
 * time block appears once (e.g. 70114's Tue 14-16 lecture alternating with a 14-15
 * lecture + 15-16 lab, or 70075's Mon 16-18 alternating video/lecture weeks); the
 * merged session takes the kind that ran most weeks.
 */
function toSessions(events: TimetableEvent[]): Session[] {
  const groups = new Map<string, Slot>()
  for (const e of events) {
    if (e.start < THIS_YEAR_FROM || SKIPPED_KINDS.has(e.kind)) continue
    const day = DAYS[new Date(`${e.start.slice(0, 10)}T00:00:00Z`).getUTCDay()]
    if (!day) continue
    const [start, end, kind] = [e.start.slice(11, 16), e.end.slice(11, 16), sessionKind(e.kind)]
    const key = `${day} ${start} ${end} ${kind}`
    const group = groups.get(key) ?? { day, start, end, parts: [{ kind, events: [] }] }
    group.parts[0].events.push(e)
    groups.set(key, group)
  }
  const recurring = [...groups.values()].filter((g) => datesOf(g.parts[0].events).size >= 2)
  const slots: Slot[] = []
  for (const g of recurring.sort((a, b) => minutes(b.end) - minutes(b.start) - (minutes(a.end) - minutes(a.start)))) {
    const host = slots.find((s) => s.day === g.day && s.start <= g.start && g.end <= s.end)
    if (host) host.parts.push(...g.parts)
    else slots.push(g)
  }
  return slots
    .map(({ parts, ...slot }) => {
      const evs = parts.flatMap((p) => p.events)
      const weeksOf = (kind: Session["kind"]) => datesOf(parts.filter((p) => p.kind === kind).flatMap((p) => p.events)).size
      const recorded = evs.map((e) => e.recorded)
      return {
        ...slot,
        kind: [...KIND_PRIORITY].sort((a, b) => weeksOf(b) - weeksOf(a))[0],
        rooms: mostCommon(evs.map((e) => e.rooms.filter((r) => r !== "Online"))),
        recorded: recorded.includes(true) ? true : recorded.includes(null) ? null : false,
        weeks: datesOf(evs).size,
      }
    })
    .sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.start.localeCompare(b.start))
}

/** The most frequent non-empty room set (first seen wins ties); [] if none. */
function mostCommon(sets: string[][]): string[] {
  const counts = new Map<string, { rooms: string[]; n: number }>()
  for (const rooms of sets.filter((r) => r.length > 0)) {
    const key = JSON.stringify(rooms)
    const c = counts.get(key) ?? { rooms, n: 0 }
    c.n++
    counts.set(key, c)
  }
  return [...counts.values()].reduce<{ rooms: string[]; n: number }>((best, c) => (c.n > best.n ? c : best), { rooms: [], n: 0 }).rooms
}

/** "Pritz, Paul J" -> "Paul Pritz" (drops middle initials). */
function staffName(raw: string): string {
  const [last, given] = raw.split(", ")
  if (!given) return raw.trim()
  const first = given.split(" ").filter((w) => !/^[A-Z]\.?$/.test(w))
  return [...first, last].join(" ").trim()
}

/** Staff on a year's teaching events, most frequent first. */
function staffBetween(events: TimetableEvent[], from: string, to: string): string[] {
  const counts = new Map<string, number>()
  for (const e of events) {
    if (e.start < from || e.start >= to || SKIPPED_KINDS.has(e.kind)) continue
    for (const s of e.staff) counts.set(staffName(s), (counts.get(staffName(s)) ?? 0) + 1)
  }
  return [...counts].sort((a, b) => b[1] - a[1]).map(([name]) => name)
}

// CELCAT's feed only reaches a year back, and for modules in the maintainer's own timetable it
// only has this year, so each module's 2025-26 run is saved while it's still visible.
const PastRun = z.object({
  staff: z.array(z.string()),
  /** First 2025-26 teaching date, or null when not recorded. */
  from: z.string().nullable(),
})
type PastRun = z.infer<typeof PastRun>
const PastRuns = z.record(z.string(), PastRun)

/** Saved 2025-26 runs (data/celcat-2025-26.json), refreshed from whatever CELCAT still shows. */
async function updatePastRuns(codes: string[], events: TimetableEvent[][]): Promise<Record<string, PastRun>> {
  let runs: Record<string, PastRun> = {}
  try {
    runs = PastRuns.parse(JSON.parse(await readFile(PAST_RUNS, "utf8")))
  } catch {
    // no file yet
  }
  codes.forEach((code, i) => {
    const taught = events[i].filter((e) => e.start >= LAST_YEAR_FROM && e.start < THIS_YEAR_FROM && !SKIPPED_KINDS.has(e.kind))
    const staff = staffBetween(taught, LAST_YEAR_FROM, THIS_YEAR_FROM)
    if (staff.length) runs[code] = { staff, from: taught.map((e) => e.start.slice(0, 10)).sort()[0] }
  })
  const sorted = Object.fromEntries(Object.entries(runs).sort(([a], [b]) => a.localeCompare(b)))
  await writeFile(PAST_RUNS, `${JSON.stringify(sorted, null, 1)}\n`)
  return sorted
}

// --- Exams site: class means (imperial-doc get) ---------------------------------

type MeanRow = { codes: string[]; title: string; mean: number }

/** Parses the "Code | Title | Mean" rows of one year's MSc AC averages page. */
async function fetchMeans(year: string): Promise<MeanRow[]> {
  try {
    const text = await run("imperial-doc", ["get", `exams:/averages/${year}/macaverages.html`])
    return text.split("\n").flatMap((line) => {
      const m = line.match(/^(COMP[\w=]+) \| (.+) \| ([\d.]+)\s*$/)
      if (!m) return []
      // "COMP70020=COMP70020R=COMP97146": all aliases, resit suffix dropped.
      const codes = m[1].split("=").map((c) => c.replace(/R$/, ""))
      return [{ codes, title: m[2], mean: Number(m[3]) }]
    })
  } catch (e) {
    console.warn(`means ${year}: ${errorText(e)}`)
    return []
  }
}

const STOP = new Set(["and", "of", "for", "in", "the", "to", "introduction", "term", "msc", "a", "an", "with"])
const words = (title: string) =>
  new Set(title.toLowerCase().replace(/\(.*?\)/g, " ").split(/[^a-z0-9]+/).filter((w) => w && !STOP.has(w)))

/** Whether two titles name the same module (codes get reused: 70010 was "Deep Learning"). */
function sameModule(a: string, b: string): boolean {
  const [x, y] = [words(a), words(b)]
  if (!x.size || !y.size) return false
  const shared = [...x].filter((w) => y.has(w)).length
  return shared === Math.min(x.size, y.size) || shared / new Set([...x, ...y]).size >= 0.5
}

/** Means for one module across years, newest first, only where the title matches. */
function meansFor(code: string, title: string, years: { year: string; rows: MeanRow[] }[]): Mean[] {
  return years.flatMap(({ year, rows }) => {
    const row = rows.find((r) => r.codes.includes(code) && sameModule(r.title, title))
    return row ? [{ year: `${year.slice(0, 5)}${year.slice(7)}`, mean: row.mean }] : []
  })
}

// --- Wayback Machine: past module leaders --------------------------------------

const Snapshot = z.object({ url: z.string(), leaders: z.array(z.string()) })
/** Per code and year: the snapshot used, or null when none exists in the window. */
const WaybackCache = z.record(z.string(), z.record(z.string(), Snapshot.nullable()))
type WaybackCache = z.infer<typeof WaybackCache>

const WAYBACK_DELAY_MS = 4000
const officialUrl = (code: string) => `https://www.imperial.ac.uk/computing/current-students/courses/${code}/`

/** Fetches from the Wayback Machine gently: a pause before each request, backing off on 429 and 5xx. */
async function waybackFetch(url: string): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    await sleep(WAYBACK_DELAY_MS)
    const res = await fetch(url, { signal: AbortSignal.timeout(90_000) })
    if ((res.status === 429 || res.status >= 500) && attempt < 2) {
      console.warn(`wayback: ${res.status}, waiting ${30 * (attempt + 1)} s`)
      await sleep(30_000 * (attempt + 1))
      continue
    }
    if (!res.ok) throw new Error(`${res.status} ${url}`)
    return res.text()
  }
}

const TITLES = /^(Mr|Mrs|Ms|Miss|Mx|Dr|Prof|Professor|Sir|Dame)\.?\s+/i

/** "Mr Paul Pritz<br />Professor William Knottenbelt" under "Module leaders" -> names. */
function parseLeaders(html: string): string[] {
  const section = html.match(/<h3>\s*Module leaders\s*<\/h3>([\s\S]*?)<\/div>/i)?.[1] ?? ""
  return section
    .split(/<br\s*\/?>/i)
    .map((s) => s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim())
    .map((s) => {
      let name = s
      while (TITLES.test(name)) name = name.replace(TITLES, "")
      return name
    })
    .filter(Boolean)
}

/** Snapshot timestamp in a window closest to its middle, or null. */
function pickSnapshot(timestamps: string[], year: ArchiveYear): string | null {
  const { from, to, aim } = ARCHIVE_YEARS[year]
  const inWindow = timestamps.filter((t) => t.slice(0, 8) >= from && t.slice(0, 8) <= to)
  const distance = (t: string) => Math.abs(Number(t.slice(0, 8)) - Number(aim))
  return inWindow.sort((a, b) => distance(a) - distance(b))[0] ?? null
}

/** Module leaders from archived module pages for the requested years, using and updating the cache. */
async function fetchArchivedLeaders(needs: { code: string; years: ArchiveYear[] }[]): Promise<WaybackCache> {
  let cache: WaybackCache = {}
  try {
    cache = WaybackCache.parse(JSON.parse(await readFile(WAYBACK_CACHE, "utf8")))
  } catch {
    // no cache yet
  }
  const todo = needs
    .map(({ code, years }) => ({ code, years: years.filter((y) => cache[code]?.[y] === undefined) }))
    .filter((n) => n.years.length > 0)
  if (todo.length) console.log(`wayback: ${todo.length} modules to look up (~${WAYBACK_DELAY_MS / 1000} s per request)...`)
  for (const { code, years } of todo) {
    try {
      const cdx = await waybackFetch(
        `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(officialUrl(code))}` +
          `&from=20241001&to=20260331&filter=statuscode:200&fl=timestamp&output=json`,
      )
      const rows = z.array(z.array(z.string())).parse(JSON.parse(cdx || "[]"))
      const timestamps = rows.slice(1).map((r) => r[0])
      const entry = (cache[code] ??= {})
      for (const year of years) {
        const ts = pickSnapshot(timestamps, year)
        if (!ts) {
          entry[year] = null
          continue
        }
        const url = `https://web.archive.org/web/${ts}/${officialUrl(code)}`
        const html = await waybackFetch(`https://web.archive.org/web/${ts}id_/${officialUrl(code)}`)
        entry[year] = { url, leaders: parseLeaders(html) }
      }
    } catch (e) {
      console.warn(`wayback ${code}: ${errorText(e)}`)
    }
    // Save as we go so an interrupted run keeps its progress.
    await writeFile(WAYBACK_CACHE, `${JSON.stringify(cache, null, 1)}\n`)
  }
  return cache
}

/** Leaders on an archived page, or null when no snapshot or the page lists none. */
function archived(cache: WaybackCache, code: string, year: ArchiveYear): string[] | null {
  const leaders = cache[code]?.[year]?.leaders
  return leaders && leaders.length > 0 ? leaders : null
}

// --- Rate My Modules ----------------------------------------------------------

const RmmReview = z.object({
  body: z.string().nullable(),
  content_rating: z.number(),
  teaching_rating: z.number(),
  difficulty_rating: z.number(),
  created_at: z.string(),
})
type RmmReview = z.infer<typeof RmmReview>
type CachedReviews = { url: string; reviews: { date: string; content: number; teaching: number; difficulty: number; body: string | null }[] }

/** Fetches a page as text, politely. */
async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "user-agent": "module-planner (personal, low volume)" } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.text()
}

/** Decodes the Next.js flight stream from `self.__next_f.push([1,"..."])` chunks. */
function flightLines(html: string): string[] {
  const chunks = [...html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)]
  const stream = chunks.map((m) => z.string().parse(JSON.parse(m[1]))).join("")
  return stream.split("\n")
}

/** Finds the first `reviews: [...]` array anywhere in a parsed flight value. */
function findReviews(value: unknown): unknown[] | null {
  if (Array.isArray(value)) {
    for (const v of value) {
      const found = findReviews(v)
      if (found) return found
    }
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (k === "reviews" && Array.isArray(v)) return v
      const found = findReviews(v)
      if (found) return found
    }
  }
  return null
}

/** The reviews on one module page ([] when it has none). */
function parseReviews(html: string): RmmReview[] {
  for (const line of flightLines(html)) {
    const json = line.replace(/^[0-9a-f]+:/, "")
    if (!json.startsWith("[") && !json.startsWith("{")) continue
    let value: unknown
    try {
      value = JSON.parse(json)
    } catch {
      continue
    }
    const found = findReviews(value)
    if (found) return z.array(RmmReview).parse(found)
  }
  return []
}

/** Scores and texts for every module listed on the course page, keyed by 5-digit code. */
async function fetchRmm(): Promise<Map<string, CachedReviews>> {
  const out = new Map<string, CachedReviews>()
  let paths: string[]
  try {
    const index = await fetchText(RMM_COURSE)
    paths = [...new Set([...index.matchAll(/\/icl\/adv-comp\/(\d{5})-[a-z0-9-]+/g)].map((m) => m[0]))]
  } catch (e) {
    console.warn(`rate my modules index: ${errorText(e)}`)
    return out
  }
  for (const path of paths) {
    const code = path.match(/\/(\d{5})-/)?.[1]
    if (!code) continue
    const url = `${RMM}${path}`
    try {
      const reviews = parseReviews(await fetchText(url))
      out.set(code, {
        url,
        reviews: reviews.map((r) => ({
          date: r.created_at.slice(0, 10),
          content: r.content_rating,
          teaching: r.teaching_rating,
          difficulty: r.difficulty_rating,
          body: r.body,
        })),
      })
    } catch (e) {
      console.warn(`rate my modules ${code}: ${errorText(e)}`)
    }
    await sleep(800)
  }
  return out
}

/**
 * The run the reviews describe. All reviews so far were written Jan-Mar 2026: the
 * 2025-26 run if it started before the first review, else (a spring module) 2024-25.
 * Without a recorded start date, the term decides.
 */
function reviewYear(pastRun: PastRun | undefined, term: 1 | 2, firstReview: string): ArchiveYear {
  if (pastRun?.from) return pastRun.from < firstReview ? "2025-26" : "2024-25"
  return term === 1 ? "2025-26" : "2024-25"
}

/** Average scores for the public dataset (no review text), attributed to that year's team. */
function reviewScores(
  cached: CachedReviews | undefined,
  summary: string | null,
  pastRun: PastRun | undefined,
  term: 1 | 2,
  teams: Record<ArchiveYear, string[] | null>,
): Reviews | null {
  if (!cached || cached.reviews.length === 0) return null
  const year = reviewYear(pastRun, term, cached.reviews.map((r) => r.date).sort()[0])
  const avg = (pick: (r: CachedReviews["reviews"][number]) => number) =>
    round2(cached.reviews.reduce((s, r) => s + pick(r), 0) / cached.reviews.length)
  return {
    count: cached.reviews.length,
    content: avg((r) => r.content),
    teaching: avg((r) => r.teaching),
    difficulty: avg((r) => r.difficulty),
    year,
    team: teams[year],
    url: cached.url,
    summary,
  }
}

// --- Hand notes (data/notes.yaml) ---------------------------------------------

const Note = z
  .object({
    short: z.string(),
    coursework: z.string(),
    exam: z.string(),
    examiners: z.string(),
    caveat: z.string(),
    reviewSummary: z.string(),
    site: z.url({ protocol: /^https$/ }),
    /** Overrides CELCAT's lecture capture: for every session, or per day ({ Tue: false }). */
    recordedOverride: z.union([z.boolean(), z.partialRecord(Day, z.boolean())]),
    /** Lecturers when the archive and CELCAT are missing or wrong ("First Last"). */
    now: z.array(z.string()),
    lastYear: z.array(z.string()),
    meanYear: z.array(z.string()),
    extraHoursPerWeek: z.number(),
  })
  .partial()
  .strict()
type Note = z.infer<typeof Note>
const Notes = z.record(z.string().regex(/^\d{5}$/), Note)

/** Hand notes keyed by 5-digit code. */
async function readNotes(): Promise<Record<string, Note>> {
  return Notes.parse(parseYaml(await readFile(NOTES, "utf8")) ?? {})
}

// --- Assembly ------------------------------------------------------------------

/** Applies a notes.yaml recording override to the sessions. */
function overrideRecorded(sessions: Session[], override: Note["recordedOverride"]): Session[] {
  if (override === undefined) return sessions
  return sessions.map((s) => {
    const value = typeof override === "boolean" ? override : override[s.day]
    return value === undefined ? s : { ...s, recorded: value }
  })
}

type Sources = {
  events: TimetableEvent[]
  pastRun: PastRun | undefined
  means: Mean[]
  rmm: CachedReviews | undefined
  coursework: Coursework[]
  examDate: string | null
  archive: WaybackCache
  note: Note
}

/** One module record from all sources (notes override). */
function buildModule(m: DocModule, { events, pastRun, means, rmm, coursework, examDate, archive, note }: Sources): Module {
  const code = m.code.replace(/^COMP/, "")
  const term = m.terms[0] === 2 ? 2 : 1 // ISO runs in both; listed under its first term
  // Notes, then CELCAT's 2025-26 run, then the archived module page.
  const lastYear = note.lastYear ?? pastRun?.staff ?? archived(archive, code, "2025-26")
  const meanYear = note.meanYear ?? (means.some((x) => x.year === MEAN_YEAR) ? archived(archive, code, "2024-25") : null)
  return {
    code,
    title: m.title,
    short: note.short ?? m.title,
    term,
    ects: m.ects,
    group: m.group,
    examPct: m.exam ?? 0,
    examSlot: m.slot?.replace(/^Tx/, "") ?? null,
    excludes: [], // Scientia exposes no content exclusions for this degree (only exam slots).
    sessions: overrideRecorded(toSessions(events), note.recordedOverride),
    spansTerms: m.terms.includes(1) && m.terms.includes(2),
    coursework,
    examDate,
    lecturers: {
      now: note.now ?? staffBetween(events, THIS_YEAR_FROM, "9999"),
      lastYear,
      meanYear,
    },
    means,
    reviews: reviewScores(rmm, note.reviewSummary ?? null, pastRun, term, { "2025-26": lastYear, "2024-25": meanYear }),
    notes: {
      coursework: note.coursework ?? null,
      exam: note.exam ?? null,
      examiners: note.examiners ?? null,
      caveat: note.caveat ?? null,
      extraHoursPerWeek: note.extraHoursPerWeek ?? null,
    },
    links: {
      official: officialUrl(code),
      site: note.site ?? null,
    },
  }
}

/** Stops early with a clear message when the maintainer's private tools aren't installed. */
async function requireTools(): Promise<void> {
  for (const tool of ["imperial-doc", "imperial-timetable"]) {
    try {
      await execFileAsync("which", [tool])
    } catch {
      console.error(
        `\`pnpm data\` needs ${tool}, a private tool the maintainer uses with their Imperial login; it isn't published.\n` +
          "To fix or add data, edit data/notes.yaml (and public/data.json to preview) and open a PR with a source.",
      )
      process.exit(1)
    }
  }
}

async function main() {
  await requireTools()
  const [offer, notes, meanYears, coursework, examDates] = await Promise.all([
    fetchOffer(),
    readNotes(),
    Promise.all(AVERAGE_YEARS.map(async (year) => ({ year, rows: await fetchMeans(year) }))),
    fetchCoursework(),
    fetchExamDates(),
  ])
  const selective = offer.modules.filter((m) => m.group === "SELECTIVE")
  console.log(`${selective.length} SELECTIVE modules; fetching timetables...`)
  const events = await pool(selective, 4, (m) => fetchEvents(m.code))
  const means = selective.map((m) => meansFor(m.code, m.title, meanYears))
  const pastRuns = await updatePastRuns(selective.map((m) => m.code.replace(/^COMP/, "")), events)

  // Archive lookups only where notes and CELCAT leave a gap.
  const needs = selective.map((m, i) => {
    const note = notes[m.code.replace(/^COMP/, "")] ?? {}
    const years: ArchiveYear[] = []
    if (!note.lastYear && !pastRuns[m.code.replace(/^COMP/, "")]) years.push("2025-26")
    if (!note.meanYear && means[i].some((x) => x.year === MEAN_YEAR)) years.push("2024-25")
    return { code: m.code.replace(/^COMP/, ""), years }
  })
  const archive = await fetchArchivedLeaders(needs.filter((n) => n.years.length > 0))

  console.log("fetching Rate My Modules...")
  const rmm = await fetchRmm()

  const modules = selective
    .map((m, i) => {
      const code = m.code.replace(/^COMP/, "")
      return buildModule(m, {
        events: events[i],
        pastRun: pastRuns[code],
        means: means[i],
        rmm: rmm.get(code),
        coursework: coursework.get(code) ?? [],
        examDate: examDates.get(code) ?? null,
        archive,
        note: notes[code] ?? {},
      })
    })
    .sort((a, b) => a.term - b.term || a.code.localeCompare(b.code))

  linkTermTwins(modules)

  for (const code of Object.keys(notes)) {
    if (!modules.some((m) => m.code === code)) console.warn(`notes.yaml: ${code} is not on offer`)
  }
  for (const m of modules) {
    if (notes[m.code]?.reviewSummary && !m.reviews) console.warn(`notes.yaml: ${m.code} has a reviewSummary but no reviews`)
  }

  const dataset = Dataset.parse({
    generatedAt: new Date().toISOString(),
    programme: "MSc Advanced Computing",
    selection: { closes: offer.window.end ?? "" },
    rules: offer.tally.groups
      .filter((g) => g.label === "SELECTIVE")
      .map((g) => ({ group: g.label, min: g.min, max: g.max })),
    terms: TERMS,
    modules,
  })

  await mkdir(new URL("data/", ROOT), { recursive: true })
  await writeFile(OUT, `${JSON.stringify(dataset, null, 1)}\n`)
  await writeFile(REVIEWS_CACHE, `${JSON.stringify(Object.fromEntries(rmm), null, 1)}\n`)

  const count = (pred: (m: Module) => boolean) => modules.filter(pred).length
  console.log(
    `wrote ${OUT.pathname}: ${modules.length} modules, ${count((m) => m.sessions.length > 0)} with sessions, ` +
      `${count((m) => m.reviews !== null)} with reviews, ${count((m) => m.means.length > 0)} with means, ` +
      `${count((m) => m.coursework.length > 0)} with coursework, ${count((m) => m.examDate !== null)} with exam dates; ` +
      `lecturers last year known ${count((m) => m.lecturers.lastYear !== null)}, ` +
      `mean year known ${count((m) => m.lecturers.meanYear !== null)} of ${count((m) => m.means[0]?.year === MEAN_YEAR)} with a ${MEAN_YEAR} mean`,
  )
}

await main()

/** The same module offered in both terms (same title, different code), e.g. Generative AI
 * 70113 (autumn) and 70010 (spring): you can take only one, so each excludes the other. */
function linkTermTwins(modules: Module[]): void {
  for (const a of modules) {
    for (const b of modules) {
      if (a !== b && a.term !== b.term && a.title === b.title && !a.excludes.includes(b.code)) a.excludes.push(b.code)
    }
  }
}
