"use client"

import type React from "react"

import { useRef, useState } from "react"
import { Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FileUploaderProps {
  onUploadStart: (file: { name: string; size: number }) => void
  onConversionStart: (jobId: string) => void
  onStatusUpdate: (status: "uploading" | "processing" | "finished" | "failed", progress: number) => void
}

const OUTPUT_FORMATS = ["pdf", "docx", "png", "jpg", "mp3", "mp4"]

export default function FileUploader({ onUploadStart, onConversionStart, onStatusUpdate }: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<string>("pdf")
  const [isConverting, setIsConverting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(e.type === "dragenter" || e.type === "dragover")
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleConvert = async () => {
    if (!selectedFile) return

    try {
      setIsConverting(true)
      onUploadStart({ name: selectedFile.name, size: selectedFile.size })

      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("output_format", selectedFormat)

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const response = await fetch(`${apiUrl}/convert`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Conversion request failed")

      const data = await response.json()
      const jobId = data.job_id

      onConversionStart(jobId)

      // Poll for progress
      const pollInterval = setInterval(async () => {
        try {
          const progressResponse = await fetch(`${apiUrl}/progress/${jobId}`)
          const progressData = await progressResponse.json()

          if (progressData.status === "finished") {
            clearInterval(pollInterval)
            onStatusUpdate("finished", 100)
          } else if (progressData.status === "failed") {
            clearInterval(pollInterval)
            onStatusUpdate("failed", 0)
          } else {
            const progress = progressData.progress || 50
            onStatusUpdate("processing", progress)
          }
        } catch (error) {
          console.error("Error polling progress:", error)
        }
      }, 2000)
    } catch (error) {
      console.error("Conversion error:", error)
      onStatusUpdate("failed", 0)
    } finally {
      setIsConverting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Drag and Drop Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 cursor-pointer ${
          dragActive ? "border-primary/60 bg-primary/5" : "border-border/50 bg-secondary/5 hover:border-border"
        }`}
      >
        <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />

        {selectedFile ? (
          <div className="space-y-2">
            <div className="text-primary text-2xl">✓</div>
            <p className="font-medium text-foreground text-sm break-words">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            <button
              onClick={() => setSelectedFile(null)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-2 inline-flex items-center gap-1"
            >
              <X size={14} /> Change File
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground text-sm">Drag and drop your file here</p>
              <p className="text-xs text-muted-foreground">or click to browse</p>
            </div>
          </div>
        )}

        <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 opacity-0 cursor-pointer" />
      </div>

      {/* Format Selection */}
      {selectedFile && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Output Format</label>
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            disabled={isConverting}
            className="w-full px-3 py-2 bg-secondary/20 border border-border/50 rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {OUTPUT_FORMATS.map((format) => (
              <option key={format} value={format} className="bg-background">
                {format.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Convert Button */}
      {selectedFile && (
        <Button
          onClick={handleConvert}
          disabled={isConverting || !selectedFile}
          className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          size="lg"
        >
          {isConverting ? "Converting..." : "Convert File"}
        </Button>
      )}
    </div>
  )
}
