"use client"

interface ProgressBarProps {
  progress: number
  status: "uploading" | "processing" | "finished" | "failed"
}

export default function ProgressBar({ progress, status }: ProgressBarProps) {
  const getBarColor = () => {
    if (status === "finished") return "bg-green-500"
    if (status === "failed") return "bg-destructive"
    return "bg-primary"
  }

  return (
    <div className="w-full h-2 bg-secondary/20 rounded-full overflow-hidden border border-border/30">
      <div
        className={`h-full ${getBarColor()} transition-all duration-500 ease-out`}
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  )
}
