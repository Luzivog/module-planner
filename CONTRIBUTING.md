# Contributing

PRs welcome, from people or their agents. Keep them small: one change per PR.

## Rules

- **Data fixes go in `data/notes.yaml`** (short, plain-English one-liners and
  overrides), with the source of each fact in the PR description. You can't run
  `pnpm data` (it needs the maintainer's private Imperial tools), so to see your
  change in the app before then, also make the same edit in `public/data.json`;
  the next refresh regenerates it from `notes.yaml`.
- **No personal data** (no names of students, no individual marks or choices).
- **No copied review text** from Rate My Modules or elsewhere: scores, counts
  and a one-sentence summary in your own words only. No pasted examiners'
  reports either; paraphrase in one line.
- **Keep the UI minimal**: numbers and badges over text, nothing that shifts the
  layout, and check it on a phone-sized screen too.
- `pnpm build` and `pnpm lint` must pass (CI runs them on every PR).
- UI changes: include a screenshot.

## Code

TypeScript, React, Tailwind, shadcn/ui (Base UI). The dataset's shape lives in
`src/data/schema.ts` (zod); derive types from it rather than redeclaring them.
No `any`. Pure logic goes in `src/lib/`, components in `src/components/planner/`.

```sh
pnpm install
pnpm dev
```
