import { useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Draggable divider between two columns. `side` says which column it resizes:
 * "left" grows the column to its left as you drag right, "right" the one to its right.
 * Double-click resets the width.
 */
export function ResizeHandle({ side, width, onResize, onReset }: {
  side: "left" | "right"
  width: number
  onResize: (width: number) => void
  onReset: () => void
}) {
  const [dragging, setDragging] = useState(false)

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = width
    setDragging(true)
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      onResize(side === "left" ? startWidth + dx : startWidth - dx)
    }
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

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      title="Drag to resize · double-click to reset"
      onPointerDown={onPointerDown}
      onDoubleClick={onReset}
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
