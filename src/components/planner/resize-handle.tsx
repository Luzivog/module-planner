import { useState, type KeyboardEvent, type PointerEvent } from "react"
import { cn } from "@/lib/utils"

type Column = { width: number; min: number; max: number; setWidth: (w: number) => void; reset: () => void }

const STEP = 16

/**
 * Divider between two columns, resizable by dragging or with the arrow keys
 * (Shift = bigger steps, Home/End = min/max, Enter or double-click = reset).
 * `side` says which column it resizes: "left" grows the column to its left as
 * you move right, "right" the one to its right.
 */
export function ResizeHandle({ side, label, column }: { side: "left" | "right"; label: string; column: Column }) {
  const [dragging, setDragging] = useState(false)
  const grow = side === "left" ? 1 : -1

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = column.width
    setDragging(true)
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    const move = (ev: globalThis.PointerEvent) => column.setWidth(startWidth + grow * (ev.clientX - startX))
    const up = () => {
      setDragging(false)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? STEP * 4 : STEP
    const actions: Record<string, () => void> = {
      ArrowLeft: () => column.setWidth(column.width - grow * step),
      ArrowRight: () => column.setWidth(column.width + grow * step),
      Home: () => column.setWidth(column.min),
      End: () => column.setWidth(column.max),
      Enter: column.reset,
    }
    const action = actions[e.key]
    if (!action) return
    e.preventDefault()
    action()
  }

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={column.width}
      aria-valuemin={column.min}
      aria-valuemax={column.max}
      title="Drag or use the arrow keys to resize · double-click to reset"
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={column.reset}
      className="group relative z-10 w-px shrink-0 cursor-col-resize bg-border"
    >
      {/* Wider invisible hit area, with a visible accent while hovering or dragging. */}
      <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 -left-px -right-px transition-colors",
          dragging ? "bg-primary/60" : "group-hover:bg-primary/30",
        )}
      />
    </div>
  )
}
