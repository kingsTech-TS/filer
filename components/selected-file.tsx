"use client"

import type React from "react"
import { useEffect, useMemo } from "react"
import { X } from "lucide-react"
import FileBadge from "@/components/file-badge"
import { formatSize, getExtension, isImage } from "@/lib/files"

interface SelectedFileProps {
  file: File
  onRemove?: () => void
  disabled?: boolean
  /** Extra content on the right, before the remove button. */
  aside?: React.ReactNode
  size?: "sm" | "lg"
}

/** Card showing a chosen file, with an image thumbnail when possible. */
export default function SelectedFile({ file, onRemove, disabled, aside, size = "lg" }: SelectedFileProps) {
  const ext = getExtension(file.name)
  const previewUrl = useMemo(() => (isImage(ext) ? URL.createObjectURL(file) : null), [file, ext])
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    },
    [previewUrl],
  )

  const lg = size === "lg"

  return (
    <div
      className={`animate-fade-up flex items-center gap-3 rounded-2xl bg-white/[0.04] ring-1 ring-inset ring-white/10 ${
        lg ? "p-3" : "px-2.5 py-2"
      }`}
    >
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt=""
          className={`object-cover ring-1 ring-white/10 ${lg ? "w-14 h-14 rounded-xl" : "w-9 h-9 rounded-lg"}`}
        />
      ) : (
        <FileBadge ext={ext} size={lg ? "lg" : "sm"} />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-100">{file.name}</p>
        <p className="text-xs text-zinc-500 mt-0.5">
          {ext ? `${ext.toUpperCase()} · ` : ""}
          {formatSize(file.size)}
        </p>
      </div>
      {aside}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          title="Remove file"
          aria-label={`Remove ${file.name}`}
          className="p-2 rounded-lg text-zinc-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors disabled:opacity-40"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
