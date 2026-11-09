"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowRight, RotateCcw, Search, WandSparkles, Repeat } from "lucide-react"
import Dropzone from "@/components/dropzone"
import SelectedFile from "@/components/selected-file"
import TaskView, { SuccessMark } from "@/components/task-view"
import DownloadButton from "@/components/download-button"
import ResultPreview from "@/components/result-preview"
import FileBadge from "@/components/file-badge"
import { InlineError, PrimaryButton, SecondaryButton, inputClass } from "@/components/controls"
import { useTask } from "@/hooks/use-task"
import { getJson, pollJob, postForm } from "@/lib/api"
import { formatSize, getExtension, getKindName, getStem, validateFile, type FileKind } from "@/lib/files"

// Fallbacks for when /formats can't be reached. Must match ALLOWED_EXTENSIONS in filer-api/main.py
const CONVERT_INPUTS = [
  "pdf", "docx", "doc", "wps", "txt", "html", "md",
  "ppt", "pptx",
  "csv", "xls", "xlsm", "xlsx",
  "png", "jpg", "jpeg", "svg",
  "mp4", "mp3", "wav", "wma",
]
const BG_INPUTS = ["png", "jpg", "jpeg", "webp"]

const FALLBACK_OUTPUTS: Partial<Record<FileKind, string[]>> = {
  doc: ["pdf", "docx", "txt", "html", "jpg", "png"],
  code: ["pdf", "docx", "txt", "html"],
  slides: ["pdf", "pptx", "jpg", "png"],
  sheet: ["xlsx", "csv", "pdf", "html"],
  image: ["png", "jpg", "webp", "pdf", "svg"],
  audio: ["mp3", "wav", "aac", "flac", "ogg"],
  video: ["mp3", "mp4", "webm", "gif", "wav"],
}

// Mirrors DEFAULT_OUTPUT_FORMATS in filer-api
const FALLBACK_DEFAULT: Record<string, string> = {
  pdf: "docx", docx: "pdf", doc: "pdf", wps: "docx", txt: "pdf", html: "pdf", md: "pdf",
  ppt: "pptx", pptx: "pdf", csv: "xlsx", xls: "xlsx", xlsm: "xlsx", xlsx: "csv",
  jpg: "png", jpeg: "png", png: "jpg", svg: "png", mp4: "mp3", mp3: "wav", wav: "mp3", wma: "mp3",
}

// Shown first in the format grid, in this order
const POPULAR = ["pdf", "docx", "jpg", "png", "webp", "xlsx", "csv", "pptx", "txt", "html", "mp3", "mp4", "wav", "gif", "svg"]

function sortFormats(list: string[]) {
  const rank = (f: string) => {
    const i = POPULAR.indexOf(f)
    return i === -1 ? POPULAR.length : i
  }
  return [...list].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
}

interface FormatsState {
  loading: boolean
  list: string[]
}

interface Result {
  jobId: string
  downloadName: string
}

