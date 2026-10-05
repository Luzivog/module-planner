# Contributing

PRs welcome, from people or their agents. Keep them small: one change per PR.

## Rules

- **Data changes go only in `data/notes.yaml`** (short, plain-English one-liners
  and overrides). Don't edit `public/data.json`: it's generated, and the
  maintainer regenerates it with `pnpm data` (which needs private Imperial
  tools) after merging.
- **Every data PR must cite a source** for each fact (a link, or where in
  Scientia, the timetable or the exams site it's shown). Links must be `https://`.
- **No personal data** (no names of students, no individual marks or choices).
- **No copied review text** from Rate My Modules or elsewhere: scores, counts
  and a one-sentence summary in your own words only. No pasted examiners'
  reports either; paraphrase in one line.
- **Keep the UI minimal**: numbers and badges over text, nothing that shifts the
  layout, and check it on a phone-sized screen too.
- `pnpm build` and `pnpm lint` must pass (CI runs them on every PR).
- UI changes: include screenshots (desktop and phone width).

## Code

TypeScript, React, Tailwind, shadcn/ui (Base UI). The dataset's shape lives in
`src/data/schema.ts` (zod); derive types from it rather than redeclaring them.
No `any`. Pure logic goes in `src/lib/`, components in `src/components/planner/`.

```sh
pnpm install
pnpm dev
```
