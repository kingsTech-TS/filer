"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowDown, Check } from "lucide-react"
import { API_URL, getErrorMessage } from "@/lib/api"

interface DownloadButtonProps {
  jobId: string
  fileName?: string
}

type State = "idle" | "downloading" | "saved"

/** Reads a response body while reporting progress (null when size is unknown). */
async function readWithProgress(response: Response, onProgress: (percent: number | null) => void) {
  const total = Number(response.headers.get("Content-Length")) || 0
  if (!response.body) return response.blob()

  const reader = response.body.getReader()
  const chunks: BlobPart[] = []
  let received = 0

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.length
    onProgress(total ? Math.min(100, Math.round((received / total) * 100)) : null)
  }

  return new Blob(chunks, { type: response.headers.get("Content-Type") ?? undefined })
}

export default function DownloadButton({ jobId, fileName }: DownloadButtonProps) {
  const [state, setState] = useState<State>("idle")
  const [progress, setProgress] = useState<number | null>(0)
  const [error, setError] = useState<string | null>(null)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current)
  }, [])

  const handleDownload = async () => {
    if (state === "downloading") return
    try {
      setError(null)
      setProgress(0)
      setState("downloading")

      const response = await fetch(`${API_URL}/download/${jobId}`)
      if (!response.ok) throw new Error(await getErrorMessage(response, "Download failed"))

      const blob = await readWithProgress(response, setProgress)

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName || `converted-file-${jobId}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setProgress(100)
      setState("saved")
      resetTimer.current = setTimeout(() => setState("idle"), 2500)
    } catch (err) {
      console.error("Download error:", err)
      setError(err instanceof Error ? err.message : "Download failed")
      setState("idle")
    }
  }

  const downloading = state === "downloading"
  const saved = state === "saved"

  return (
    <div className="space-y-2">
      <button
        onClick={handleDownload}
        disabled={downloading}
        aria-busy={downloading}
        className={`group relative w-full overflow-hidden inline-flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-white shadow-lg transition-all duration-300 active:scale-[0.99] disabled:cursor-progress ${
          downloading
            ? "bg-emerald-950 ring-1 ring-inset ring-emerald-500/40 shadow-emerald-500/10"
            : "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:brightness-110"
        }`}
      >
        {/* Fill */}
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
              : "Download file"}
        </span>
      </button>
      {error && <p className="text-sm text-rose-300 text-center animate-fade-up">{error}</p>}
    </div>
  )
}
