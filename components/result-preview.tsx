"use client"

import { useEffect, useState } from "react"
import { API_URL } from "@/lib/api"

/** Shows the finished background-removal PNG on a transparency checkerboard. */
export default function ResultPreview({ jobId }: { jobId: string }) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let url: string | null = null
    let cancelled = false

    fetch(`${API_URL}/download/${jobId}`)
      .then((res) => (res.ok ? res.blob() : Promise.reject()))
      .then((blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setSrc(url)
      })
      .catch(() => !cancelled && setFailed(true))

    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [jobId])

  if (failed) return null

  return (
    <div className="animate-fade-up relative overflow-hidden rounded-2xl bg-checker ring-1 ring-white/10 aspect-[4/3] grid place-items-center">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Background removed result" className="max-h-full max-w-full object-contain p-3" />
      ) : (
        <div className="absolute inset-0 bg-white/5 animate-pulse" />
      )}
    </div>
  )
}
