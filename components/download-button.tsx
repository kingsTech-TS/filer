"use client"

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DownloadButtonProps {
  jobId: string
}

export default function DownloadButton({ jobId }: DownloadButtonProps) {
  const handleDownload = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const response = await fetch(`${apiUrl}/download/${jobId}`)

      if (!response.ok) throw new Error("Download failed")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `converted-file-${jobId}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Download error:", error)
    }
  }

  return (
    <Button onClick={handleDownload} className="w-full bg-green-600 hover:bg-green-700 transition-colors" size="lg">
      <Download className="w-4 h-4 mr-2" />
      Download Converted File
    </Button>
  )
}
