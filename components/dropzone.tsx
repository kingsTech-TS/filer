"use client"

import type React from "react"
import { useRef, useState } from "react"
import { CloudUpload, Plus, type LucideIcon } from "lucide-react"
import { MAX_FILE_SIZE_MB } from "@/lib/api"

interface DropzoneProps {
  /** Allowed extensions; null accepts anything. */
  accept: string[] | null
  multiple?: boolean
  disabled?: boolean
  onFiles: (files: File[]) => void
  title?: string
  /** Shown under the title instead of the extension chips. */
  hint?: React.ReactNode
  icon?: LucideIcon
  /** Slim "add more" bar instead of the large drop area. */
  compact?: boolean
}

export default function Dropzone({
  accept,
  multiple = false,
  disabled = false,
  onFiles,
  title,
  hint,
  icon: Icon = CloudUpload,
  compact = false,
}: DropzoneProps) {
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (disabled) return
    setDragActive(e.type === "dragenter" || e.type === "dragover")
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (disabled) return
    const files = Array.from(e.dataTransfer.files)
    if (files.length) onFiles(multiple ? files : files.slice(0, 1))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length) onFiles(files)
    e.target.value = ""
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      multiple={multiple}
      accept={accept ? accept.map((e) => `.${e}`).join(",") : undefined}
      onChange={handleChange}
      className="hidden"
    />
  )

  const dragProps = {
    onDragEnter: handleDrag,
    onDragLeave: handleDrag,
    onDragOver: handleDrag,
    onDrop: handleDrop,
  }

  if (compact) {
    return (
      <>
        {input}
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          {...dragProps}
          className={`w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl border border-dashed text-sm transition-colors disabled:opacity-50 ${
            dragActive
              ? "border-violet-400/70 bg-violet-500/10 text-violet-200"
              : "border-white/15 text-zinc-400 hover:border-violet-400/40 hover:text-zinc-200 hover:bg-white/[0.03]"
          }`}
        >
          <Plus className="w-4 h-4" />
          {dragActive ? "Drop to add" : (title ?? "Add more files")}
        </button>
      </>
    )
  }

  return (
    <>
      {input}
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        {...dragProps}
        className={`group relative w-full overflow-hidden rounded-2xl border border-dashed px-6 py-10 text-center transition-all duration-300 disabled:opacity-50 ${
          dragActive
            ? "border-violet-400/70 bg-violet-500/10 scale-[1.01]"
            : "border-white/15 bg-white/[0.02] hover:border-violet-400/40 hover:bg-white/[0.04]"
        }`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(400px_circle_at_50%_0%,oklch(0.65_0.2_285/0.15),transparent_70%)]"
        />
        <div
          className={`relative mx-auto mb-4 grid place-items-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 ring-1 ring-inset ring-white/10 transition-transform duration-300 ${
            dragActive ? "-translate-y-1 scale-110" : "group-hover:-translate-y-0.5"
          }`}
        >
          <Icon className="w-6 h-6 text-violet-300" />
        </div>
        <p className="relative text-sm font-medium text-zinc-100">
          {dragActive ? (
            "Drop it like it's hot"
          ) : (
            <>
              {title ?? (multiple ? "Drop your files here, or " : "Drop your file here, or ")}
              <span className="text-violet-300 underline-offset-4 group-hover:underline">browse</span>
            </>
          )}
        </p>
        <div className="relative mt-4">
          {hint ??
            (accept && (
              <div className="flex flex-wrap justify-center gap-1.5">
                {accept.map((e) => (
                  <span
                    key={e}
                    className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wide text-zinc-400 bg-white/5 ring-1 ring-inset ring-white/5"
                  >
                    {e}
                  </span>
                ))}
              </div>
            ))}
        </div>
        <p className="relative mt-3 text-xs text-zinc-500">
          Up to {MAX_FILE_SIZE_MB} MB{multiple ? " per file" : ""}
        </p>
      </button>
    </>
  )
}
