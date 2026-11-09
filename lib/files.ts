import { FileText, Film, Image as ImageIcon, Music, File as FileIcon, type LucideIcon } from "lucide-react"

export function getExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? ""
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

const KIND: Record<string, { icon: LucideIcon; tint: string }> = {
  doc: { icon: FileText, tint: "from-sky-500/25 to-blue-600/10 text-sky-300 ring-sky-400/30" },
  image: { icon: ImageIcon, tint: "from-fuchsia-500/25 to-pink-600/10 text-fuchsia-300 ring-fuchsia-400/30" },
  audio: { icon: Music, tint: "from-amber-500/25 to-orange-600/10 text-amber-300 ring-amber-400/30" },
  video: { icon: Film, tint: "from-emerald-500/25 to-teal-600/10 text-emerald-300 ring-emerald-400/30" },
  other: { icon: FileIcon, tint: "from-zinc-500/25 to-zinc-600/10 text-zinc-300 ring-zinc-400/30" },
}

export function getFileKind(ext: string) {
  if (["pdf", "doc", "docx"].includes(ext)) return KIND.doc
  if (["png", "jpg", "jpeg", "webp"].includes(ext)) return KIND.image
  if (["mp3"].includes(ext)) return KIND.audio
  if (["mp4"].includes(ext)) return KIND.video
  return KIND.other
}

export function isImage(ext: string) {
  return ["png", "jpg", "jpeg", "webp"].includes(ext)
}
