"use client"

import { CheckCircle2, AlertCircle, Loader2, UploadCloud } from "lucide-react"

interface StatusBadgeProps {
  status: "uploading" | "processing" | "finished" | "failed"
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig = {
    uploading: {
      icon: UploadCloud,
      label: "Uploading",
      className: "text-blue-400",
    },
    processing: {
      icon: Loader2,
      label: "Processing",
      className: "text-primary animate-spin",
    },
    finished: {
      icon: CheckCircle2,
      label: "Finished",
      className: "text-green-500",
    },
    failed: {
      icon: AlertCircle,
      label: "Failed",
      className: "text-destructive",
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`w-4 h-4 ${config.className}`} />
      <span className="text-xs font-medium text-muted-foreground">{config.label}</span>
    </div>
  )
}
