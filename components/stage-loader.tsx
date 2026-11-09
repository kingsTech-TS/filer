"use client"

import { ArrowUp, Check, CloudUpload, Download, Repeat, Sparkles, type LucideIcon } from "lucide-react"
import { TOOL_BY_ID, type ToolId } from "@/lib/tools"

type Stage = "uploading" | "processing" | "finished" | "failed"

interface StageLoaderProps {
  status: Stage
  progress: number
  mode: ToolId
  inputExt?: string
  outputExt?: string
  /** Line under "Processing…"; a sensible default is used per tool. */
  caption?: string
}

const RING_R = 54
const RING_C = 2 * Math.PI * RING_R

/** Circular ring: determinate when `value` is given, spinning arc otherwise. */
function Ring({ value }: { value?: number }) {
  const determinate = value !== undefined
  const offset = determinate ? RING_C * (1 - Math.min(Math.max(value, 0), 100) / 100) : RING_C * 0.72

  return (
    <svg
      viewBox="0 0 128 128"
      className={`absolute inset-0 w-full h-full -rotate-90 ${determinate ? "" : "animate-spin [animation-duration:1.3s]"}`}
    >
      <defs>
        <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="55%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#e879f9" />
        </linearGradient>
      </defs>
      <circle cx="64" cy="64" r={RING_R} fill="none" stroke="white" strokeOpacity={0.07} strokeWidth={6} />
      <circle
        cx="64"
        cy="64"
        r={RING_R}
        fill="none"
        stroke="url(#ring-grad)"
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={RING_C}
        strokeDashoffset={offset}
        className="transition-[stroke-dashoffset] duration-300 ease-out drop-shadow-[0_0_6px_rgba(167,139,250,0.6)]"
      />
    </svg>
  )
}

function UploadingVisual({ progress }: { progress: number }) {
  return (
    <>
      <Ring value={progress} />
      {/* Rising particles */}
      {[18, 38, 62, 82].map((left, i) => (
        <span
          key={left}
          className="absolute bottom-[34%] w-1.5 h-1.5 rounded-full bg-sky-300/80 animate-rise"
          style={{ left: `${left}%`, animationDelay: `${i * 0.45}s` }}
        />
      ))}
      <div className="relative flex flex-col items-center">
        <CloudUpload className="w-9 h-9 text-sky-300" />
        <ArrowUp className="w-4 h-4 -mt-1 text-sky-200 animate-nudge-up" strokeWidth={3} />
      </div>
    </>
  )
}

function ConvertingVisual({ inputExt, outputExt }: { inputExt: string; outputExt: string }) {
  return (
    <>
      <Ring />
      {/* Orbiting dots */}
      <span className="absolute top-1/2 left-1/2 -m-1 w-2 h-2 rounded-full bg-fuchsia-300 shadow-[0_0_10px] shadow-fuchsia-400 animate-orbit [--orbit-r:44px]" />
      <span className="absolute top-1/2 left-1/2 -m-0.75 w-1.5 h-1.5 rounded-full bg-indigo-300 animate-orbit [--orbit-r:44px] [animation-delay:-1.2s]" />
      {/* Format flip: input ⇄ output */}
      <div className="relative w-16 h-8 [perspective:200px]">
        <span className="absolute inset-0 grid place-items-center rounded-lg font-mono text-sm font-bold uppercase text-zinc-200 bg-white/10 ring-1 ring-inset ring-white/15 animate-swap-out">
          {inputExt || "file"}
        </span>
        <span className="absolute inset-0 grid place-items-center rounded-lg font-mono text-sm font-bold uppercase text-violet-100 bg-violet-500/30 ring-1 ring-inset ring-violet-300/40 animate-swap-in">
          {outputExt || "…"}
        </span>
      </div>
      <Repeat className="absolute bottom-[22%] w-3.5 h-3.5 text-violet-300/70 animate-spin [animation-duration:3s]" />
    </>
  )
}

/** Files dropping into (zip) or floating out of (unzip) a box. */
function ArchiveVisual({ icon: Icon, direction }: { icon: LucideIcon; direction: "in" | "out" }) {
  return (
    <>
      <Ring />
      {[30, 50, 70].map((left, i) => (
        <span
          key={left}
          className={`absolute top-[42%] w-2.5 h-3 rounded-[3px] bg-gradient-to-b from-amber-200 to-yellow-400 shadow-[0_0_8px] shadow-amber-400/50 ${
            direction === "in" ? "animate-fall" : "animate-rise"
          }`}
          style={{ left: `calc(${left}% - 5px)`, animationDelay: `${i * 0.55}s` }}
        />
      ))}
      <Icon className="relative top-3 w-10 h-10 text-amber-200" />
    </>
  )
}

