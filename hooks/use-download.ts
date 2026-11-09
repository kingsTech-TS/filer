"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { API_URL, getErrorMessage, toUserMessage } from "@/lib/api"

export type DownloadState = "idle" | "downloading" | "saved"

/** Reads a response body while reporting progress (null when the size is unknown). */
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

/** Downloads `path` from the API with progress, then saves it as `fileName`. */
export function useDownload(path: string, fileName: string) {
  const [state, setState] = useState<DownloadState>("idle")
  const [progress, setProgress] = useState<number | null>(0)
  const [error, setError] = useState<string | null>(null)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current)
    },
    [],
  )

  const download = useCallback(async () => {
    if (state === "downloading") return
    try {
      setError(null)
      setProgress(0)
      setState("downloading")

      const response = await fetch(`${API_URL}${path}`)
      if (!response.ok) throw new Error(await getErrorMessage(response, "Download failed"))

      const blob = await readWithProgress(response, setProgress)

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setProgress(100)
      setState("saved")
      resetTimer.current = setTimeout(() => setState("idle"), 2500)
    } catch (err) {
      console.error("Download error:", err)
      setError(toUserMessage(err))
      setState("idle")
    }
  }, [path, fileName, state])

  return { state, progress, error, download }
}
