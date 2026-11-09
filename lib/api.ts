export const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://filer-api.onrender.com"

// Must match MAX_FILE_SIZE_MB in filer-api (25)
export const MAX_FILE_SIZE_MB = Number(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB) || 25

/** Extracts FastAPI's `detail` (or `error`) message from a failed response. */
export async function getErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json()
    if (typeof data?.detail === "string") return data.detail
    if (typeof data?.error === "string") return data.error
  } catch {
    // non-JSON body
  }
  return fallback
}

export interface UploadResult {
  ok: boolean
  status: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
}

/**
 * POSTs form data with upload progress (fetch can't report upload progress).
 * `onProgress` receives 0–100; `onUploaded` fires once the body is fully sent
 * and the server is processing. Network errors reject with a TypeError,
 * matching fetch's behaviour.
 */
export function uploadWithProgress(
  url: string,
  body: FormData,
  onProgress: (percent: number) => void,
  onUploaded?: () => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", url)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.upload.onload = () => {
      onProgress(100)
      onUploaded?.()
    }

    xhr.onload = () => {
      let data: unknown = null
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        // non-JSON body
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, data })
    }
    xhr.onerror = () => reject(new TypeError("Network request failed"))
    xhr.ontimeout = () => reject(new TypeError("Network request timed out"))

    xhr.send(body)
  })
}

/** Pulls a FastAPI error message out of already-parsed JSON. */
export function errorFromData(data: unknown, fallback: string): string {
  const d = data as { detail?: unknown; error?: unknown } | null
  if (typeof d?.detail === "string") return d.detail
  if (typeof d?.error === "string") return d.error
  return fallback
}