function SparkleVisual({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <>
      <Ring />
      {[
        { top: "26%", left: "30%", delay: "0s", size: "w-3 h-3" },
        { top: "34%", left: "66%", delay: "0.6s", size: "w-2.5 h-2.5" },
        { top: "64%", left: "28%", delay: "1.1s", size: "w-2 h-2" },
        { top: "62%", left: "68%", delay: "0.3s", size: "w-3 h-3" },
      ].map((s, i) => (
        <Sparkles
          key={i}
          className={`absolute text-fuchsia-200 animate-twinkle ${s.size}`}
          style={{ top: s.top, left: s.left, animationDelay: s.delay }}
        />
      ))}
      <Icon className="relative w-9 h-9 text-violet-200 animate-nudge-up [animation-duration:1.8s]" />
    </>
  )
}

function Stepper({ status, step, icon }: { status: Stage; step: string; icon: LucideIcon }) {
  const current = status === "uploading" ? 0 : status === "processing" ? 1 : 2
  const steps = [
    { label: "Upload", icon: CloudUpload },
    { label: step, icon },
    { label: "Download", icon: Download },
  ]

  return (
    <ol className="flex items-center w-full max-w-xs mx-auto">
      {steps.map(({ label, icon: Icon }, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={label} className={`flex items-center ${i < steps.length - 1 ? "flex-1" : ""}`}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`relative grid place-items-center w-8 h-8 rounded-full ring-1 ring-inset transition-all duration-500 ${
                  done
                    ? "bg-emerald-500/20 ring-emerald-400/50 text-emerald-300"
                    : active
                      ? "bg-violet-500/20 ring-violet-400/60 text-violet-200 shadow-[0_0_18px] shadow-violet-500/40"
                      : "bg-white/[0.03] ring-white/10 text-zinc-600"
                }`}
              >
                {active && <span className="absolute inset-0 rounded-full ring-2 ring-violet-400/40 animate-ping" />}
                {done ? <Check className="w-4 h-4 animate-pop-in" strokeWidth={3} /> : <Icon className="w-4 h-4" />}
              </div>
              <span
                className={`text-[11px] font-medium transition-colors ${
                  active ? "text-zinc-200" : done ? "text-emerald-300/80" : "text-zinc-600"
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="relative flex-1 h-0.5 mx-2 mb-5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-violet-400 transition-[width] duration-700 ease-out ${
                    done ? "w-full" : "w-0"
                  }`}
                />
                {active && (
                  <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-violet-400/70 to-transparent animate-shimmer" />
                )}
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

const DEFAULT_CAPTIONS: Record<ToolId, string> = {
  convert: "Converting your file",
  "remove-bg": "Detecting the subject & removing the background",
  zip: "Compressing your files",
  unzip: "Extracting files from the archive",
  favicon: "Rendering icons for every size",
}

export default function StageLoader({
  status,
  progress,
  mode,
  inputExt = "",
  outputExt = "",
  caption: customCaption,
}: StageLoaderProps) {
  const uploading = status === "uploading"
  const tool = TOOL_BY_ID[mode]

  const caption = uploading
    ? progress >= 100
      ? "Upload complete — handing off…"
      : "Uploading"
    : (customCaption ??
      (mode === "convert" && inputExt && outputExt
        ? `Converting ${inputExt.toUpperCase()} to ${outputExt.toUpperCase()}`
        : DEFAULT_CAPTIONS[mode]))

  const visual = uploading ? (
    <UploadingVisual progress={progress} />
  ) : mode === "convert" ? (
    <ConvertingVisual inputExt={inputExt} outputExt={outputExt} />
  ) : mode === "zip" ? (
    <ArchiveVisual icon={tool.icon} direction="in" />
  ) : mode === "unzip" ? (
    <ArchiveVisual icon={tool.icon} direction="out" />
  ) : (
    <SparkleVisual icon={tool.icon} />
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center">
        <div className="relative grid place-items-center w-36 h-36">
          {/* Soft glow */}
          <div
            className={`absolute inset-4 rounded-full blur-2xl animate-breathe ${
              uploading ? "bg-sky-500/30" : mode === "zip" || mode === "unzip" ? "bg-amber-500/25" : "bg-violet-500/30"
            }`}
          />
          <div key={uploading ? "up" : mode} className="absolute inset-0 grid place-items-center animate-pop-in">
            {visual}
          </div>
        </div>

        <div className="mt-4 h-10 text-center">
          {uploading ? (
            <p className="text-2xl font-semibold tabular-nums tracking-tight">
              {Math.round(progress)}
              <span className="text-base text-zinc-500">%</span>
            </p>
          ) : (
            <p className="text-sm font-medium text-zinc-300 inline-flex items-center gap-1">
              Processing
              <span className="inline-flex">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}>
                    .
                  </span>
                ))}
              </span>
            </p>
          )}
          <p className="text-xs text-zinc-500 mt-0.5">{caption}</p>
        </div>
      </div>

      <Stepper status={status} step={tool.step} icon={tool.icon} />
    </div>
  )
}
