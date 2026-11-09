"use client"

import { useState } from "react"
import { ArrowRight, Package, RotateCcw } from "lucide-react"
import Dropzone from "@/components/dropzone"
import SelectedFile from "@/components/selected-file"
import TaskView, { SuccessMark } from "@/components/task-view"
import DownloadButton from "@/components/download-button"
import { Field, InlineError, PrimaryButton, SecondaryButton, inputClass } from "@/components/controls"
import { useTask } from "@/hooks/use-task"
import { MAX_ZIP_FILES, postForm } from "@/lib/api"
import { formatSize, getStem, validateFile } from "@/lib/files"

interface Result {
  jobId: string
  fileCount: number
  downloadName: string
}

const fileKey = (f: File) => `${f.name}:${f.size}:${f.lastModified}`

export default function ZipTool() {
  const task = useTask<Result>()
  const [files, setFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [archiveName, setArchiveName] = useState("")

  const addFiles = (incoming: File[]) => {
    const problems: string[] = []
    const seen = new Set(files.map(fileKey))
    const next = [...files]

    for (const f of incoming) {
      if (seen.has(fileKey(f))) continue
      const err = validateFile(f, null)
      if (err) {
        problems.push(err)
        continue
      }
      if (next.length >= MAX_ZIP_FILES) {
        problems.push(`You can zip up to ${MAX_ZIP_FILES} files at once — some files weren't added.`)
        break
      }
      seen.add(fileKey(f))
      next.push(f)
    }

    setFiles(next)
    setErrors(problems)
  }

  const removeFile = (key: string) => {
    setFiles((list) => list.filter((f) => fileKey(f) !== key))
    setErrors([])
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)

  // Mirrors the backend's naming
  const downloadName = archiveName.trim()
    ? `${getStem(archiveName.trim())}.zip`
    : files.length === 1
      ? `${getStem(files[0].name)}.zip`
      : "archive.zip"

  const submit = () => {
    task.run(async (ctx) => {
      const body = new FormData()
      files.forEach((f) => body.append("files", f))
      if (archiveName.trim()) body.append("archive_name", archiveName.trim())

      const data = await postForm<{ job_id: string; file_count: number }>("/zip", body, ctx, "Couldn't create the zip")
      return { jobId: data.job_id, fileCount: data.file_count, downloadName }
    })
  }

  const startOver = () => {
    task.reset()
    setFiles([])
    setArchiveName("")
    setErrors([])
  }

  if (task.status !== "idle") {
    return (
      <TaskView
        tool="zip"
        status={task.status}
        progress={task.progress}
        error={task.error}
        onRetry={task.reset}
        title={{ uploading: `Uploading ${files.length} file${files.length === 1 ? "" : "s"}`, finished: "Your zip is ready" }}
        summary={
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] ring-1 ring-inset ring-white/10">
            <div className="flex -space-x-2">
              {files.slice(0, 3).map((f) => (
                <span
                  key={fileKey(f)}
                  className="grid place-items-center w-9 h-9 rounded-lg bg-zinc-900 ring-2 ring-zinc-950 text-[9px] font-mono uppercase text-zinc-400"
                >
                  {f.name.split(".").pop()?.slice(0, 4)}
                </span>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {files.length} file{files.length === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">{formatSize(totalSize)}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-500" />
            <span className="max-w-[40%] truncate px-2 py-1 rounded-md text-[11px] font-mono font-semibold text-amber-100 bg-amber-500/15 ring-1 ring-inset ring-amber-400/30">
              {downloadName}
            </span>
          </div>
        }
      >
        {task.result && (
          <div className="space-y-4">
            <SuccessMark
              label={
                <>
                  <span className="block truncate font-mono">{task.result.downloadName}</span>
                  <span className="text-xs text-zinc-500">
                    {task.result.fileCount} file{task.result.fileCount === 1 ? "" : "s"} compressed
                  </span>
                </>
              }
            />
            <DownloadButton path={`/download/${task.result.jobId}`} fileName={task.result.downloadName} label="Download zip" />
            <SecondaryButton onClick={startOver} icon={RotateCcw}>
              Zip more files
            </SecondaryButton>
          </div>
        )}
      </TaskView>
    )
  }

  return (
    <div className="space-y-5">
      {files.length === 0 ? (
        <Dropzone accept={null} multiple onFiles={addFiles} hint={<p className="text-xs text-zinc-400">Any file type · up to {MAX_ZIP_FILES} files</p>} />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>
              <span className="text-zinc-200 font-medium">{files.length}</span> / {MAX_ZIP_FILES} files ·{" "}
              {formatSize(totalSize)}
            </span>
            <button onClick={() => setFiles([])} className="hover:text-rose-300 transition-colors">
              Clear all
            </button>
          </div>
          <ul className="space-y-1.5 max-h-64 overflow-y-auto pr-1 -mr-1 [scrollbar-width:thin]">
            {files.map((f) => (
              <li key={fileKey(f)}>
                <SelectedFile file={f} size="sm" onRemove={() => removeFile(fileKey(f))} />
              </li>
            ))}
          </ul>
          <Dropzone accept={null} multiple compact onFiles={addFiles} />
        </div>
      )}

      {errors.length > 0 && (
        <InlineError>
          {errors.length === 1 ? (
            errors[0]
          ) : (
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </InlineError>
      )}

      {files.length > 0 && (
        <>
          <Field label="Archive name" htmlFor="archive-name">
            <div className="relative">
              <input
                id="archive-name"
                value={archiveName}
                onChange={(e) => setArchiveName(e.target.value)}
                placeholder={getStem(downloadName)}
                className={`${inputClass} pr-12`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-mono text-zinc-500">.zip</span>
            </div>
          </Field>

          <PrimaryButton onClick={submit} icon={Package}>
            Create zip · {files.length} file{files.length === 1 ? "" : "s"}
          </PrimaryButton>
        </>
      )}
    </div>
  )
}
