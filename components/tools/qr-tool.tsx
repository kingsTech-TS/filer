"use client"

import { useEffect, useMemo, useState } from "react"
import { ExternalLink, Link2, Pencil, QrCode, RotateCcw, Scissors, TriangleAlert } from "lucide-react"
import TaskView from "@/components/task-view"
import DownloadButton, { DownloadIconButton } from "@/components/download-button"
import FileBadge from "@/components/file-badge"
import {
  ColorField,
  CopyButton,
  Field,
  InlineError,
  PrimaryButton,
  SecondaryButton,
  Segmented,
  Slider,
  inputClass,
} from "@/components/controls"
import { useTask } from "@/hooks/use-task"
import { API_URL, getJson, postForm } from "@/lib/api"
import { formatSize, getExtension } from "@/lib/files"

// ---------------- Types & defaults ----------------
type Mode = "qr" | "qr-short" | "short"
type Level = "L" | "M" | "Q" | "H"

interface Options {
  size_range: [number, number]
  margin_range: [number, number]
  error_correction: Level[]
  max_url_length: number
}

// Used until /qr/options loads (mirrors filer-api)
const DEFAULT_OPTIONS: Options = {
  size_range: [128, 2048],
  margin_range: [0, 10],
  error_correction: ["L", "M", "Q", "H"],
  max_url_length: 2048,
}

const SIZE_PRESETS = [256, 512, 1024, 2048]

/** What each size suits, shown next to the size picker. */
function sizeUse(size: number) {
  if (size <= 256) return "Small · web & email"
  if (size <= 512) return "Medium · screens & slides"
  if (size <= 1024) return "Large · print"
  return "Extra large · posters & banners"
}

/** Preview width (% of its box) for a size, so picking a size visibly changes the preview. */
function previewWidth(size: number) {
  const [min, max] = [256, 2048]
  const t = Math.log2(Math.min(Math.max(size, min), max) / min) / Math.log2(max / min)
  return 40 + 60 * t // 256px → 40%, 2048px → 100%
}

const LEVEL_HINT: Record<Level, string> = {
  L: "Smallest code · ~7% damage tolerance",
  M: "Balanced · ~15% damage tolerance",
  Q: "Sturdier · ~25% damage tolerance",
  H: "Most robust · ~30% damage tolerance",
}

interface Config {
  mode: Mode
  url: string
  size: number
  margin: number
  level: Level
  fg: string
  bg: string
}

const DEFAULT_CONFIG: Config = {
  mode: "qr",
  url: "",
  size: 512,
  margin: 4,
  level: "M",
  fg: "#000000",
  bg: "#ffffff",
}

interface QrFile {
  index: number
  name: string
  size: number
  download_url: string
}

type Result =
  | {
      kind: "qr"
      job_id: string
      url: string
      short_url: string | null
      encoded_url: string
      warning: string | null
      download_url: string
      files: QrFile[]
    }
  | { kind: "short"; url: string; short_url: string }

/** Mirrors the backend: adds https:// when missing, catches obvious typos before sending. */
function checkUrl(raw: string, maxLength: number): string | null {
  const url = raw.trim()
  if (!url) return "Paste a link to get started."
  if (url.length > maxLength) return `That link is too long (max ${maxLength} characters).`
  if (/\s/.test(url)) return "Links can't contain spaces."
  try {
    const parsed = new URL(url.includes("://") ? url : `https://${url}`)
    if (!["http:", "https:"].includes(parsed.protocol)) return "Only http:// and https:// links are supported."
    if (!parsed.hostname.includes(".") && parsed.hostname !== "localhost") return "That doesn't look like a valid link (e.g. example.com)."
  } catch {
    return "That doesn't look like a valid link (e.g. example.com)."
  }
  return null
}

// ---------------- Preview helpers ----------------
const GRID = 25

