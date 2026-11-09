"use client"

import { useState } from "react"
import { ArrowRight, Check, Film, FileText, Image as ImageIcon, RotateCcw, ShieldCheck, TriangleAlert, WandSparkles, Zap } from "lucide-react"
import FileUploader, { type Mode } from "@/components/file-uploader"
import StageLoader from "@/components/stage-loader"
import StatusBadge from "@/components/status-badge"
import DownloadButton from "@/components/download-button"
import FileBadge from "@/components/file-badge"
import ResultPreview from "@/components/result-preview"
import { formatSize, getExtension } from "@/lib/files"

type Status = "idle" | "uploading" | "processing" | "finished" | "failed"

const FEATURES = [
  { icon: FileText, title: "Documents", text: "PDF ⇄ Word in one click" },
  { icon: ImageIcon, title: "Images", text: "Switch between PNG & JPG" },
  { icon: Film, title: "Audio & video", text: "Pull MP3 audio out of MP4" },
  { icon: WandSparkles, title: "Remove backgrounds", text: "Transparent PNGs, instantly" },
]

const STATUS_COPY: Record<Exclude<Status, "idle">, { title: string; subtitle: string }> = {
  uploading: { title: "Uploading your file", subtitle: "Sending it securely to our servers…" },
  processing: { title: "Working on it", subtitle: "This usually takes a few seconds." },
  finished: { title: "Your file is ready", subtitle: "Download it below." },
  failed: { title: "Something went wrong", subtitle: "Your file couldn't be processed." },
}

