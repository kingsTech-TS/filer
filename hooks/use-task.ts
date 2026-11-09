"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toUserMessage } from "@/lib/api"

export type TaskStatus = "idle" | "uploading" | "processing" | "finished" | "failed"

export interface TaskContext {
  signal: AbortSignal
  /** Upload progress, 0–100. */
  onProgress: (percent: number) => void
  /** Call when the upload is done and the server is working. */
  onUploaded: () => void
  /** Progress reported by the server while processing. */
  setProcessingProgress: (percent: number) => void
}

/**
 * Runs one upload → process → result task and tracks its status.
 * Starting a new run, resetting, or unmounting cancels the previous run.
 */
export function useTask<T>() {
  const [status, setStatus] = useState<TaskStatus>("idle")
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<T | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => () => controllerRef.current?.abort(), [])

  const run = useCallback(async (fn: (ctx: TaskContext) => Promise<T>) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const live = () => !controller.signal.aborted

    setError(null)
    setResult(null)
    setProgress(0)
    setStatus("uploading")

    const ctx: TaskContext = {
      signal: controller.signal,
      onProgress: (p) => {
        if (live()) setProgress(p)
      },
      onUploaded: () => {
        if (!live()) return
        setStatus("processing")
        setProgress(0)
      },
      setProcessingProgress: (p) => {
        if (live()) setProgress(p)
      },
    }

    try {
      const value = await fn(ctx)
      if (!live()) return
      setResult(value)
      setProgress(100)
      setStatus("finished")
    } catch (e) {
      if (!live()) return
      setError(toUserMessage(e))
      setStatus("failed")
    }
  }, [])

  const reset = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setStatus("idle")
    setProgress(0)
    setError(null)
    setResult(null)
  }, [])

  return { status, progress, error, result, run, reset }
}
