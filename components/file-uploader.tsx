"use client"

import type React from "react"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowRight, CloudUpload, LoaderCircle, RefreshCw, Repeat, TriangleAlert, WandSparkles, X } from "lucide-react"
import FileBadge from "@/components/file-badge"
import { API_URL, MAX_FILE_SIZE_MB, errorFromData, uploadWithProgress } from "@/lib/api"
import { formatSize, getExtension, getStem, isImage } from "@/lib/files"

export type Mode = "convert" | "remove-bg"

interface FileUploaderProps {
  onUploadStart: (file: { name: string; size: number }, mode: Mode, outputExt: string) => void
  onConversionStart: (jobId: string, downloadName: string) => void
  onStatusUpdate: (
    status: "uploading" | "processing" | "finished" | "failed",
    progress: number,
    message?: string,
  ) => void
}

// Must match ALLOWED_EXTENSIONS / BG_REMOVAL_EXTENSIONS in filer-api/main.py
const CONVERT_INPUT_EXTENSIONS = ["pdf", "docx", "doc", "png", "jpg", "jpeg", "mp4", "mp3"]
const BG_INPUT_EXTENSIONS = ["png", "jpg", "jpeg", "webp"]
const OUTPUT_FORMATS = ["pdf", "docx", "png", "jpg", "mp3", "mp4"]

// Mirrors the backend's default mapping
const DEFAULT_OUTPUT: Record<string, string> = {
  pdf: "docx",
  docx: "pdf",
  doc: "pdf",
  mp4: "mp3",
  jpg: "png",
  jpeg: "png",
  png: "jpg",
}

const MODES: { value: Mode; label: string; icon: typeof Repeat }[] = [
  { value: "convert", label: "Convert", icon: Repeat },
  { value: "remove-bg", label: "Remove background", icon: WandSparkles },
]

const POLL_INTERVAL_MS = 2000

