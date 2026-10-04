import { useMemo, useState } from "react"
import type { Dataset, Module } from "@/data/schema"
import { DesktopLayout, PhoneLayout, TabletLayout } from "@/components/planner/layouts"
import { ModuleSheet } from "@/components/planner/module-sheet"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useDataset } from "@/hooks/use-dataset"
import { useLayout } from "@/hooks/use-media"
import { PlannerContext, type Planner } from "@/hooks/use-planner"
import { useSelection } from "@/hooks/use-selection"
import { assignColors } from "@/lib/colors"
import { buildLecturerIndex } from "@/lib/lecturers"

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
  const { codes, toggle } = useSelection()
  const [term, setTerm] = useState<Module["term"]>(1)
  const [sheet, setSheet] = useState<{ code: string | null; open: boolean }>({ code: null, open: false })

  const lookups = useMemo(
    () => ({
      byCode: new Map(data.modules.map((m) => [m.code, m])),
      lecturerIndex: buildLecturerIndex(data.modules),
    }),
    [data],
  )

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
        <Layout term={term} onTermChange={setTerm} />
        <ModuleSheet module={sheetModule} open={sheet.open} onOpenChange={(open) => setSheet((s) => ({ ...s, open }))} />
      </TooltipProvider>
    </PlannerContext>
  )
}
