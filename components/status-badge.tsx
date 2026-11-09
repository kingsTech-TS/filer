"use client"

import { CheckCircle2, AlertCircle, LoaderCircle, CloudUpload } from "lucide-react"

interface StatusBadgeProps {
  status: "uploading" | "processing" | "finished" | "failed"
}

const CONFIG = {
  uploading: {
    icon: CloudUpload,
    label: "Uploading",
    className: "bg-sky-500/10 text-sky-300 ring-sky-400/25",
    iconClass: "animate-pulse",
  },
  processing: {
    icon: LoaderCircle,
    label: "Processing",
    className: "bg-violet-500/10 text-violet-300 ring-violet-400/25",
    iconClass: "animate-spin",
  },
  finished: {
    icon: CheckCircle2,
    label: "Done",
    className: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/25",
    iconClass: "",
  },
  failed: {
    icon: AlertCircle,
    label: "Failed",
    className: "bg-rose-500/10 text-rose-300 ring-rose-400/25",
    iconClass: "",
  },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { icon: Icon, label, className, iconClass } = CONFIG[status]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      <Icon className={`w-3.5 h-3.5 ${iconClass}`} />
      {label}
    </span>
  )
}
