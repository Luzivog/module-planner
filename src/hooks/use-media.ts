import { useSyncExternalStore } from "react"

/** Live result of a CSS media query. */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query)
      mq.addEventListener("change", onChange)
      return () => mq.removeEventListener("change", onChange)
    },
    () => window.matchMedia(query).matches,
  )
}

/** phone < 768 ≤ tablet < 1280 ≤ desktop. */
export type Layout = "phone" | "tablet" | "desktop"

export function useLayout(): Layout {
  const desktop = useMedia("(min-width: 1280px)")
  const tablet = useMedia("(min-width: 768px)")
  return desktop ? "desktop" : tablet ? "tablet" : "phone"
}

/** True on devices without hover (phones, tablets): tooltips must open on tap. */
export const useTouch = () => useMedia("(hover: none)")
