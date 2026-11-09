"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { AppWindow, Check, Copy, Image as ImageIcon, Moon, Pencil, RotateCcw, Smile, Sun, Type } from "lucide-react"
import Dropzone from "@/components/dropzone"
import SelectedFile from "@/components/selected-file"
import TaskView from "@/components/task-view"
import DownloadButton, { DownloadIconButton } from "@/components/download-button"
import FileBadge from "@/components/file-badge"
import {
  ColorField,
  Field,
  InlineError,
  PrimaryButton,
  SecondaryButton,
  Segmented,
  Slider,
  Switch,
  inputClass,
} from "@/components/controls"
import { useTask } from "@/hooks/use-task"
import { API_URL, getJson, postForm } from "@/lib/api"
import { formatSize, getExtension, validateFile } from "@/lib/files"

// ---------------- Types & defaults ----------------
type Source = "text" | "emoji" | "image"
type Shape = "square" | "rounded" | "circle" | "squircle" | "hexagon" | "none"
type Fit = "cover" | "contain"

interface Options {
  shapes: Shape[]
  max_text_length: number
  font_weights: number[]
  image_formats: string[]
  suggested_fonts: string[]
}

// Used until /favicon/options loads (mirrors filer-api)
const DEFAULT_OPTIONS: Options = {
  shapes: ["square", "rounded", "circle", "squircle", "hexagon", "none"],
  max_text_length: 4,
  font_weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
  image_formats: ["bmp", "gif", "ico", "jpeg", "jpg", "png", "webp"],
  suggested_fonts: [
    "Roboto", "Open Sans", "Inter", "Montserrat", "Poppins", "Lato", "Oswald", "Raleway",
    "Playfair Display", "Merriweather", "Nunito", "Bebas Neue", "Lobster", "Pacifico", "Fira Code", "Roboto Mono",
  ],
}

const QUICK_EMOJI = ["🚀", "🔥", "⚡", "🎨", "💡", "📁", "🌈", "🍕", "🐱", "⭐", "❤️", "✅"]

interface Config {
  source: Source
  appName: string
  // text
  text: string
  font: string
  weight: number
  italic: boolean
  fontSize: number
  fontColor: string
  textBg: string
  textShape: Shape
  // emoji
  emoji: string
  emojiSize: number
  emojiBg: string
  emojiShape: Shape
  // image
  image: File | null
  fit: Fit
  imageBg: string
  imageShape: Shape
  // dark mode (text & emoji only)
  dark: boolean
  darkFontColor: string
  darkBg: string
}

const DEFAULT_CONFIG: Config = {
  source: "text",
  appName: "",
  text: "F",
  font: "Inter",
  weight: 700,
  italic: false,
  fontSize: 60,
  fontColor: "#ffffff",
  textBg: "#7c3aed",
  textShape: "rounded",
  emoji: "🚀",
  emojiSize: 80,
  emojiBg: "transparent",
  emojiShape: "none",
  image: null,
  fit: "cover",
  imageBg: "transparent",
  imageShape: "square",
  dark: false,
  darkFontColor: "#1e1b4b",
  darkBg: "#e9d5ff",
}

interface FaviconFile {
  index: number
  name: string
  group: "browser" | "device" | "manifest" | "snippet"
  width: number | null
  height: number | null
  size: number
  download_url: string
}

interface Result {
  job_id: string
  download_url: string
  html: string
  files: FaviconFile[]
}

// ---------------- Preview helpers ----------------
const ROUND_SHAPES: Shape[] = ["circle", "squircle", "hexagon"]

function shapeStyle(shape: Shape): React.CSSProperties {
  switch (shape) {
    case "rounded":
      return { borderRadius: "22%" }
    case "circle":
      return { borderRadius: "50%" }
    case "squircle":
      return { borderRadius: "32%" }
    case "hexagon":
      return { clipPath: "polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)" }
    default:
      return {}
  }
}

