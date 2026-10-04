import { useEffect, useState } from "react"
import { Dataset } from "@/data/schema"

export type DatasetState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: Dataset }

/** Fetches ./data.json once and validates it against the Dataset schema. */
export function useDataset(): DatasetState {
  const [state, setState] = useState<DatasetState>({ status: "loading" })

  useEffect(() => {
    let cancelled = false
    fetch("./data.json")
      .then((res) => {
        if (!res.ok) throw new Error(`data.json: HTTP ${res.status}`)
        return res.json()
      })
      .then((json: unknown) => {
        const parsed = Dataset.safeParse(json)
        if (cancelled) return
        setState(
          parsed.success
            ? { status: "ready", data: parsed.data }
            : { status: "error", message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n") },
        )
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: "error", message: err instanceof Error ? err.message : String(err) })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
