export const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://filer-api.onrender.com"

// Must match MAX_FILE_SIZE_MB in filer-api (25)
export const MAX_FILE_SIZE_MB = Number(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB) || 25

// Must match MAX_ZIP_FILES in filer-api (50)
export const MAX_ZIP_FILES = Number(process.env.NEXT_PUBLIC_MAX_ZIP_FILES) || 50

/** An error whose message is safe to show to the user. */
export class ApiError extends Error {}

/** Pulls a FastAPI error message out of already-parsed JSON. */
export function errorFromData(data: unknown, fallback: string): string {
  const d = data as { detail?: unknown; error?: unknown } | null
  if (typeof d?.detail === "string") return d.detail
  if (typeof d?.error === "string") return d.error
  return fallback
}

/** Extracts FastAPI's `detail` (or `error`) message from a failed response. */
export async function getErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    return errorFromData(await response.json(), fallback)
  } catch {
    return fallback
  }
}

/** Turns any thrown value into a message for the user. */
export function toUserMessage(error: unknown): string {
  if (error instanceof TypeError) {
    return "Could not reach the server. It may be waking up — please try again in a moment."
  }
  if (error instanceof Error && error.message) return error.message
  return "Something went wrong. Please try again."
}

export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { signal })
  if (!res.ok) throw new ApiError(await getErrorMessage(res, "Request failed"))
  return res.json()
}

export interface UploadOptions {
  /** Upload progress, 0–100. */
  onProgress?: (percent: number) => void
  /** Fires once the request body is fully sent and the server is working. */
  onUploaded?: () => void
  signal?: AbortSignal
}

/**
 * POSTs form data with upload progress (fetch can't report upload progress).
 * Resolves with the parsed JSON on success; rejects with an ApiError carrying the
 * backend's message on failure, or a TypeError on network failure (like fetch).
 */
export function postForm<T>(
  path: string,
  body: FormData,
  { onProgress, onUploaded, signal }: UploadOptions = {},
  fallbackError = "Request failed",
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"))

    const xhr = new XMLHttpRequest()
    xhr.open("POST", `${API_URL}${path}`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100))
    }
    xhr.upload.onload = () => {
      onProgress?.(100)
      onUploaded?.()
    }

    xhr.onload = () => {
      let data: unknown = null
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        // non-JSON body
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as T)
      else reject(new ApiError(errorFromData(data, fallbackError)))
    }
    xhr.onerror = () => reject(new TypeError("Network request failed"))
    xhr.ontimeout = () => reject(new TypeError("Network request timed out"))
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"))
    signal?.addEventListener("abort", () => xhr.abort(), { once: true })

    xhr.send(body)
  })
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t)
        reject(new DOMException("Aborted", "AbortError"))
      },
      { once: true },
    )
  })
}

/** Polls /progress until a conversion job finishes; throws if it fails. */
export async function pollJob(
  jobId: string,
  { signal, onProgress, intervalMs = 2000, timeoutMs = 10 * 60 * 1000 }: {
    signal?: AbortSignal
    onProgress?: (percent: number) => void
    intervalMs?: number
    timeoutMs?: number
  } = {},
): Promise<void> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    await sleep(intervalMs, signal)

    let res: Response
    try {
      res = await fetch(`${API_URL}/progress/${jobId}`, { signal })
    } catch (e) {
      if (signal?.aborted) throw e
      continue // transient network error, keep polling
    }

    if (res.status === 404) {
      throw new ApiError("Job not found. The server may have restarted — please try again.")
    }
    if (!res.ok) continue

    const data = await res.json()
    if (data.status === "finished") return
    if (data.status === "failed") throw new ApiError(data.message || "Conversion failed")
    onProgress?.(data.progress || 50)
  }

  throw new ApiError("This is taking longer than expected. Please try again.")
}
