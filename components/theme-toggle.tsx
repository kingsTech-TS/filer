"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const

/** True once running in the browser (the theme isn't known during server rendering). */
const useHydrated = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

/**
 * Light / Dark switch. First-time visitors get their device's theme (next-themes
 * defaultTheme="system"); picking one here saves it for later visits.
 */
export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const hydrated = useHydrated()
  const current = hydrated ? resolvedTheme : null

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="inline-flex p-0.5 rounded-full bg-tint/5 ring-1 ring-inset ring-tint/10"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = current === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={`grid place-items-center w-7 h-7 rounded-full transition-colors ${
              active ? "bg-tint/10 text-fg" : "text-fg-subtle hover:text-fg"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        )
      })}
    </div>
  )
}
