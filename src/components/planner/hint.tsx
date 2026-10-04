import { isValidElement, type ReactElement, type ReactNode } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useTouch } from "@/hooks/use-media"

/**
 * Wraps a single element with a small tooltip. On touch devices (no hover) the
 * label opens on tap instead, as a popover; the tap doesn't reach parent rows.
 * Use `touch="none"` when the element's own tap already does something (e.g.
 * opens the sheet, sorts, toggles); its info must then be available elsewhere.
 */
export function Hint({ label, children, touch = "tap" }: { label: ReactNode; children: ReactElement; touch?: "tap" | "none" }) {
  const isTouch = useTouch()
  if (isTouch) {
    if (touch === "none") return children
    const nativeButton = isValidElement(children) && children.type === "button"
    return (
      <Popover>
        <PopoverTrigger render={children} nativeButton={nativeButton} onClick={(e) => e.stopPropagation()} />
        <PopoverContent className="w-auto max-w-[min(20rem,90vw)] items-start gap-0.5 p-2 text-xs">{label}</PopoverContent>
      </Popover>
    )
  }
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent className="flex-col items-start gap-0.5">{label}</TooltipContent>
    </Tooltip>
  )
}
