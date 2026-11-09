"use client"

import type React from "react"
import { RotateCcw } from "lucide-react"
import StageLoader from "@/components/stage-loader"
import StatusBadge from "@/components/status-badge"
import { InlineError, PrimaryButton } from "@/components/controls"
import type { TaskStatus } from "@/hooks/use-task"
import type { ToolId } from "@/lib/tools"

interface TaskViewProps {
  tool: ToolId
  status: Exclude<TaskStatus, "idle">
  progress: number
  error: string | null
  onRetry: () => void
  /** Card summarising what was submitted (file name etc.). */
  summary?: React.ReactNode
  /** Result content shown when finished. */
  children?: React.ReactNode
  inputExt?: string
  outputExt?: string
  title?: Partial<Record<Exclude<TaskStatus, "idle">, string>>
}

const DEFAULT_COPY: Record<Exclude<TaskStatus, "idle">, { title: string; subtitle: string }> = {
  uploading: { title: "Uploading", subtitle: "Sending it securely to the server…" },
  processing: { title: "Working on it", subtitle: "This usually takes a few seconds." },
  finished: { title: "All done", subtitle: "Your download is ready." },
  failed: { title: "Something went wrong", subtitle: "We couldn't finish that one." },
}

/** Shared status screen for every tool: loader while busy, error + retry, or the result. */
export default function TaskView({
  tool,
  status,
  progress,
  error,
  onRetry,
  summary,
  children,
  inputExt,
  outputExt,
  title,
}: TaskViewProps) {
  const busy = status === "uploading" || status === "processing"
  const copy = DEFAULT_COPY[status]

  return (
    // Re-animate when moving from busy → finished/failed, but not between upload and processing
    <div key={busy ? "busy" : status} className="space-y-6 animate-fade-up">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title?.[status] ?? copy.title}</h2>
          <p className="text-sm text-zinc-400 mt-0.5">{copy.subtitle}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      {summary}

      {busy && (
        <StageLoader status={status} progress={progress} mode={tool} inputExt={inputExt} outputExt={outputExt} />
      )}

      {status === "failed" && (
        <div className="space-y-4">
          <InlineError>{error || "Something went wrong. Please try again."}</InlineError>
          <PrimaryButton onClick={onRetry} icon={RotateCcw}>
            Try again
          </PrimaryButton>
        </div>
      )}

      {status === "finished" && children}
    </div>
  )
}

/** Big animated check used on simple success screens. */
export function SuccessMark({ label }: { label?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center py-2">
      <div className="grid place-items-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 animate-pop-in animate-ring-pulse">
        <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
      {label && <div className="mt-4 max-w-full text-center text-sm text-zinc-300">{label}</div>}
    </div>
  )
}
