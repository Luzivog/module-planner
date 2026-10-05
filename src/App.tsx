import { useMemo, useState } from "react"
import type { Dataset, Module } from "@/data/schema"
import { DesktopLayout, PhoneLayout, TabletLayout } from "@/components/planner/layouts"
import { ModuleSheet } from "@/components/planner/module-sheet"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useDataset } from "@/hooks/use-dataset"
import { useLayout } from "@/hooks/use-media"
import { PlannerContext, type Planner } from "@/hooks/use-planner"
import { useSelection } from "@/hooks/use-selection"
import { assignColors } from "@/lib/colors"

/** Loads the dataset, then renders the planner (or a minimal loading/error state). */
export default function App() {
  const state = useDataset()
  if (state.status === "loading") {
    return <div className="grid h-dvh place-items-center text-sm text-muted-foreground">Loading modules…</div>
  }
  if (state.status === "error") {
    return (
      <div className="grid h-dvh place-items-center p-8">
        <div className="max-w-xl space-y-2">
          <p className="text-sm font-medium text-bad">Couldn't load data.json</p>
          <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">{state.message}</pre>
        </div>
      </div>
    )
  }
  return <PlannerApp data={state.data} />
}

/** The planner (layout per screen size: desktop, tablet, phone) plus the details sheet. */
function PlannerApp({ data }: { data: Dataset }) {
  const validCodes = useMemo(() => new Set(data.modules.map((m) => m.code)), [data])
  const { codes, toggle, shared, keepMine, adoptShared } = useSelection(validCodes)
  const [term, setTerm] = useState<Module["term"]>(1)
  const [sheet, setSheet] = useState<{ code: string | null; open: boolean }>({ code: null, open: false })

  const lookups = useMemo(() => ({ byCode: new Map(data.modules.map((m) => [m.code, m])) }), [data])

  const planner = useMemo<Planner>(() => {
    const selected = data.modules.filter((m) => codes.includes(m.code))
    return {
      data,
      ...lookups,
      selected,
      colors: assignColors(data.modules, new Set(codes)),
      isSelected: (code) => codes.includes(code),
      toggle,
      openSheet: (code) => setSheet({ code, open: true }),
    }
  }, [data, lookups, codes, toggle])

  const layout = useLayout()
  const Layout = { desktop: DesktopLayout, tablet: TabletLayout, phone: PhoneLayout }[layout]

  const sheetModule = sheet.code ? (lookups.byCode.get(sheet.code) ?? null) : null

  return (
    <PlannerContext value={planner}>
      <TooltipProvider delay={150}>
        <a
          href="#timetable"
          className="sr-only rounded-md bg-foreground text-sm text-background focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-3 focus:py-2"
        >
          Skip to timetable
        </a>
        <h1 className="sr-only">Module planner (unofficial)</h1>
        <div className="flex h-dvh flex-col">
          {shared && <SharedPlanBanner hasMine={shared.hasMine} onKeepMine={keepMine} onUseThis={adoptShared} />}
          <div className="min-h-0 flex-1">
            <Layout term={term} onTermChange={setTerm} />
          </div>
        </div>
        <ModuleSheet module={sheetModule} open={sheet.open} onOpenChange={(open) => setSheet((s) => ({ ...s, open }))} />
      </TooltipProvider>
    </PlannerContext>
  )
}

/** Shown while previewing a plan from someone's link; nothing is saved until they choose (or edit it). */
function SharedPlanBanner({ hasMine, onKeepMine, onUseThis }: { hasMine: boolean; onKeepMine: () => void; onUseThis: () => void }) {
  return (
    <div role="status" className="flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b bg-muted px-4 py-1.5 text-xs">
      <span className="font-medium">Viewing a shared plan</span>
      <span className="flex gap-1.5">
        <Button size="sm" variant="outline" className="h-7 pointer-coarse:h-9" onClick={onKeepMine}>
          {hasMine ? "Keep mine" : "Start empty"}
        </Button>
        <Button size="sm" className="h-7 pointer-coarse:h-9" onClick={onUseThis}>
          Use this one
        </Button>
      </span>
    </div>
  )
}
