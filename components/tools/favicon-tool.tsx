"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { AppWindow, FileType, Image as ImageIcon, Moon, Pencil, RotateCcw, Smile, Sun, Type, Upload } from "lucide-react"
import Dropzone from "@/components/dropzone"
import SelectedFile from "@/components/selected-file"
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
type FontSource = "google" | "upload"

interface Options {
  shapes: Shape[]
  max_text_length: number
  font_weights: number[]
  image_formats: string[]
  suggested_fonts: string[]
  font_file_formats: string[]
  max_font_file_mb: number
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
  font_file_formats: ["ttf", "otf", "ttc", "woff", "woff2"],
  max_font_file_mb: 5,
}

const QUICK_EMOJI = ["🚀", "🔥", "⚡", "🎨", "💡", "📁", "🌈", "🍕", "🐱", "⭐", "❤️", "✅"]

interface Config {
  source: Source
  appName: string
  // text
  text: string
  fontSource: FontSource
  fontFile: File | null
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
  fontSource: "google",
  fontFile: null,
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

let uploadedFontCount = 0

/** Registers an uploaded font file with the browser for the live preview; returns its CSS family name. */
function useUploadedFont(file: File | null) {
  const [family, setFamily] = useState<string | null>(null)

  useEffect(() => {
    if (!file) return
    let cancelled = false
    const url = URL.createObjectURL(file)
    const face = new FontFace(`filer-upload-${++uploadedFontCount}`, `url(${url})`)
    face
      .load()
      .then((loaded) => {
        if (cancelled) return
        document.fonts.add(loaded)
        setFamily(loaded.family)
      })
      .catch(() => {
        // The browser can't preview it (e.g. a .ttc); the server may still render it
      })
    return () => {
      cancelled = true
      document.fonts.delete(face)
      URL.revokeObjectURL(url)
      setFamily(null)
    }
  }, [file])

  return family
}

/** Share of the icon's width that text may fill before it's shrunk (matches filer-api). */
const textMaxWidth = (shape: Shape) => (ROUND_SHAPES.includes(shape) ? 0.78 : 0.9)

/**
 * Ink width of the text per 1px of font size, measured with the real font so the preview
 * fits text exactly like the server does. Falls back to a rough estimate.
 */
function measureTextRatio(text: string, family: string, weight: number, italic: boolean): number {
  const fallback = Math.max(text.length, 1) * 0.62
  if (typeof document === "undefined" || !text) return fallback
  const ctx = document.createElement("canvas").getContext("2d")
  if (!ctx) return fallback
  ctx.font = `${italic ? "italic " : ""}${weight} 100px "${family}", ui-sans-serif, system-ui`
  const m = ctx.measureText(text)
  const ink = m.actualBoundingBoxLeft + m.actualBoundingBoxRight
  return ink > 0 ? ink / 100 : fallback
}

/** Changes whenever the browser finishes loading fonts, so text can be re-measured. */
function useFontsLoaded() {
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const onLoad = () => setVersion((v) => v + 1)
    document.fonts.addEventListener("loadingdone", onLoad)
    return () => document.fonts.removeEventListener("loadingdone", onLoad)
  }, [])
  return version
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
    // fontSize has already been fitted to the shape (see maxTextPercent)
    const px = (size * cfg.fontSize) / 100
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
              active ? "bg-violet-500/15 ring-violet-400/60" : "bg-tint/[0.03] ring-tint/10 hover:bg-tint/[0.06]"
            }`}
          >
            <span
              className={`w-6 h-6 ${s === "none" ? "border border-dashed border-fg-subtle rounded-md" : active ? "bg-violet-300" : "bg-fg-subtle group-hover:bg-fg-3"} transition-colors`}
              style={s === "none" ? undefined : shapeStyle(s)}
            />
            <span className={`text-[10px] capitalize ${active ? "text-violet-100" : "text-fg-subtle"}`}>{s}</span>
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

type Theme = "light" | "dark"

/** Backdrop the icon is previewed on, matching a light or dark browser. */
const SURFACE: Record<Theme, string> = {
  light: "bg-zinc-100 ring-black/5",
  dark: "bg-zinc-900 ring-white/10",
}

function ThemeToggle({ value, onChange }: { value: Theme; onChange: (t: Theme) => void }) {
  return (
    <div role="radiogroup" aria-label="Preview theme" className="inline-flex p-0.5 rounded-lg bg-tint/[0.04] ring-1 ring-inset ring-tint/10">
      {(
        [
          ["light", Sun, "Light"],
          ["dark", Moon, "Dark"],
        ] as const
      ).map(([t, Icon, label]) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={value === t}
          onClick={() => onChange(t)}
          className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-medium transition-colors ${
            value === t ? "bg-tint/10 text-fg" : "text-fg-subtle hover:text-fg-2"
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  )
}

// ---------------- Component ----------------
export default function FaviconTool() {
  const task = useTask<Result>()
  const [cfg, setCfg] = useState<Config>(DEFAULT_CONFIG)
  const [options, setOptions] = useState<Options>(DEFAULT_OPTIONS)
  const [formError, setFormError] = useState<string | null>(null)
  const [previewTheme, setPreviewTheme] = useState<Theme>("light")

  const set = <K extends keyof Config>(key: K, value: Config[K]) => setCfg((c) => ({ ...c, [key]: value }))

  useEffect(() => {
    const controller = new AbortController()
    getJson<Partial<Options>>("/favicon/options", controller.signal)
      .then((o) => setOptions((d) => ({ ...d, ...o })))
      .catch(() => {})
    return () => controller.abort()
  }, [])

  const usingUploadedFont = cfg.source === "text" && cfg.fontSource === "upload"
  useGoogleFont(cfg.fontSource === "google" ? cfg.font : "", cfg.weight, cfg.italic)
  const uploadedFamily = useUploadedFont(cfg.fontSource === "upload" ? cfg.fontFile : null)

  // What the preview draws with: an uploaded font carries its own weight and style
  const fontCfg: Config =
    cfg.fontSource === "upload"
      ? { ...cfg, font: uploadedFamily ?? "ui-sans-serif", weight: 400, italic: false }
      : cfg

  // Text is shrunk to fit its shape, so past this size the slider has no effect
  const fontsVersion = useFontsLoaded()
  const textRatio = useMemo(
    () => {
      void fontsVersion // re-measure once fonts finish loading
      return measureTextRatio(cfg.text.trim(), fontCfg.font, fontCfg.weight, fontCfg.italic)
    },
    [cfg.text, fontCfg.font, fontCfg.weight, fontCfg.italic, fontsVersion],
  )
  const maxTextPercent = (textMaxWidth(cfg.textShape) / textRatio) * 100
  const textCapped = cfg.source === "text" && cfg.fontSize > maxTextPercent + 0.5
  const previewCfg: Config = { ...fontCfg, fontSize: Math.min(cfg.fontSize, maxTextPercent) }

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

  const selectFontFile = (f: File) => {
    let err = validateFile(f, options.font_file_formats)
    if (!err && f.size > options.max_font_file_mb * 1024 * 1024) {
      err = `${f.name} is ${formatSize(f.size)} — fonts can be up to ${options.max_font_file_mb} MB.`
    }
    setFormError(err)
    if (!err) set("fontFile", f)
  }

  const canDark = cfg.source !== "image"
  const showDark = canDark && cfg.dark

  const submit = () => {
    if (cfg.source === "text" && !cfg.text.trim()) return setFormError("Type 1–4 characters for your icon.")
    if (usingUploadedFont && !cfg.fontFile) return setFormError("Choose a font file, or switch back to Google Fonts.")
    if (cfg.source === "emoji" && !cfg.emoji.trim()) return setFormError("Pick an emoji for your icon.")
    if (cfg.source === "image" && !cfg.image) return setFormError("Choose an image for your icon.")
    setFormError(null)

    task.run(async (ctx) => {
      const body = new FormData()
      if (cfg.appName.trim()) body.append("app_name", cfg.appName.trim())

      if (cfg.source === "text") {
        body.append("text", cfg.text.trim())
        body.append("shape", cfg.textShape)
        if (usingUploadedFont && cfg.fontFile) {
          body.append("font_file", cfg.fontFile)
        } else {
          body.append("font_family", cfg.font.trim() || "Roboto")
          body.append("font_weight", String(cfg.weight))
          body.append("italic", String(cfg.italic))
        }
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
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-tint/[0.04] ring-1 ring-inset ring-tint/10">
              <div className="grid place-items-center w-11 h-11 rounded-xl bg-checker overflow-hidden">
                <IconArt cfg={previewCfg} size={36} imageUrl={imageUrl} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{appTitle}</p>
                <p className="text-xs text-fg-subtle">Favicon from {cfg.source}</p>
              </div>
            </div>
          )
        }
      >
        {task.result && (
          <div className="space-y-6">
            {/* Tab previews */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <BrowserTab theme="light" title={appTitle} icon={lightTab && <img src={lightTab} alt="" className="w-4 h-4" />} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <BrowserTab theme="dark" title={appTitle} icon={darkTab && <img src={darkTab} alt="" className="w-4 h-4" />} />
            </div>

            {/* Icon sizes */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-fg-subtle">Icons</span>
                <ThemeToggle value={previewTheme} onChange={setPreviewTheme} />
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {icons.map((f, i) => (
                  <div
                    key={f.index}
                    className="group animate-fade-up relative flex flex-col items-center gap-2 p-3 rounded-xl bg-tint/[0.03] ring-1 ring-inset ring-tint/[0.07]"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className={`grid place-items-center w-16 h-16 rounded-lg ring-1 ring-inset transition-colors duration-300 ${SURFACE[previewTheme]}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url(f)}
                        alt={f.name}
                        style={{ width: Math.min(f.width!, 56), height: Math.min(f.height!, 56), imageRendering: f.width! <= 32 ? "pixelated" : "auto" }}
                      />
                    </div>
                    <div className="w-full text-center">
                      <p className="text-[11px] font-mono text-fg-3">
                        {f.width}×{f.height}
                      </p>
                      <p className="truncate text-[10px] text-fg-subtle" title={f.name}>
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
                    <li key={f.index} className="flex items-center gap-3 px-2.5 py-1.5 rounded-xl bg-tint/[0.03] ring-1 ring-inset ring-tint/[0.07]">
                      <FileBadge ext={getExtension(f.name)} size="sm" />
                      <span className="flex-1 truncate text-sm font-mono text-fg-3">{f.name}</span>
                      <span className="text-xs text-fg-subtle">{formatSize(f.size)}</span>
                      <DownloadIconButton path={f.download_url} fileName={f.name} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* HTML */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-fg-subtle">Add to your &lt;head&gt;</span>
                <CopyButton text={task.result.html} />
              </div>
              <pre className="overflow-x-auto rounded-xl p-4 text-xs leading-relaxed font-mono text-fg-3 bg-tint/[0.04] dark:bg-black/40 ring-1 ring-inset ring-tint/10 [scrollbar-width:thin]">
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
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-fg-subtle">Preview</span>
            <ThemeToggle value={previewTheme} onChange={setPreviewTheme} />
          </div>
          <div
            className={`grid place-items-center aspect-square rounded-2xl ring-1 ring-inset p-6 transition-colors duration-300 ${SURFACE[previewTheme]}`}
          >
            <div key={`${cfg.source}-${previewTheme}`} className="animate-pop-in">
              <IconArt cfg={previewCfg} size={128} variant={previewTheme} imageUrl={imageUrl} />
            </div>
          </div>
          <div
            className={`flex items-end justify-center gap-4 rounded-xl p-3 ring-1 ring-inset transition-colors duration-300 ${SURFACE[previewTheme]}`}
          >
            {[48, 32, 16].map((s) => (
              <div key={s} className="flex flex-col items-center gap-1.5">
                <IconArt cfg={previewCfg} size={s} variant={previewTheme} imageUrl={imageUrl} />
                <span className="text-[10px] font-mono text-fg-subtle">{s}px</span>
              </div>
            ))}
          </div>
          <BrowserTab theme="light" title={appTitle} icon={<IconArt cfg={previewCfg} size={16} imageUrl={imageUrl} />} />
          <BrowserTab theme="dark" title={appTitle} icon={<IconArt cfg={previewCfg} size={16} variant="dark" imageUrl={imageUrl} />} />
          {previewTheme === "dark" && canDark && !showDark && (
            <p className="animate-fade-up text-[11px] text-fg-muted text-center">
              Same colors as light mode.{" "}
              <button type="button" onClick={() => set("dark", true)} className="text-violet-300 hover:underline underline-offset-2">
                Customize dark mode
              </button>
            </p>
          )}
          {previewTheme === "dark" && cfg.source === "image" && (
            <p className="animate-fade-up text-[11px] text-fg-muted text-center">Image icons use the same design in both themes.</p>
          )}
          <p className="text-[11px] text-center text-fg-faint">Live preview — final icons are rendered on the server.</p>
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

              <Field label="Font">
                <Segmented<FontSource>
                  value={cfg.fontSource}
                  onChange={(v) => {
                    set("fontSource", v)
                    setFormError(null)
                  }}
                  options={[
                    { value: "google", label: "Google Fonts", icon: Type },
                    { value: "upload", label: "Upload font", icon: Upload },
                  ]}
                />
              </Field>

              {cfg.fontSource === "google" ? (
                <div key="google-font" className="space-y-5 animate-fade-up">
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
                          <option key={w} value={w} className="bg-sunken">
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
                          cfg.font === f ? "bg-violet-500/15 ring-violet-400/50 text-violet-100" : "ring-tint/10 text-fg-subtle hover:text-fg-2"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <Switch checked={cfg.italic} onChange={(v) => set("italic", v)} label="Italic" />
                </div>
              ) : (
                <div key="upload-font" className="space-y-2 animate-fade-up">
                  {cfg.fontFile ? (
                    <SelectedFile
                      file={cfg.fontFile}
                      onRemove={() => set("fontFile", null)}
                      aside={
                        uploadedFamily && (
                          <span className="hidden sm:inline text-lg text-fg-2" style={{ fontFamily: `"${uploadedFamily}"` }}>
                            Aa
                          </span>
                        )
                      }
                    />
                  ) : (
                    <Dropzone
                      accept={options.font_file_formats}
                      onFiles={(f) => selectFontFile(f[0])}
                      icon={FileType}
                      title="Drop your font here, or "
                      hint={
                        <p className="text-xs text-fg-muted">
                          {options.font_file_formats.map((e) => `.${e}`).join(", ")} · up to {options.max_font_file_mb} MB
                        </p>
                      }
                    />
                  )}
                  <p className="text-xs text-fg-subtle">
                    Weight and style come from the font file. Only use fonts you have the rights to — the file is used
                    to draw your icon and isn&apos;t kept.
                  </p>
                </div>
              )}

              <Field
                label="Text size"
                htmlFor="fav-size"
                hint={
                  textCapped ? (
                    <span className="text-amber-300/90" title="Larger sizes are shrunk so the text fits inside the icon">
                      {cfg.fontSize}% · fits up to {Math.floor(maxTextPercent)}%
                    </span>
                  ) : (
                    `${cfg.fontSize}%`
                  )
                }
              >
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
                      cfg.emoji === e ? "bg-violet-500/20 ring-1 ring-inset ring-violet-400/60" : "hover:bg-tint/5"
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
            <p className="-mt-3 text-xs text-fg-subtle">Pick a background color to see the shape.</p>
          )}

          {canDark && (
            <div className="space-y-4 rounded-2xl p-4 bg-tint/[0.02] ring-1 ring-inset ring-tint/[0.07]">
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
