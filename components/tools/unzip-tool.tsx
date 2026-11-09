"use client"

import { useMemo, useState } from "react"
import { PackageOpen, RotateCcw, Search } from "lucide-react"
import Dropzone from "@/components/dropzone"
import SelectedFile from "@/components/selected-file"
import TaskView from "@/components/task-view"
import FileBadge from "@/components/file-badge"
import { DownloadIconButton } from "@/components/download-button"
import { InlineError, PrimaryButton, SecondaryButton, inputClass } from "@/components/controls"
import { useTask } from "@/hooks/use-task"
import { postForm } from "@/lib/api"
import { formatSize, getExtension, validateFile } from "@/lib/files"

interface ExtractedFile {
  index: number
  path: string
  name: string
  size: number
  download_url: string
}

interface Result {
  jobId: string
  files: ExtractedFile[]
}

function folderOf(path: string) {
  const i = path.lastIndexOf("/")
  return i > 0 ? path.slice(0, i) : ""
}

export default function UnzipTool() {
  const task = useTask<Result>()
  const [file, setFile] = useState<File | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [filter, setFilter] = useState("")

  const selectFile = (f: File) => {
    const err = validateFile(f, ["zip"])
    setValidationError(err)
    if (!err) setFile(f)
  }

  const submit = () => {
    if (!file) return
    task.run(async (ctx) => {
      const body = new FormData()
      body.append("file", file)
      const data = await postForm<{ job_id: string; files: ExtractedFile[] }>("/unzip", body, ctx, "Couldn't open that zip")
      return { jobId: data.job_id, files: data.files }
    })
  }

  const startOver = () => {
    task.reset()
    setFile(null)
    setFilter("")
  }

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const list = task.result?.files ?? []
    return q ? list.filter((f) => f.path.toLowerCase().includes(q)) : list
  }, [task.result, filter])

  if (task.status !== "idle") {
    const files = task.result?.files ?? []
    const total = files.reduce((s, f) => s + f.size, 0)

    return (
      <TaskView
        tool="unzip"
        status={task.status}
        progress={task.progress}
        error={task.error}
        onRetry={task.reset}
        title={{ uploading: "Uploading your zip", finished: `${files.length} file${files.length === 1 ? "" : "s"} extracted` }}
        summary={file && task.status !== "finished" && <SelectedFile file={file} />}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span className="truncate">
              From <span className="text-zinc-300">{file?.name}</span>
            </span>
            <span className="shrink-0">{formatSize(total)} total</span>
          </div>

          {files.length > 8 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={`Search ${files.length} files`}
                className={`${inputClass} pl-9`}
              />
            </div>
          )}

          <ul className="space-y-1.5 max-h-80 overflow-y-auto pr-1 -mr-1 [scrollbar-width:thin]">
            {visible.map((f, i) => {
              const folder = folderOf(f.path)
              return (
                <li
                  key={f.index}
                  className="animate-fade-up flex items-center gap-3 px-2.5 py-2 rounded-xl bg-white/[0.03] ring-1 ring-inset ring-white/[0.07] hover:bg-white/[0.06] transition-colors"
                  style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
                >
                  <FileBadge ext={getExtension(f.name)} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-zinc-100">{f.name}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {folder && <span className="font-mono">{folder}/ · </span>}
                      {formatSize(f.size)}
                    </p>
                  </div>
                  <DownloadIconButton path={f.download_url} fileName={f.name} />
                </li>
              )
            })}
            {visible.length === 0 && <p className="py-4 text-center text-sm text-zinc-500">No files match “{filter}”.</p>}
          </ul>

          <SecondaryButton onClick={startOver} icon={RotateCcw}>
            Unzip another file
          </SecondaryButton>
        </div>
      </TaskView>
    )
  }

  return (
    <div className="space-y-5">
      {file ? (
        <SelectedFile file={file} onRemove={() => setFile(null)} />
      ) : (
        <Dropzone accept={["zip"]} onFiles={(f) => selectFile(f[0])} icon={PackageOpen} title="Drop a .zip here, or " />
      )}

      {validationError && <InlineError>{validationError}</InlineError>}

      {file && (
        <PrimaryButton onClick={submit} icon={PackageOpen}>
          Extract files
        </PrimaryButton>
      )}
    </div>
  )
}
