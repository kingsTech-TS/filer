import { getFileKind } from "@/lib/files"

interface FileBadgeProps {
  ext: string
  size?: "sm" | "md" | "lg"
}

const SIZES = {
  sm: "w-9 h-9 rounded-lg [&_svg]:w-4 [&_svg]:h-4",
  md: "w-11 h-11 rounded-xl [&_svg]:w-5 [&_svg]:h-5",
  lg: "w-14 h-14 rounded-2xl [&_svg]:w-6 [&_svg]:h-6",
}

export default function FileBadge({ ext, size = "md" }: FileBadgeProps) {
  const { icon: Icon, tint } = getFileKind(ext)
  return (
    <div
      className={`relative shrink-0 grid place-items-center bg-gradient-to-br ring-1 ring-inset ${tint} ${SIZES[size]}`}
    >
      <Icon />
    </div>
  )
}