export default function Home() {
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>("idle")
  const [mode, setMode] = useState<Mode>("convert")
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null)
  const [progress, setProgress] = useState(0)
  const [downloadName, setDownloadName] = useState<string | undefined>(undefined)
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
  const [outputExt, setOutputExt] = useState("")

  const handleUploadStart = (file: { name: string; size: number }, newMode: Mode, newOutputExt: string) => {
    setUploadedFile(file)
    setMode(newMode)
    setOutputExt(newOutputExt)
    setStatus("uploading")
    setProgress(0)
  }

  const handleConversionStart = (newJobId: string, newDownloadName: string) => {
    setJobId(newJobId)
    setDownloadName(newDownloadName)
    setStatus("processing")
    setProgress(0)
  }

  const handleStatusUpdate = (
    newStatus: "uploading" | "processing" | "finished" | "failed",
    newProgress: number,
    message?: string,
  ) => {
    setStatus(newStatus)
    setProgress(newProgress)
    setErrorMessage(newStatus === "failed" ? message : undefined)
  }

  const handleReset = () => {
    setJobId(null)
    setStatus("idle")
    setUploadedFile(null)
    setProgress(0)
    setDownloadName(undefined)
    setErrorMessage(undefined)
    setOutputExt("")
  }

  const inputExt = uploadedFile ? getExtension(uploadedFile.name) : ""

  return (
    <div className="relative min-h-screen overflow-hidden bg-[oklch(0.11_0.015_270)] text-zinc-100">
      {/* Background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-[70%] w-[38rem] h-[38rem] rounded-full bg-indigo-600/25 blur-[120px] animate-blob" />
        <div className="absolute top-20 left-1/2 translate-x-[5%] w-[32rem] h-[32rem] rounded-full bg-fuchsia-600/20 blur-[120px] animate-blob [animation-delay:-6s]" />
        <div className="absolute bottom-[-12rem] left-1/2 -translate-x-1/2 w-[40rem] h-[30rem] rounded-full bg-violet-700/15 blur-[120px] animate-blob [animation-delay:-12s]" />
        <div className="absolute inset-0 bg-grid" />
      </div>

      {/* Nav */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg shadow-violet-500/30">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
              <path d="M9 13h6M13 10l3 3-3 3" />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight">Filer</span>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-zinc-400 bg-white/5 ring-1 ring-inset ring-white/10">
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
            <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400" />
          </span>
          Free · No sign-up
        </span>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 pt-8 sm:pt-14 pb-20">
        {/* Hero */}
        <div className="mx-auto max-w-2xl text-center animate-fade-up">
          <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
            Convert anything.
            <br />
            <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
              In seconds.
            </span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-zinc-400">
            Documents, images, audio and video — plus one-click background removal for your photos.
          </p>
        </div>

        {/* Card */}
        <div className="relative mx-auto mt-10 sm:mt-12 max-w-lg animate-fade-up [animation-delay:120ms]">
          <div aria-hidden className="absolute -inset-px rounded-[28px] bg-gradient-to-b from-white/20 via-white/5 to-transparent" />
          <div className="relative rounded-[28px] bg-zinc-950/60 backdrop-blur-2xl p-5 sm:p-7 shadow-2xl shadow-black/40">
            {status === "idle" ? (
              <FileUploader
                onUploadStart={handleUploadStart}
                onConversionStart={handleConversionStart}
                onStatusUpdate={handleStatusUpdate}
              />
            ) : (
              <div key={status === "finished" || status === "failed" ? status : "active"} className="space-y-6 animate-fade-up">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">{STATUS_COPY[status].title}</h2>
                    <p className="text-sm text-zinc-400 mt-0.5">{STATUS_COPY[status].subtitle}</p>
                  </div>
                  <StatusBadge status={status} />
                </div>

                {/* File → output */}
                {uploadedFile && (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] ring-1 ring-inset ring-white/10">
                    <FileBadge ext={inputExt} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{uploadedFile.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{formatSize(uploadedFile.size)}</p>
                    </div>
                    {outputExt && (
                      <div className="flex items-center gap-2 shrink-0">
                        <ArrowRight className="w-4 h-4 text-zinc-500" />
                        <span className="px-2 py-1 rounded-md text-[11px] font-mono font-semibold uppercase text-violet-200 bg-violet-500/15 ring-1 ring-inset ring-violet-400/30">
                          {mode === "remove-bg" ? "PNG ✦" : outputExt}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {(status === "uploading" || status === "processing") && (
                  <StageLoader
                    status={status}
                    progress={progress}
                    mode={mode}
                    inputExt={inputExt}
                    outputExt={outputExt}
                  />
                )}

                {status === "finished" && jobId && (
                  <div className="space-y-4">
                    {mode === "remove-bg" ? (
                      <ResultPreview jobId={jobId} />
                    ) : (
                      <div className="flex flex-col items-center py-2">
                        <div className="grid place-items-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 animate-pop-in animate-ring-pulse">
                          <Check className="w-8 h-8 text-white" strokeWidth={3} />
                        </div>
                        {downloadName && (
                          <p className="mt-4 max-w-full truncate text-sm font-mono text-zinc-300">{downloadName}</p>
                        )}
                      </div>
                    )}
                    <DownloadButton jobId={jobId} fileName={downloadName} />
                    <button
                      onClick={handleReset}
                      className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium text-zinc-300 bg-white/[0.04] ring-1 ring-inset ring-white/10 hover:bg-white/[0.08] hover:text-white transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Start over
                    </button>
                  </div>
                )}

                {status === "failed" && (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 rounded-2xl p-4 bg-rose-500/10 ring-1 ring-inset ring-rose-400/20">
                      <TriangleAlert className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
                      <p className="text-sm text-rose-100">{errorMessage || "Conversion failed. Please try again."}</p>
                    </div>
                    <button
                      onClick={handleReset}
                      className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-500 shadow-lg shadow-violet-500/25 hover:brightness-110 transition-all"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Try again
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Trust row */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-500 animate-fade-up [animation-delay:200ms]">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Secure uploads
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Fast cloud processing
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" /> No account needed
          </span>
        </div>

        {/* Features */}
        <section className="mx-auto mt-20 grid max-w-4xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-up [animation-delay:280ms]">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="group rounded-2xl p-5 bg-white/[0.03] ring-1 ring-inset ring-white/[0.07] hover:bg-white/[0.05] hover:ring-white/15 transition-all"
            >
              <div className="grid place-items-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 ring-1 ring-inset ring-white/10 transition-transform group-hover:-translate-y-0.5">
                <Icon className="w-5 h-5 text-violet-300" />
              </div>
              <h3 className="mt-4 text-sm font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-zinc-500">{text}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-6 text-center text-xs text-zinc-600">
        © {new Date().getFullYear()} Filer
      </footer>
    </div>
  )
}
