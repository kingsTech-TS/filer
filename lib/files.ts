import {
  File as FileIcon,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  FileText,
  Film,
  Image as ImageIcon,
  Music,
  Presentation,
  type LucideIcon,
} from "lucide-react"
import { MAX_FILE_SIZE_MB } from "@/lib/api"

export function getExtension(name: string) {
  const i = name.lastIndexOf(".")
  return i > 0 ? name.slice(i + 1).toLowerCase() : ""
}

export function getStem(name: string) {
  const i = name.lastIndexOf(".")
  return i > 0 ? name.slice(0, i) : name
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const KINDS = {
  doc: { icon: FileText, tint: "from-sky-500/25 to-blue-600/10 text-sky-300 ring-sky-400/30" },
  code: { icon: FileCode, tint: "from-cyan-500/25 to-sky-600/10 text-cyan-300 ring-cyan-400/30" },
  sheet: { icon: FileSpreadsheet, tint: "from-green-500/25 to-emerald-600/10 text-green-300 ring-green-400/30" },
  slides: { icon: Presentation, tint: "from-orange-500/25 to-red-600/10 text-orange-300 ring-orange-400/30" },
  image: { icon: ImageIcon, tint: "from-fuchsia-500/25 to-pink-600/10 text-fuchsia-300 ring-fuchsia-400/30" },
  audio: { icon: Music, tint: "from-amber-500/25 to-orange-600/10 text-amber-300 ring-amber-400/30" },
  video: { icon: Film, tint: "from-emerald-500/25 to-teal-600/10 text-emerald-300 ring-emerald-400/30" },
  archive: { icon: FileArchive, tint: "from-yellow-500/25 to-amber-600/10 text-yellow-200 ring-yellow-400/30" },
  other: { icon: FileIcon, tint: "from-zinc-500/25 to-zinc-600/10 text-zinc-300 ring-zinc-400/30" },
} satisfies Record<string, { icon: LucideIcon; tint: string }>

const EXT_KIND: Record<string, keyof typeof KINDS> = {
  pdf: "doc", doc: "doc", docx: "doc", wps: "doc", txt: "doc", odt: "doc", rtf: "doc",
  html: "code", md: "code", json: "code", xml: "code", webmanifest: "code",
  csv: "sheet", xls: "sheet", xlsm: "sheet", xlsx: "sheet", ods: "sheet",
  ppt: "slides", pptx: "slides", odp: "slides",
  png: "image", jpg: "image", jpeg: "image", webp: "image", svg: "image", gif: "image", bmp: "image", ico: "image", heic: "image", tiff: "image",
  mp3: "audio", wav: "audio", wma: "audio", aac: "audio", flac: "audio", ogg: "audio", m4a: "audio",
  mp4: "video", mov: "video", avi: "video", mkv: "video", webm: "video",
  zip: "archive", rar: "archive", "7z": "archive", tar: "archive", gz: "archive",
}

export type FileKind = keyof typeof KINDS

export function getKindName(ext: string): FileKind {
  return EXT_KIND[ext] ?? "other"
}

export function getFileKind(ext: string) {
  return KINDS[getKindName(ext)]
}

export function isImage(ext: string) {
  return ["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"].includes(ext)
}

/** Returns an error message, or null if the file is OK. `allowed` null = any type. */
export function validateFile(file: File, allowed: string[] | null): string | null {
  const ext = getExtension(file.name)
  if (allowed && !allowed.includes(ext)) {
    return `${ext ? `.${ext} files aren't` : "That file isn't"} supported here. Try ${formatList(allowed)}.`
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `${file.name} is ${formatSize(file.size)} — the limit is ${MAX_FILE_SIZE_MB} MB per file.`
  }
  return null
}

export function formatList(exts: string[]) {
  const upper = exts.map((e) => e.toUpperCase())
  return upper.length > 1 ? `${upper.slice(0, -1).join(", ")} or ${upper.at(-1)}` : (upper[0] ?? "")
}