export default function ConvertTool({ mode }: { mode: "convert" | "remove-bg" }) {
  const task = useTask<Result>()
  const [file, setFile] = useState<File | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [inputFormats, setInputFormats] = useState(mode === "convert" ? CONVERT_INPUTS : BG_INPUTS)
  const [formats, setFormats] = useState<FormatsState>({ loading: false, list: [] })
  const [format, setFormat] = useState("")
  const [filter, setFilter] = useState("")
  const formatsRequest = useRef<AbortController | null>(null)

  // Keep accepted input types in sync with the backend
  useEffect(() => {
    if (mode !== "convert") return
    const controller = new AbortController()
    getJson<{ input_formats: string[] }>("/formats", controller.signal)
      .then((d) => {
        if (d.input_formats?.length) setInputFormats(d.input_formats)
      })
      .catch(() => {})
    return () => {
      controller.abort()
      formatsRequest.current?.abort()
    }
  }, [mode])

  const ext = file ? getExtension(file.name) : ""

  const loadFormats = (inputExt: string) => {
    formatsRequest.current?.abort()
    const controller = new AbortController()
    formatsRequest.current = controller

    const fallback = (FALLBACK_OUTPUTS[getKindName(inputExt)] ?? ["pdf"]).filter((f) => f !== inputExt)
    setFormats({ loading: true, list: [] })
    setFormat(FALLBACK_DEFAULT[inputExt] ?? fallback[0])
    setFilter("")

    getJson<{ output_formats: string[]; default_output_format: string }>(
      `/formats?input_format=${encodeURIComponent(inputExt)}`,
      controller.signal,
    )
      .then((d) => {
        const list = sortFormats(d.output_formats.filter((f) => f !== inputExt))
        setFormats({ loading: false, list: list.length ? list : fallback })
        setFormat(list.includes(d.default_output_format) ? d.default_output_format : (list[0] ?? fallback[0]))
      })
      .catch((e) => {
        if (controller.signal.aborted) return
        console.warn("Could not load formats, using fallback:", e)
        setFormats({ loading: false, list: sortFormats(fallback) })
      })
  }

  const selectFile = (f: File) => {
    const err = validateFile(f, inputFormats)
    setValidationError(err)
    if (err) return
    setFile(f)
    if (mode === "convert") loadFormats(getExtension(f.name))
  }

  const visibleFormats = useMemo(
    () => formats.list.filter((f) => f.includes(filter.trim().toLowerCase())),
    [formats.list, filter],
  )

  const submit = () => {
    if (!file) return
    const stem = getStem(file.name)
    task.run(async (ctx) => {
      const body = new FormData()
      body.append("file", file)

      if (mode === "remove-bg") {
        const data = await postForm<{ job_id: string }>("/remove-background", body, ctx, "Background removal failed")
        return { jobId: data.job_id, downloadName: `${stem}_no_bg.png` }
      }

      body.append("output_format", format)
      const data = await postForm<{ job_id: string }>("/convert", body, ctx, "Conversion request failed")
      await pollJob(data.job_id, { signal: ctx.signal, onProgress: ctx.setProcessingProgress })
      return { jobId: data.job_id, downloadName: `${stem}.${format}` }
    })
  }

  const startOver = () => {
    task.reset()
    setFile(null)
  }

  // ---------- Status / result ----------
  if (task.status !== "idle") {
    const outputExt = mode === "remove-bg" ? "png" : format
    return (
      <TaskView
        tool={mode}
        status={task.status}
        progress={task.progress}
        error={task.error}
        onRetry={task.reset}
        inputExt={ext}
        outputExt={outputExt}
        title={{ finished: "Your file is ready", uploading: "Uploading your file" }}
        summary={
          file && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] ring-1 ring-inset ring-white/10">
              <FileBadge ext={ext} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{formatSize(file.size)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ArrowRight className="w-4 h-4 text-zinc-500" />
                <span className="px-2 py-1 rounded-md text-[11px] font-mono font-semibold uppercase text-violet-200 bg-violet-500/15 ring-1 ring-inset ring-violet-400/30">
                  {mode === "remove-bg" ? "PNG ✦" : outputExt}
                </span>
              </div>
            </div>
          )
        }
      >
        {task.result && (
          <div className="space-y-4">
            {mode === "remove-bg" ? (
              <ResultPreview jobId={task.result.jobId} />
            ) : (
              <SuccessMark label={<span className="block truncate font-mono">{task.result.downloadName}</span>} />
            )}
            <DownloadButton path={`/download/${task.result.jobId}`} fileName={task.result.downloadName} />
            <SecondaryButton onClick={startOver} icon={RotateCcw}>
              Start over
            </SecondaryButton>
          </div>
        )}
      </TaskView>
    )
  }

  // ---------- Form ----------
  return (
    <div className="space-y-5">
      {file ? (
        <SelectedFile file={file} onRemove={() => setFile(null)} />
      ) : (
        <Dropzone
          accept={inputFormats}
          onFiles={(files) => selectFile(files[0])}
          title={mode === "remove-bg" ? "Drop a photo here, or " : undefined}
        />
      )}

      {validationError && <InlineError>{validationError}</InlineError>}

      {file && mode === "convert" && (
        <div className="animate-fade-up space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Convert to</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
              {ext.toUpperCase()} <ArrowRight className="w-3 h-3" />
              <span className="text-violet-300">{format.toUpperCase()}</span>
            </span>
          </div>

          {formats.list.length > 15 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={`Search ${formats.list.length} formats`}
                className={`${inputClass} pl-9`}
              />
            </div>
          )}

          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-[184px] overflow-y-auto pr-1 -mr-1 [scrollbar-width:thin]">
            {formats.loading
              ? Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className="h-10 rounded-lg bg-white/[0.05] animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
                ))
              : visibleFormats.map((f) => {
                  const active = f === format
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFormat(f)}
                      aria-pressed={active}
                      className={`h-10 rounded-lg text-xs font-semibold font-mono uppercase transition-all ${
                        active
                          ? "text-white bg-violet-500/20 ring-1 ring-inset ring-violet-400/60 shadow-[0_0_20px] shadow-violet-500/20"
                          : "text-zinc-400 bg-white/[0.03] ring-1 ring-inset ring-white/10 hover:text-zinc-100 hover:bg-white/[0.06]"
                      }`}
                    >
                      {f}
                    </button>
                  )
                })}
            {!formats.loading && visibleFormats.length === 0 && (
              <p className="col-span-full py-3 text-center text-sm text-zinc-500">No formats match “{filter}”.</p>
            )}
          </div>
        </div>
      )}

      {file && mode === "remove-bg" && (
        <p className="animate-fade-up text-xs text-zinc-500">You&apos;ll get a transparent PNG with the background removed.</p>
      )}

      {file && (
        <PrimaryButton
          onClick={submit}
          disabled={mode === "convert" && (formats.loading || !format)}
          icon={mode === "convert" ? Repeat : WandSparkles}
        >
          {mode === "convert" ? `Convert to ${format.toUpperCase()}` : "Remove background"}
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </PrimaryButton>
      )}
    </div>
  )
}