/** Loads a Google Font for the live preview (debounced while typing). */
function useGoogleFont(family: string, weight: number, italic: boolean) {
  useEffect(() => {
    const name = family.trim()
    if (!name || !/^[A-Za-z0-9 ]+$/.test(name)) return
    const t = setTimeout(() => {
      const id = `gf-${name}-${weight}-${italic ? "i" : "n"}`.replace(/\s+/g, "-")
      if (document.getElementById(id)) return
      const link = document.createElement("link")
      link.id = id
      link.rel = "stylesheet"
      link.href = `https://fonts.googleapis.com/css2?family=${name.replace(/ /g, "+")}:ital,wght@${italic ? 1 : 0},${weight}&display=swap`
      document.head.appendChild(link)
    }, 400)
    return () => clearTimeout(t)
  }, [family, weight, italic])
}

/** Client-side approximation of what the backend will render. */
function IconArt({
  cfg,
  size,
  variant = "light",
  imageUrl,
}: {
  cfg: Config
  size: number
  variant?: "light" | "dark"
  imageUrl: string | null
}) {
  const dark = variant === "dark" && cfg.dark && cfg.source !== "image"
  const shape = cfg.source === "text" ? cfg.textShape : cfg.source === "emoji" ? cfg.emojiShape : cfg.imageShape
  const baseBg = cfg.source === "text" ? cfg.textBg : cfg.source === "emoji" ? cfg.emojiBg : cfg.imageBg
  const bg = dark ? cfg.darkBg : baseBg
  const hasBg = shape !== "none" && bg !== "transparent" && bg !== ""

  let content: React.ReactNode = null
  if (cfg.source === "text") {
    const maxW = size * (ROUND_SHAPES.includes(shape) ? 0.78 : 0.9)
    let px = (size * cfg.fontSize) / 100
    const estWidth = Math.max(cfg.text.length, 1) * px * 0.62
    if (estWidth > maxW) px *= maxW / estWidth
    content = (
      <span
        style={{
          fontFamily: `"${cfg.font}", ui-sans-serif, system-ui`,
          fontWeight: cfg.weight,
          fontStyle: cfg.italic ? "italic" : "normal",
          fontSize: px,
          lineHeight: 1,
          color: dark ? cfg.darkFontColor : cfg.fontColor,
          whiteSpace: "nowrap",
        }}
      >
        {cfg.text}
      </span>
    )
  } else if (cfg.source === "emoji") {
    let box = (size * cfg.emojiSize) / 100
    if (ROUND_SHAPES.includes(shape) && hasBg) box *= 0.85
    content = <span style={{ fontSize: box * 0.86, lineHeight: 1 }}>{cfg.emoji}</span>
  } else if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    content = <img src={imageUrl} alt="" className="w-full h-full" style={{ objectFit: cfg.fit }} />
  }

  return (
    <div
      className="relative grid place-items-center overflow-hidden shrink-0"
      style={{
        width: size,
        height: size,
        ...(shape === "none" ? {} : shapeStyle(shape)),
        background: hasBg ? bg : undefined,
      }}
    >
      {content}
    </div>
  )
}

function ShapePicker({ value, onChange, shapes }: { value: Shape; onChange: (s: Shape) => void; shapes: Shape[] }) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {shapes.map((s) => {
        const active = s === value
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            aria-pressed={active}
            title={s}
            className={`group flex flex-col items-center gap-1.5 py-2 rounded-lg ring-1 ring-inset transition-all ${
              active ? "bg-violet-500/15 ring-violet-400/60" : "bg-white/[0.03] ring-white/10 hover:bg-white/[0.06]"
            }`}
          >
            <span
              className={`w-6 h-6 ${s === "none" ? "border border-dashed border-zinc-500 rounded-md" : active ? "bg-violet-300" : "bg-zinc-500 group-hover:bg-zinc-300"} transition-colors`}
              style={s === "none" ? undefined : shapeStyle(s)}
            />
            <span className={`text-[10px] capitalize ${active ? "text-violet-100" : "text-zinc-500"}`}>{s}</span>
          </button>
        )
      })}
    </div>
  )
}

