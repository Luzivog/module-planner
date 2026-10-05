import { Component, type ErrorInfo, type ReactNode } from "react"
import { clearAppStorage } from "@/lib/storage"

/** Last line of defence: a friendly message with reload (and reset-settings) instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid h-dvh place-items-center p-6">
        <div className="max-w-sm space-y-3 text-center text-sm">
          <h1 className="text-base font-semibold">Something went wrong</h1>
          <p className="text-muted-foreground">Reloading usually fixes it. If it keeps happening, reset this site's saved settings (your plan link still works).</p>
          <div className="flex justify-center gap-2">
            <button type="button" className="rounded-md bg-foreground px-3 py-2 text-background" onClick={() => window.location.reload()}>
              Reload
            </button>
            <button
              type="button"
              className="rounded-md border px-3 py-2"
              onClick={() => {
                clearAppStorage()
                window.location.reload()
              }}
            >
              Reset and reload
            </button>
          </div>
        </div>
      </div>
    )
  }
}
