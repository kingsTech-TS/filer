"use client"

import { ArrowDown, Check } from "lucide-react"
import { useDownload } from "@/hooks/use-download"

interface DownloadButtonProps {
  /** API path, e.g. /download/{jobId} */
  path: string
  fileName: string
  label?: string
}

export default function DownloadButton({ path, fileName, label = "Download file" }: DownloadButtonProps) {
  const { state, progress, error, download } = useDownload(path, fileName)
  const downloading = state === "downloading"
  const saved = state === "saved"

  return (
    <div className="space-y-2">
      <button
        onClick={download}
        disabled={downloading}
        aria-busy={downloading}
        className={`group relative w-full overflow-hidden inline-flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-white shadow-lg transition-all duration-300 active:scale-[0.99] disabled:cursor-progress ${
          downloading
            ? "bg-emerald-950 ring-1 ring-inset ring-emerald-500/40 shadow-emerald-500/10"
            : "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:brightness-110"
        }`}
      >
        {downloading && (
          <span
            aria-hidden
            className={`absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-500 transition-[width] duration-200 ease-out ${
              progress === null ? "w-full opacity-40" : ""
            }`}
            style={progress === null ? undefined : { width: `${progress}%` }}
          >
            <span className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </span>
        )}

        <span className="relative inline-flex items-center gap-2">
          {saved ? (
            <span className="grid place-items-center w-5 h-5 rounded-full bg-white/25 animate-pop-in">
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
            </span>
          ) : (
            <span className="relative grid place-items-center w-5 h-5 overflow-hidden">
              <ArrowDown
                className={`w-4 h-4 ${downloading ? "animate-nudge-down" : "transition-transform group-hover:translate-y-0.5"}`}
                strokeWidth={2.5}
              />
              <span className="absolute bottom-0 left-0.5 right-0.5 h-0.5 rounded-full bg-white/80" />
            </span>
          )}
          {saved
            ? "Saved to your device"
            : downloading
              ? progress === null
                ? "Downloading…"
                : `Downloading ${progress}%`
              : label}
        </span>
      </button>
      {error && <p className="text-sm text-rose-300 text-center animate-fade-up">{error}</p>}
    </div>
  )
}

const R = 13
const C = 2 * Math.PI * R

/** Small round download button with a progress ring, for file lists. */
export function DownloadIconButton({ path, fileName }: { path: string; fileName: string }) {
  const { state, progress, error, download } = useDownload(path, fileName)
  const downloading = state === "downloading"

  return (
    <button
      onClick={download}
      disabled={downloading}
      title={error ?? `Download ${fileName}`}
      aria-label={`Download ${fileName}`}
      className={`relative grid place-items-center w-8 h-8 shrink-0 rounded-full transition-colors ${
        state === "saved"
          ? "bg-emerald-500/20 text-emerald-300"
          : error
            ? "bg-rose-500/15 text-rose-300"
            : "text-zinc-400 hover:text-white hover:bg-white/10"
      }`}
    >
      {downloading && (
        <svg viewBox="0 0 32 32" className={`absolute inset-0 -rotate-90 ${progress === null ? "animate-spin" : ""}`}>
          <circle cx="16" cy="16" r={R} fill="none" stroke="white" strokeOpacity={0.1} strokeWidth={2.5} />
          <circle
            cx="16"
            cy="16"
            r={R}
            fill="none"
            stroke="#34d399"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - (progress ?? 30) / 100)}
            className="transition-[stroke-dashoffset] duration-200"
          />
        </svg>
      )}
      {state === "saved" ? (
        <Check className="w-4 h-4 animate-pop-in" strokeWidth={3} />
      ) : (
        <ArrowDown className={`w-4 h-4 ${downloading ? "animate-nudge-down" : ""}`} />
      )}
    </button>
  )
}