export default function FileUploader({ onUploadStart, onConversionStart, onStatusUpdate }: FileUploaderProps) {
  const [mode, setMode] = useState<Mode>("convert")
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<string>("pdf")
  const [isConverting, setIsConverting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const allowedExtensions = mode === "convert" ? CONVERT_INPUT_EXTENSIONS : BG_INPUT_EXTENSIONS
  const inputExt = selectedFile ? getExtension(selectedFile.name) : ""
  const availableFormats = OUTPUT_FORMATS.filter((f) => f !== inputExt && !(f === "jpg" && inputExt === "jpeg"))

  const previewUrl = useMemo(
    () => (selectedFile && isImage(inputExt) ? URL.createObjectURL(selectedFile) : null),
    [selectedFile, inputExt],
  )
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const selectFile = (file: File, currentMode: Mode = mode) => {
    const ext = getExtension(file.name)
    const allowed = currentMode === "convert" ? CONVERT_INPUT_EXTENSIONS : BG_INPUT_EXTENSIONS

    if (!allowed.includes(ext)) {
      setSelectedFile(null)
      setValidationError(
        currentMode === "remove-bg"
          ? `Background removal works with ${allowed.map((e) => e.toUpperCase()).join(", ")} images.`
          : `Unsupported file type. Try ${allowed.map((e) => e.toUpperCase()).join(", ")}.`,
      )
      return
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setSelectedFile(null)
      setValidationError(`That file is ${formatSize(file.size)} — the limit is ${MAX_FILE_SIZE_MB} MB.`)
      return
    }

    setValidationError(null)
    setSelectedFile(file)
    setSelectedFormat(DEFAULT_OUTPUT[ext] ?? "pdf")
  }

  const switchMode = (next: Mode) => {
    if (next === mode || isConverting) return
    setMode(next)
    setValidationError(null)
    if (selectedFile) selectFile(selectedFile, next)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(e.type === "dragenter" || e.type === "dragover")
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) selectFile(e.dataTransfer.files[0])
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) selectFile(e.target.files[0])
    e.target.value = ""
  }

  const pollProgress = (jobId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/progress/${jobId}`)

        if (res.status === 404) {
          clearInterval(pollRef.current!)
          onStatusUpdate("failed", 0, "Job not found. The server may have restarted — please try again.")
          return
        }
        if (!res.ok) return // transient error, keep polling

        const data = await res.json()

        if (data.status === "finished") {
          clearInterval(pollRef.current!)
          onStatusUpdate("finished", 100)
        } else if (data.status === "failed") {
          clearInterval(pollRef.current!)
          onStatusUpdate("failed", 0, data.message)
        } else {
          onStatusUpdate("processing", data.progress || 50)
        }
      } catch (error) {
        console.error("Error polling progress:", error)
      }
    }, POLL_INTERVAL_MS)
  }

  const handleSubmit = async () => {
    if (!selectedFile) return

    try {
      setIsConverting(true)
      const outputExt = mode === "remove-bg" ? "png" : selectedFormat
      onUploadStart({ name: selectedFile.name, size: selectedFile.size }, mode, outputExt)

      const formData = new FormData()
      formData.append("file", selectedFile)

      const stem = getStem(selectedFile.name)
      const reportUpload = (percent: number) => onStatusUpdate("uploading", percent)
      // Once the bytes are sent, the server is working on it
      const markProcessing = () => onStatusUpdate("processing", 0)

      if (mode === "remove-bg") {
        const res = await uploadWithProgress(`${API_URL}/remove-background`, formData, reportUpload, markProcessing)
        if (!res.ok) throw new Error(errorFromData(res.data, "Background removal failed"))

        onConversionStart(res.data.job_id, `${stem}_no_bg.png`)
        onStatusUpdate("finished", 100)
        return
      }

      formData.append("output_format", selectedFormat)
      const res = await uploadWithProgress(`${API_URL}/convert`, formData, reportUpload, markProcessing)
      if (!res.ok) throw new Error(errorFromData(res.data, "Conversion request failed"))

      onConversionStart(res.data.job_id, `${stem}.${selectedFormat}`)
      pollProgress(res.data.job_id)
    } catch (error) {
      console.error("Request error:", error)
      const message =
        error instanceof TypeError
          ? "Could not reach the server. It may be waking up — please try again in a moment."
          : error instanceof Error
            ? error.message
            : undefined
      onStatusUpdate("failed", 0, message)
    } finally {
      setIsConverting(false)
    }
  }

  const modeIndex = MODES.findIndex((m) => m.value === mode)

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div className="relative grid grid-cols-2 p-1 rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/10">
        <div
          aria-hidden
          className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 shadow-lg shadow-violet-500/30 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(${modeIndex * 100}%)` }}
        />
        {MODES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => switchMode(value)}
            disabled={isConverting}
            aria-pressed={mode === value}
            className={`relative z-10 inline-flex items-center justify-center gap-2 h-10 text-sm font-medium rounded-lg transition-colors ${
              mode === value ? "text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={allowedExtensions.map((e) => `.${e}`).join(",")}
        onChange={handleFileChange}
        className="hidden"
      />

      {selectedFile ? (
        /* Selected file */
        <div className="animate-fade-up flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] ring-1 ring-inset ring-white/10">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="w-14 h-14 rounded-xl object-cover ring-1 ring-white/10" />
          ) : (
            <FileBadge ext={inputExt} size="lg" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-100">{selectedFile.name}</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {inputExt.toUpperCase()} · {formatSize(selectedFile.size)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isConverting}
              title="Choose another file"
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              disabled={isConverting}
              title="Remove file"
              className="p-2 rounded-lg text-zinc-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Drop zone */
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`group relative w-full overflow-hidden rounded-2xl border border-dashed px-6 py-10 text-center transition-all duration-300 ${
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
            <CloudUpload className="w-6 h-6 text-violet-300" />
          </div>
          <p className="relative text-sm font-medium text-zinc-100">
            {dragActive ? "Drop it like it's hot" : "Drop your file here, or "}
            {!dragActive && <span className="text-violet-300 underline-offset-4 group-hover:underline">browse</span>}
          </p>
          <div className="relative mt-4 flex flex-wrap justify-center gap-1.5">
            {allowedExtensions.map((e) => (
              <span
                key={e}
                className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wide text-zinc-400 bg-white/5 ring-1 ring-inset ring-white/5"
              >
                {e}
              </span>
            ))}
          </div>
          <p className="relative mt-3 text-xs text-zinc-500">Up to {MAX_FILE_SIZE_MB} MB</p>
        </button>
      )}

      {validationError && (
        <div className="animate-fade-up flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm text-rose-200 bg-rose-500/10 ring-1 ring-inset ring-rose-400/20">
          <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" />
          {validationError}
        </div>
      )}

      {/* Output format */}
      {selectedFile && mode === "convert" && (
        <div className="animate-fade-up space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Convert to</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
              {inputExt.toUpperCase()} <ArrowRight className="w-3 h-3" />
              <span className="text-violet-300">{selectedFormat.toUpperCase()}</span>
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {availableFormats.map((format) => {
              const active = format === selectedFormat
              return (
                <button
                  key={format}
                  type="button"
                  onClick={() => setSelectedFormat(format)}
                  disabled={isConverting}
                  aria-pressed={active}
                  className={`h-10 rounded-lg text-xs font-semibold font-mono uppercase transition-all ${
                    active
                      ? "text-white bg-violet-500/20 ring-1 ring-inset ring-violet-400/60 shadow-[0_0_20px] shadow-violet-500/20"
                      : "text-zinc-400 bg-white/[0.03] ring-1 ring-inset ring-white/10 hover:text-zinc-100 hover:bg-white/[0.06]"
                  }`}
                >
                  {format}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {mode === "remove-bg" && selectedFile && (
        <p className="animate-fade-up text-xs text-zinc-500">
          You&apos;ll get a transparent PNG with the background removed.
        </p>
      )}

      {/* Submit */}
      {selectedFile && (
        <button
          onClick={handleSubmit}
          disabled={isConverting}
          className="group animate-fade-up relative w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-[length:200%_100%] bg-left hover:bg-right shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-500"
        >
          {isConverting ? (
            <LoaderCircle className="w-4 h-4 animate-spin" />
          ) : mode === "convert" ? (
            <Repeat className="w-4 h-4" />
          ) : (
            <WandSparkles className="w-4 h-4" />
          )}
          {mode === "convert"
            ? isConverting
              ? "Uploading…"
              : `Convert to ${selectedFormat.toUpperCase()}`
            : isConverting
              ? "Removing background…"
              : "Remove background"}
          {!isConverting && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />}
        </button>
      )}
    </div>
  )
}
