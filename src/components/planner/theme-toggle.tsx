import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/hooks/use-theme"

/** Sun/moon icon button (shadcn's mode toggle); follows the system until first click, then the choice is saved. */
export function ThemeToggle() {
  const { toggle } = useTheme()
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md bg-transparent transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
    </button>
  )
}
