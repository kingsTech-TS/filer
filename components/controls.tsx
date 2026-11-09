"use client"

import type React from "react"
import { TriangleAlert, type LucideIcon } from "lucide-react"

export const inputClass =
  "w-full h-10 px-3 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 bg-white/[0.04] ring-1 ring-inset ring-white/10 focus:outline-none focus:ring-2 focus:ring-violet-400/60 transition-shadow disabled:opacity-50"

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string
  hint?: React.ReactNode
  children: React.ReactNode
  htmlFor?: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </label>
        {hint && <span className="text-xs text-zinc-500 tabular-nums">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string; icon?: LucideIcon }[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
}) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )

  return (
    <div
      className="relative grid p-1 rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/10"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <div
        aria-hidden
        className="absolute top-1 bottom-1 left-1 rounded-lg bg-white/10 ring-1 ring-inset ring-white/15 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map(({ value: v, label, icon: Icon }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          disabled={disabled}
          aria-pressed={v === value}
          className={`relative z-10 inline-flex items-center justify-center gap-1.5 h-8 text-xs font-medium rounded-lg transition-colors ${
            v === value ? "text-white" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {label}
        </button>
      ))}
    </div>
  )
}

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled,
  id,
}: {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  disabled?: boolean
  id?: string
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-violet-400 disabled:opacity-50"
      style={{
        background: `linear-gradient(to right, #a78bfa ${pct}%, rgb(255 255 255 / 0.1) ${pct}%)`,
      }}
    />
  )
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group inline-flex items-center gap-2.5 text-sm text-zinc-300 hover:text-white transition-colors disabled:opacity-50"
    >
      <span
        className={`relative w-9 h-5 rounded-full transition-colors duration-300 ${
          checked ? "bg-violet-500" : "bg-white/10 ring-1 ring-inset ring-white/10"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </span>
      {label}
    </button>
  )
}

const HEX = /^#([0-9a-f]{6})$/i

export function ColorField({
  value,
  onChange,
  allowTransparent = false,
  disabled,
  id,
}: {
  value: string
  onChange: (value: string) => void
  allowTransparent?: boolean
  disabled?: boolean
  id?: string
}) {
  const transparent = value === "transparent"

  return (
    <div className="flex items-center gap-2">
      <label
        className={`relative shrink-0 w-10 h-10 rounded-lg overflow-hidden ring-1 ring-inset ring-white/15 cursor-pointer ${
          transparent ? "bg-checker" : ""
        }`}
        style={transparent ? undefined : { backgroundColor: value }}
      >
        <input
          type="color"
          value={HEX.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="absolute inset-0 opacity-0 cursor-pointer"
          aria-label="Pick a color"
        />
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        spellCheck={false}
        className={`${inputClass} font-mono`}
      />
      {allowTransparent && (
        <button
          type="button"
          onClick={() => onChange(transparent ? "#7c3aed" : "transparent")}
          disabled={disabled}
          aria-pressed={transparent}
          title="Transparent background"
          className={`shrink-0 h-10 px-3 rounded-lg text-xs font-medium ring-1 ring-inset transition-colors ${
            transparent
              ? "bg-violet-500/20 ring-violet-400/50 text-violet-100"
              : "bg-white/[0.04] ring-white/10 text-zinc-400 hover:text-zinc-100"
          }`}
        >
          None
        </button>
      )}
    </div>
  )
}

export function InlineError({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fade-up flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm text-rose-200 bg-rose-500/10 ring-1 ring-inset ring-rose-400/20">
      <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function PrimaryButton({
  children,
  icon: Icon,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: LucideIcon }) {
  return (
    <button
      {...props}
      className="group animate-fade-up relative w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-[length:200%_100%] bg-left hover:bg-right shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-left transition-all duration-500"
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  )
}

export function SecondaryButton({
  children,
  icon: Icon,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: LucideIcon }) {
  return (
    <button
      {...props}
      className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium text-zinc-300 bg-white/[0.04] ring-1 ring-inset ring-white/10 hover:bg-white/[0.08] hover:text-white transition-colors disabled:opacity-50"
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  )
}
