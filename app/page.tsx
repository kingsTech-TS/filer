"use client"

import { useState } from "react"
import FileUploader from "@/components/file-uploader"
import ProgressBar from "@/components/progress-bar"
import StatusBadge from "@/components/status-badge"
import DownloadButton from "@/components/download-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "finished" | "failed">("idle")
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null)
  const [progress, setProgress] = useState(0)

  const handleUploadStart = (file: { name: string; size: number }) => {
    setUploadedFile(file)
    setStatus("uploading")
    setProgress(0)
  }

  const handleConversionStart = (newJobId: string) => {
    setJobId(newJobId)
    setStatus("processing")
    setProgress(0)
  }

  const handleStatusUpdate = (newStatus: "uploading" | "processing" | "finished" | "failed", newProgress: number) => {
    setStatus(newStatus)
    setProgress(newProgress)
  }

  const handleReset = () => {
    setJobId(null)
    setStatus("idle")
    setUploadedFile(null)
    setProgress(0)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4 dark">
      <div className="w-full max-w-md">
        <Card className="border-border/50 shadow-xl backdrop-blur">
          <CardHeader className="space-y-2">
            <CardTitle className="text-3xl font-bold text-center">File Converter</CardTitle>
            <CardDescription className="text-center text-base">
              Convert files instantly to your desired format
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {status === "idle" ? (
              <FileUploader
                onUploadStart={handleUploadStart}
                onConversionStart={handleConversionStart}
                onStatusUpdate={handleStatusUpdate}
              />
            ) : (
              <div className="space-y-6">
                {uploadedFile && (
                  <div className="p-3 bg-secondary/10 rounded-lg border border-border/50">
                    <p className="text-sm font-medium text-foreground">{uploadedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {status === "uploading"
                        ? "Uploading"
                        : status === "processing"
                          ? "Processing"
                          : status === "finished"
                            ? "Complete"
                            : "Failed"}
                    </span>
                    <StatusBadge status={status} />
                  </div>
                  <ProgressBar progress={progress} status={status} />
                </div>

                {status === "finished" && jobId && (
                  <div className="space-y-3">
                    <DownloadButton jobId={jobId} />
                    <button
                      onClick={handleReset}
                      className="w-full px-4 py-2 text-sm font-medium text-foreground bg-secondary/20 hover:bg-secondary/30 rounded-lg transition-colors duration-200 border border-border/50"
                    >
                      Convert Another File
                    </button>
                  </div>
                )}

                {status === "failed" && (
                  <div className="space-y-3">
                    <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/30">
                      <p className="text-sm text-destructive font-medium">Conversion failed. Please try again.</p>
                    </div>
                    <button
                      onClick={handleReset}
                      className="w-full px-4 py-2 text-sm font-medium text-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors duration-200"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