/** Decorative QR-style pattern in the chosen colors — the real code is drawn on the server. */
function StylePreview({ fg, bg, margin, size }: { fg: string; bg: string; margin: number; size: number }) {
  const cells = useMemo(() => {
    const finder = (x: number, y: number) =>
      [
        [0, 0],
        [GRID - 7, 0],
        [0, GRID - 7],
      ].some(([fx, fy]) => x >= fx - 1 && x <= fx + 7 && y >= fy - 1 && y <= fy + 7)
    const out: [number, number][] = []
    let seed = 7
    for (let y = 0; y < GRID; y++)
      for (let x = 0; x < GRID; x++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff
        if (!finder(x, y) && seed % 100 < 48) out.push([x, y])
      }
    return out
  }, [])

  const total = GRID + margin * 2
  const transparent = bg === "transparent"

  return (
    <div className="grid place-items-center aspect-square rounded-2xl p-4 ring-1 ring-inset ring-white/10 bg-white/[0.03]">
      <svg
        viewBox={`${-margin} ${-margin} ${total} ${total}`}
        className={`h-auto rounded-lg transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${transparent ? "bg-checker" : ""}`}
        style={{ width: `${previewWidth(size)}%` }}
        shapeRendering="crispEdges"
        aria-hidden
      >
        {!transparent && <rect x={-margin} y={-margin} width={total} height={total} fill={bg} />}
        {[
          [0, 0],
          [GRID - 7, 0],
          [0, GRID - 7],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`} fill={fg}>
            <path d={`M${x} ${y}h7v7h-7z M${x + 1} ${y + 1}v5h5v-5z`} fillRule="evenodd" />
            <rect x={x + 2} y={y + 2} width={3} height={3} />
          </g>
        ))}
        {cells.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fg} />
        ))}
      </svg>
    </div>
  )
}

function LinkRow({ label, href, accent = false }: { label: string; href: string; accent?: boolean }) {
  return (
    <div
      className={`space-y-1.5 rounded-xl p-3 ring-1 ring-inset ${
        accent ? "bg-violet-500/[0.08] ring-violet-400/30" : "bg-white/[0.03] ring-white/[0.07]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</span>
        <div className="flex items-center gap-1.5">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title="Open link"
            aria-label={`Open ${label.toLowerCase()}`}
            className="grid place-items-center w-7 h-7 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <CopyButton text={href} />
        </div>
      </div>
      <p className={`break-all font-mono text-sm ${accent ? "text-violet-100" : "text-zinc-300"}`}>{href}</p>
    </div>
  )
}

// ---------------- Component ----------------
export default function QrTool() {
  const task = useTask<Result>()
  const [cfg, setCfg] = useState<Config>(DEFAULT_CONFIG)
  const [options, setOptions] = useState<Options>(DEFAULT_OPTIONS)
  const [formError, setFormError] = useState<string | null>(null)
  // Real pixel size of the generated PNG, read from the image itself
  const [pngSize, setPngSize] = useState<number | null>(null)

  const set = <K extends keyof Config>(key: K, value: Config[K]) => setCfg((c) => ({ ...c, [key]: value }))

  useEffect(() => {
    const controller = new AbortController()
    getJson<Partial<Options>>("/qr/options", controller.signal)
      .then((o) => setOptions((d) => ({ ...d, ...o })))
      .catch(() => {})
    return () => controller.abort()
  }, [])

  const makesQr = cfg.mode !== "short"

  const submit = () => {
    const err = checkUrl(cfg.url, options.max_url_length)
    setFormError(err)
    if (err) return
    setPngSize(null)

    task.run(async (ctx): Promise<Result> => {
      const body = new FormData()
      body.append("url", cfg.url.trim())

      if (cfg.mode === "short") {
        const data = await postForm<{ url: string; short_url: string }>("/shorten", body, ctx, "Couldn't shorten the link")
        return { kind: "short", ...data }
      }

      body.append("shorten", String(cfg.mode === "qr-short"))
      body.append("size", String(cfg.size))
      body.append("margin", String(cfg.margin))
      body.append("error_correction", cfg.level)
      body.append("foreground_color", cfg.fg)
      body.append("background_color", cfg.bg)
      const data = await postForm<Omit<Extract<Result, { kind: "qr" }>, "kind">>("/qr", body, ctx, "Couldn't create the QR code")
      return { kind: "qr", ...data }
    })
  }

  const startOver = () => {
    task.reset()
    setCfg(DEFAULT_CONFIG)
    setFormError(null)
  }

  // ---------- Status / result ----------
  if (task.status !== "idle") {
    const result = task.result
    const busyTitle = cfg.mode === "short" ? "Shortening your link" : "Creating your QR code"

    return (
      <TaskView
        tool="qr"
        status={task.status}
        progress={task.progress}
        error={task.error}
        onRetry={task.reset}
        title={{
          uploading: busyTitle,
          processing: busyTitle,
          finished: result?.kind === "short" ? "Your short link is ready" : "Your QR code is ready",
        }}
        summary={
          task.status !== "finished" && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] ring-1 ring-inset ring-white/10">
              <div className="grid place-items-center w-10 h-10 shrink-0 rounded-xl bg-violet-500/15 ring-1 ring-inset ring-violet-400/30">
                {makesQr ? <QrCode className="w-5 h-5 text-violet-200" /> : <Scissors className="w-5 h-5 text-violet-200" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate font-mono">{cfg.url.trim()}</p>
                <p className="text-xs text-zinc-500">
                  {cfg.mode === "qr" ? "QR code" : cfg.mode === "qr-short" ? "Short link + QR code" : "Short link"}
                </p>
              </div>
            </div>
          )
        }
      >
        {result?.kind === "short" && (
          <div className="space-y-4">
            <LinkRow label="Short link" href={result.short_url} accent />
            <LinkRow label="Original" href={result.url} />
            <div className="grid grid-cols-2 gap-2">
              <SecondaryButton
                onClick={() => {
                  task.reset()
                  set("mode", "qr-short")
                }}
                icon={QrCode}
              >
                Make a QR code
              </SecondaryButton>
              <SecondaryButton onClick={startOver} icon={RotateCcw}>
                Start over
              </SecondaryButton>
            </div>
          </div>
        )}

        {result?.kind === "qr" && (
          <div className="grid gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
            <div className="space-y-3">
              <div
                className={`animate-pop-in rounded-2xl p-3 ring-1 ring-inset ring-white/10 ${
                  cfg.bg === "transparent" ? "bg-checker" : "bg-white/[0.03]"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${API_URL}${result.files[0].download_url}`}
                  alt={`QR code for ${result.encoded_url}`}
                  className="w-full h-auto rounded-lg [image-rendering:pixelated]"
                  onLoad={(e) => setPngSize(e.currentTarget.naturalWidth)}
                />
              </div>
              <div className="text-center space-y-0.5">
                <p className="text-xs font-mono text-zinc-300">
                  PNG: {pngSize ?? cfg.size}×{pngSize ?? cfg.size}px
                </p>
                <p className="text-[11px] text-zinc-500">
                  Shown scaled to fit · point your phone camera at it to test
                </p>
              </div>
            </div>

            <div className="space-y-4 min-w-0">
              {result.short_url && <LinkRow label="Short link" href={result.short_url} accent />}
              <LinkRow label={result.short_url ? "Original" : "Opens"} href={result.url} />

              {result.warning && (
                <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm text-amber-200 bg-amber-500/10 ring-1 ring-inset ring-amber-400/20">
                  <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{result.warning}</span>
                </div>
              )}

              <ul className="space-y-1.5">
                {result.files.map((f) => (
                  <li key={f.index} className="flex items-center gap-3 px-2.5 py-1.5 rounded-xl bg-white/[0.03] ring-1 ring-inset ring-white/[0.07]">
                    <FileBadge ext={getExtension(f.name)} size="sm" />
                    <span className="flex-1 truncate text-sm font-mono text-zinc-300">{f.name}</span>
                    <span className="text-xs text-zinc-500">
                      {f.name.endsWith(".png") ? `${cfg.size}px · ` : "Scalable · "}
                      {formatSize(f.size)}
                    </span>
                    <DownloadIconButton path={f.download_url} fileName={f.name} />
                  </li>
                ))}
              </ul>

              <DownloadButton path={result.download_url} fileName="qr-code.png" label="Download PNG" />
              <div className="grid grid-cols-2 gap-2">
                <SecondaryButton onClick={task.reset} icon={Pencil}>
                  Edit
                </SecondaryButton>
                <SecondaryButton onClick={startOver} icon={RotateCcw}>
                  New link
                </SecondaryButton>
              </div>
            </div>
          </div>
        )}
      </TaskView>
    )
  }

  // ---------- Form ----------
  return (
    <div className={`grid gap-6 ${makesQr ? "md:grid-cols-[minmax(0,1fr)_220px]" : ""}`}>
      {makesQr && (
        <aside className="order-2 space-y-3">
          <div className="md:sticky md:top-6 space-y-3 max-w-[220px] mx-auto md:max-w-none">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Style preview</span>
            <StylePreview fg={cfg.fg} bg={cfg.bg} margin={cfg.margin} size={cfg.size} />
            <p className="text-center text-xs font-mono text-zinc-400">
              {cfg.size}×{cfg.size}px
            </p>
            <p className="text-[11px] text-center text-zinc-600">Shows your colors and margin — the real code is generated on the server.</p>
          </div>
        </aside>
      )}

      <div className="order-1 space-y-5">
        <Field label="Link" htmlFor="qr-url">
          <div className="relative">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              id="qr-url"
              type="url"
              inputMode="url"
              autoComplete="url"
              value={cfg.url}
              maxLength={options.max_url_length}
              onChange={(e) => {
                set("url", e.target.value)
                setFormError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit()
              }}
              placeholder="https://example.com/your/link"
              className={`${inputClass} h-12 pl-9 font-mono`}
            />
          </div>
        </Field>

        <Field label="Create">
          <Segmented<Mode>
            value={cfg.mode}
            onChange={(v) => set("mode", v)}
            options={[
              { value: "qr", label: "QR code", icon: QrCode },
              { value: "qr-short", label: "QR + short", icon: Link2 },
              { value: "short", label: "Short link", icon: Scissors },
            ]}
          />
        </Field>
        <p className="-mt-3 text-xs text-zinc-500">
          {cfg.mode === "qr"
            ? "The QR code opens your link exactly as entered."
            : cfg.mode === "qr-short"
              ? "Your link is shortened first, so the QR code is simpler and easier to scan."
              : "Get a short TinyURL link, no QR code."}
        </p>

        {makesQr && (
          <div key="qr-fields" className="space-y-5 animate-fade-up">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="QR color">
                <ColorField value={cfg.fg} onChange={(v) => set("fg", v)} />
              </Field>
              <Field label="Background">
                <ColorField value={cfg.bg} onChange={(v) => set("bg", v)} allowTransparent />
              </Field>
            </div>

            <Field label="Size" hint={`${cfg.size}×${cfg.size}px · ${sizeUse(cfg.size)}`}>
              <Segmented<string>
                value={String(cfg.size)}
                onChange={(v) => set("size", Number(v))}
                options={SIZE_PRESETS.filter((s) => s >= options.size_range[0] && s <= options.size_range[1]).map((s) => ({
                  value: String(s),
                  label: `${s}`,
                }))}
              />
            </Field>

            <Field label="Margin" htmlFor="qr-margin" hint={`${cfg.margin} module${cfg.margin === 1 ? "" : "s"}`}>
              <Slider id="qr-margin" value={cfg.margin} onChange={(v) => set("margin", v)} min={options.margin_range[0]} max={options.margin_range[1]} />
            </Field>

            <Field label="Error correction" hint={LEVEL_HINT[cfg.level]}>
              <Segmented<Level>
                value={cfg.level}
                onChange={(v) => set("level", v)}
                options={options.error_correction.map((l) => ({ value: l, label: l }))}
              />
            </Field>
          </div>
        )}

        {formError && <InlineError>{formError}</InlineError>}

        <PrimaryButton onClick={submit} icon={cfg.mode === "short" ? Scissors : QrCode}>
          {cfg.mode === "qr" ? "Generate QR code" : cfg.mode === "qr-short" ? "Shorten & generate QR code" : "Shorten link"}
        </PrimaryButton>
      </div>
    </div>
  )
}
