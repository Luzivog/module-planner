// The dataset the app reads (public/data.json), written by scripts/fetch.ts.
// One source of truth: the fetch script validates against these schemas and the
// app imports the inferred types.
import { z } from "zod"

export const Day = z.enum(["Mon", "Tue", "Wed", "Thu", "Fri"])
export type Day = z.infer<typeof Day>

/** A weekly recurring session. "video" = pre-recorded material to watch at home. */
export const Session = z.object({
  day: Day,
  start: z.string().regex(/^\d\d:\d\d$/),
  end: z.string().regex(/^\d\d:\d\d$/),
  kind: z.enum(["lecture", "lab", "tutorial", "video"]),
  rooms: z.array(z.string()),
  /** Lecture capture: true, false, or null when the timetable doesn't say. */
  recorded: z.boolean().nullable(),
  /** Number of teaching weeks it runs (usually 8). */
  weeks: z.number().int(),
})
export type Session = z.infer<typeof Session>

/** Rate My Modules scores for the module's last run (1-5; difficulty 5 = hardest). */
export const Reviews = z.object({
  count: z.number().int(),
  content: z.number(),
  teaching: z.number(),
  difficulty: z.number(),
  /** Academic year the reviews describe, e.g. "2025-26". */
  year: z.string(),
  url: z.string().url(),
  /** One sentence in our own words, from data/notes.yaml. */
  summary: z.string().nullable(),
})
export type Reviews = z.infer<typeof Reviews>

/** One assessed coursework piece from Scientia (this year's; spring ones appear later). */
export const Coursework = z.object({
  title: z.string(),
  opens: z.string(), // ISO datetime
  due: z.string(), // ISO datetime
  /** Share of the module's coursework component, in % (Scientia's "weight"), if given. */
  weightPct: z.number().nullable(),
  /** Department's time estimate in hours, if given. */
  hours: z.number().nullable(),
  group: z.boolean(),
})
export type Coursework = z.infer<typeof Coursework>

export const Mean = z.object({ year: z.string(), mean: z.number() })
export type Mean = z.infer<typeof Mean>

export const Module = z.object({
  code: z.string(), // "70017"
  title: z.string(),
  short: z.string(), // short display name, e.g. "Distributed Ledgers"
  term: z.union([z.literal(1), z.literal(2)]),
  ects: z.number(),
  group: z.string(), // Scientia group, e.g. "SELECTIVE"
  examPct: z.number(), // 0 = coursework only
  examSlot: z.string().nullable(), // "101"; modules sharing a slot can't both be taken
  /** Codes Scientia says can't be taken together with this one (content overlap). */
  excludes: z.array(z.string()),
  sessions: z.array(Session),
  /** Runs across both terms (e.g. the ISO); `term` is then its start term. */
  spansTerms: z.boolean(),
  /** This year's assessed coursework, oldest due first; empty until published. */
  coursework: z.array(Coursework),
  /** Real exam date/time once the exam timetable is out (ISO), else null. */
  examDate: z.string().nullable(),
  lecturers: z.object({
    now: z.array(z.string()), // 2026-27
    /** 2025-26 (who the reviews describe); null = unknown. */
    lastYear: z.array(z.string()).nullable(),
    /** 2024-25 (who the published mean describes); null = unknown. */
    meanYear: z.array(z.string()).nullable(),
  }),
  /** Published class means, newest first (exams site, MSc AC class). */
  means: z.array(Mean),
  reviews: Reviews.nullable(),
  /** Hand-written facts from data/notes.yaml; all optional and short. */
  notes: z.object({
    coursework: z.string().nullable(),
    exam: z.string().nullable(),
    examiners: z.string().nullable(), // last examiners' report, paraphrased in one line
    caveat: z.string().nullable(), // the one thing to watch out for
    /** Extra expected study hours per teaching week beyond timetabled sessions and
     * coursework (e.g. Computer Architecture's 2-4 h of videos), if known. */
    extraHoursPerWeek: z.number().nullable(),
  }),
  links: z.object({
    official: z.string().url(),
    site: z.string().url().nullable(), // lecturer's own course site
  }),
})
export type Module = z.infer<typeof Module>

export const Dataset = z.object({
  generatedAt: z.string(),
  programme: z.string(), // "MSc Advanced Computing"
  selection: z.object({ closes: z.string() }),
  /** Scientia's ECTS rules, e.g. SELECTIVE 45-45. */
  rules: z.array(z.object({ group: z.string(), min: z.number(), max: z.number() })),
  terms: z.object({
    1: z.object({ teaching: z.string(), exams: z.string() }),
    2: z.object({ teaching: z.string(), exams: z.string() }),
  }),
  modules: z.array(Module),
})
export type Dataset = z.infer<typeof Dataset>