function BrowserTab({ theme, icon, title }: { theme: "light" | "dark"; icon: React.ReactNode; title: string }) {
  const light = theme === "light"
  return (
    <div className={`rounded-xl p-2 pb-0 ${light ? "bg-zinc-200" : "bg-zinc-900 ring-1 ring-inset ring-white/10"}`}>
      <div
        className={`flex items-center gap-2 h-8 px-3 rounded-t-lg text-xs ${
          light ? "bg-white text-zinc-700" : "bg-zinc-800 text-zinc-200"
        }`}
      >
        <span className="grid place-items-center w-4 h-4 shrink-0 overflow-hidden">{icon}</span>
        <span className="truncate">{title}</span>
        {light ? <Sun className="ml-auto w-3 h-3 text-zinc-400" /> : <Moon className="ml-auto w-3 h-3 text-zinc-500" />}
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch {
          // clipboard blocked
        }
      }}
      className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-colors ${
        copied ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-zinc-300 hover:bg-white/15 hover:text-white"
      }`}
    >
      {copied ? <Check className="w-3.5 h-3.5 animate-pop-in" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  )
}

// ---------------- Component ----------------
export default function FaviconTool() {
  const task = useTask<Result>()
  const [cfg, setCfg] = useState<Config>(DEFAULT_CONFIG)
  const [options, setOptions] = useState<Options>(DEFAULT_OPTIONS)
  const [formError, setFormError] = useState<string | null>(null)

  const set = <K extends keyof Config>(key: K, value: Config[K]) => setCfg((c) => ({ ...c, [key]: value }))

  useEffect(() => {
    const controller = new AbortController()
    getJson<Partial<Options>>("/favicon/options", controller.signal)
      .then((o) => setOptions((d) => ({ ...d, ...o })))
      .catch(() => {})
    return () => controller.abort()
  }, [])

  useGoogleFont(cfg.font, cfg.weight, cfg.italic)

  const imageUrl = useMemo(() => (cfg.image ? URL.createObjectURL(cfg.image) : null), [cfg.image])
  useEffect(
    () => () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    },
    [imageUrl],
  )

  const selectImage = (f: File) => {
    const err = validateFile(f, options.image_formats)
    setFormError(err)
    if (!err) set("image", f)
  }

  const canDark = cfg.source !== "image"
  const showDark = canDark && cfg.dark

  const submit = () => {
    if (cfg.source === "text" && !cfg.text.trim()) return setFormError("Type 1–4 characters for your icon.")
    if (cfg.source === "emoji" && !cfg.emoji.trim()) return setFormError("Pick an emoji for your icon.")
    if (cfg.source === "image" && !cfg.image) return setFormError("Choose an image for your icon.")
    setFormError(null)

    task.run(async (ctx) => {
      const body = new FormData()
      if (cfg.appName.trim()) body.append("app_name", cfg.appName.trim())

      if (cfg.source === "text") {
        body.append("text", cfg.text.trim())
        body.append("shape", cfg.textShape)
        body.append("font_family", cfg.font.trim() || "Roboto")
        body.append("font_weight", String(cfg.weight))
        body.append("italic", String(cfg.italic))
        body.append("font_size", String(cfg.fontSize))
        body.append("font_color", cfg.fontColor)
        body.append("background_color", cfg.textBg)
        body.append("dark_mode", String(cfg.dark))
        if (cfg.dark) {
          body.append("dark_font_color", cfg.darkFontColor)
          body.append("dark_background_color", cfg.darkBg)
        }
      } else if (cfg.source === "emoji") {
        body.append("emoji", cfg.emoji.trim())
        body.append("shape", cfg.emojiShape)
        body.append("emoji_size", String(cfg.emojiSize))
        body.append("background_color", cfg.emojiBg)
        body.append("dark_mode", String(cfg.dark))
        if (cfg.dark) body.append("dark_background_color", cfg.darkBg)
      } else {
        body.append("file", cfg.image!)
        body.append("shape", cfg.imageShape)
        body.append("fit", cfg.fit)
        body.append("background_color", cfg.imageBg)
      }

      return postForm<Result>(`/favicon/${cfg.source}`, body, ctx, "Couldn't generate the favicon")
    })
  }

  const appTitle = cfg.appName.trim() || "My App"

  // ---------- Status / result ----------
  if (task.status !== "idle") {
    const files = task.result?.files ?? []
    const byName = (n: string) => files.find((f) => f.name === n)
    const url = (f?: FaviconFile) => (f ? `${API_URL}${f.download_url}` : undefined)
    const lightTab = url(byName("favicon-32x32.png"))
    const darkTab = url(byName("favicon-dark-32x32.png")) ?? lightTab
    const icons = files.filter((f) => f.width && f.name.endsWith(".png"))
    const extras = files.filter((f) => !(f.width && f.name.endsWith(".png")))

    return (
      <TaskView
        tool="favicon"
        status={task.status}
        progress={task.progress}
        error={task.error}
        onRetry={task.reset}
        title={{ uploading: "Sending your design", processing: "Generating icons", finished: "Your favicon pack is ready" }}
        summary={
          task.status !== "finished" && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] ring-1 ring-inset ring-white/10">
              <div className="grid place-items-center w-11 h-11 rounded-xl bg-checker overflow-hidden">
                <IconArt cfg={cfg} size={36} imageUrl={imageUrl} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{appTitle}</p>
                <p className="text-xs text-zinc-500">Favicon from {cfg.source}</p>
              </div>
            </div>
          )
        }
      >
        {task.result && (
          <div className="space-y-6">
            {/* Tab previews */}
            <div className={`grid gap-3 ${darkTab !== lightTab ? "sm:grid-cols-2" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <BrowserTab theme="light" title={appTitle} icon={lightTab && <img src={lightTab} alt="" className="w-4 h-4" />} />
              {darkTab !== lightTab && (
                // eslint-disable-next-line @next/next/no-img-element
                <BrowserTab theme="dark" title={appTitle} icon={darkTab && <img src={darkTab} alt="" className="w-4 h-4" />} />
              )}
            </div>

            {/* Icon sizes */}
            <div className="space-y-2.5">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Icons</span>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {icons.map((f, i) => (
                  <div
                    key={f.index}
                    className="group animate-fade-up relative flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.03] ring-1 ring-inset ring-white/[0.07]"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="grid place-items-center w-16 h-16 rounded-lg bg-checker">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url(f)}
                        alt={f.name}
                        style={{ width: Math.min(f.width!, 56), height: Math.min(f.height!, 56), imageRendering: f.width! <= 32 ? "pixelated" : "auto" }}
                      />
                    </div>
                    <div className="w-full text-center">
                      <p className="text-[11px] font-mono text-zinc-300">
                        {f.width}×{f.height}
                      </p>
                      <p className="truncate text-[10px] text-zinc-500" title={f.name}>
                        {f.name}
                      </p>
                    </div>
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <DownloadIconButton path={f.download_url} fileName={f.name} />
                    </div>
                  </div>
                ))}
              </div>
              {extras.length > 0 && (
                <ul className="space-y-1.5 pt-1">
                  {extras.map((f) => (
                    <li key={f.index} className="flex items-center gap-3 px-2.5 py-1.5 rounded-xl bg-white/[0.03] ring-1 ring-inset ring-white/[0.07]">
                      <FileBadge ext={getExtension(f.name)} size="sm" />
                      <span className="flex-1 truncate text-sm font-mono text-zinc-300">{f.name}</span>
                      <span className="text-xs text-zinc-500">{formatSize(f.size)}</span>
                      <DownloadIconButton path={f.download_url} fileName={f.name} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* HTML */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Add to your &lt;head&gt;</span>
                <CopyButton text={task.result.html} />
              </div>
              <pre className="overflow-x-auto rounded-xl p-4 text-xs leading-relaxed font-mono text-zinc-300 bg-black/40 ring-1 ring-inset ring-white/10 [scrollbar-width:thin]">
                {task.result.html}
              </pre>
            </div>

            <DownloadButton path={`/download/${task.result.job_id}`} fileName="favicon.zip" label="Download all (.zip)" />
            <div className="grid grid-cols-2 gap-2">
              <SecondaryButton onClick={task.reset} icon={Pencil}>
                Edit design
              </SecondaryButton>
              <SecondaryButton
                onClick={() => {
                  task.reset()
                  setCfg(DEFAULT_CONFIG)
                }}
                icon={RotateCcw}
              >
                Start over
              </SecondaryButton>
            </div>
          </div>
        )}
      </TaskView>
    )
  }

  // ---------- Form ----------
  const shapeKey = cfg.source === "text" ? "textShape" : cfg.source === "emoji" ? "emojiShape" : "imageShape"
  const bgKey = cfg.source === "text" ? "textBg" : cfg.source === "emoji" ? "emojiBg" : "imageBg"

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_220px]">
      {/* Preview (first on mobile) */}
      <aside className="md:order-2 space-y-3">
        <div className="md:sticky md:top-6 space-y-3">
          <div className="grid place-items-center aspect-square rounded-2xl bg-checker ring-1 ring-white/10 p-6">
            <div key={cfg.source} className="animate-pop-in">
              <IconArt cfg={cfg} size={128} imageUrl={imageUrl} />
            </div>
          </div>
          <div className="flex items-end justify-center gap-4 rounded-xl p-3 bg-white/[0.03] ring-1 ring-inset ring-white/[0.07]">
            {[48, 32, 16].map((s) => (
              <div key={s} className="flex flex-col items-center gap-1.5">
                <IconArt cfg={cfg} size={s} imageUrl={imageUrl} />
                <span className="text-[10px] font-mono text-zinc-500">{s}px</span>
              </div>
            ))}
          </div>
          <BrowserTab theme="light" title={appTitle} icon={<IconArt cfg={cfg} size={16} imageUrl={imageUrl} />} />
          {showDark && (
            <BrowserTab theme="dark" title={appTitle} icon={<IconArt cfg={cfg} size={16} variant="dark" imageUrl={imageUrl} />} />
          )}
          <p className="text-[11px] text-center text-zinc-600">Live preview — final icons are rendered on the server.</p>
        </div>
      </aside>

      {/* Fields */}
      <div className="md:order-1 space-y-5">
        <Segmented<Source>
          value={cfg.source}
          onChange={(v) => {
            set("source", v)
            setFormError(null)
          }}
          options={[
            { value: "text", label: "Text", icon: Type },
            { value: "emoji", label: "Emoji", icon: Smile },
            { value: "image", label: "Image", icon: ImageIcon },
          ]}
        />

        <div key={cfg.source} className="space-y-5 animate-fade-up">
          {cfg.source === "text" && (
            <>
              <Field label="Text" htmlFor="fav-text" hint={`${cfg.text.length}/${options.max_text_length}`}>
                <input
                  id="fav-text"
                  value={cfg.text}
                  maxLength={options.max_text_length}
                  onChange={(e) => set("text", e.target.value)}
                  placeholder="AB"
                  className={`${inputClass} h-12 text-lg font-semibold`}
                />
              </Field>

              <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
                <Field label="Font" htmlFor="fav-font">
                  <input
                    id="fav-font"
                    list="fav-fonts"
                    value={cfg.font}
                    onChange={(e) => set("font", e.target.value)}
                    placeholder="Any Google Font"
                    className={inputClass}
                  />
                  <datalist id="fav-fonts">
                    {options.suggested_fonts.map((f) => (
                      <option key={f} value={f} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Weight" htmlFor="fav-weight">
                  <select
                    id="fav-weight"
                    value={cfg.weight}
                    onChange={(e) => set("weight", Number(e.target.value))}
                    className={`${inputClass} appearance-none`}
                  >
                    {options.font_weights.map((w) => (
                      <option key={w} value={w} className="bg-zinc-900">
                        {w}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="flex flex-wrap gap-1.5 -mt-2">
                {options.suggested_fonts.slice(0, 8).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => set("font", f)}
                    className={`px-2 py-1 rounded-md text-[11px] ring-1 ring-inset transition-colors ${
                      cfg.font === f ? "bg-violet-500/15 ring-violet-400/50 text-violet-100" : "ring-white/10 text-zinc-500 hover:text-zinc-200"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <Switch checked={cfg.italic} onChange={(v) => set("italic", v)} label="Italic" />

              <Field label="Text size" htmlFor="fav-size" hint={`${cfg.fontSize}%`}>
                <Slider id="fav-size" value={cfg.fontSize} onChange={(v) => set("fontSize", v)} min={10} max={100} />
              </Field>

              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Text color">
                  <ColorField value={cfg.fontColor} onChange={(v) => set("fontColor", v)} />
                </Field>
                <Field label="Background">
                  <ColorField value={cfg.textBg} onChange={(v) => set("textBg", v)} allowTransparent />
                </Field>
              </div>
            </>
          )}

          {cfg.source === "emoji" && (
            <>
              <Field label="Emoji" htmlFor="fav-emoji">
                <input
                  id="fav-emoji"
                  value={cfg.emoji}
                  onChange={(e) => set("emoji", e.target.value)}
                  placeholder="Paste an emoji"
                  className={`${inputClass} h-12 text-2xl`}
                />
              </Field>
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 -mt-2">
                {QUICK_EMOJI.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => set("emoji", e)}
                    className={`h-9 rounded-lg text-lg transition-all hover:scale-110 ${
                      cfg.emoji === e ? "bg-violet-500/20 ring-1 ring-inset ring-violet-400/60" : "hover:bg-white/5"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <Field label="Emoji size" htmlFor="fav-esize" hint={`${cfg.emojiSize}%`}>
                <Slider id="fav-esize" value={cfg.emojiSize} onChange={(v) => set("emojiSize", v)} min={10} max={100} />
              </Field>
              <Field label="Background">
                <ColorField value={cfg.emojiBg} onChange={(v) => set("emojiBg", v)} allowTransparent />
              </Field>
            </>
          )}

          {cfg.source === "image" && (
            <>
              {cfg.image ? (
                <SelectedFile file={cfg.image} onRemove={() => set("image", null)} />
              ) : (
                <Dropzone accept={options.image_formats} onFiles={(f) => selectImage(f[0])} title="Drop your logo here, or " />
              )}
              <Field label="Fit">
                <Segmented<Fit>
                  value={cfg.fit}
                  onChange={(v) => set("fit", v)}
                  options={[
                    { value: "cover", label: "Fill (crop)" },
                    { value: "contain", label: "Fit (pad)" },
                  ]}
                />
              </Field>
              <Field label="Background">
                <ColorField value={cfg.imageBg} onChange={(v) => set("imageBg", v)} allowTransparent />
              </Field>
            </>
          )}

          <Field label="Shape">
            <ShapePicker value={cfg[shapeKey]} onChange={(s) => set(shapeKey, s)} shapes={options.shapes} />
          </Field>
          {cfg.source !== "image" && cfg[shapeKey] !== "none" && cfg[bgKey] === "transparent" && (
            <p className="-mt-3 text-xs text-zinc-500">Pick a background color to see the shape.</p>
          )}

          {canDark && (
            <div className="space-y-4 rounded-2xl p-4 bg-white/[0.02] ring-1 ring-inset ring-white/[0.07]">
              <Switch checked={cfg.dark} onChange={(v) => set("dark", v)} label="Different colors in dark mode" />
              {cfg.dark && (
                <div className="grid sm:grid-cols-2 gap-3 animate-fade-up">
                  {cfg.source === "text" && (
                    <Field label="Dark text">
                      <ColorField value={cfg.darkFontColor} onChange={(v) => set("darkFontColor", v)} />
                    </Field>
                  )}
                  <Field label="Dark background">
                    <ColorField value={cfg.darkBg} onChange={(v) => set("darkBg", v)} allowTransparent />
                  </Field>
                </div>
              )}
            </div>
          )}

          <Field label="App name" htmlFor="fav-app" hint="optional">
            <input
              id="fav-app"
              value={cfg.appName}
              onChange={(e) => set("appName", e.target.value)}
              placeholder="My App"
              className={inputClass}
            />
          </Field>
        </div>

        {formError && <InlineError>{formError}</InlineError>}

        <PrimaryButton onClick={submit} icon={AppWindow}>
          Generate favicon pack
        </PrimaryButton>
      </div>
    </div>
  )
}
