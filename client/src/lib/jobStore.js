// Shared plumbing for server-side download jobs: the endpoints behind
// /download/audio/job and /download/video/job in server/server.js.
//
// A download used to be fetched and buffered in the tab: the server did the work,
// but the bytes only existed while the page that asked stayed alive to receive them.
// Locking a phone or switching to another app dropped the response and the work went
// with it.
//
// These helpers talk to the job endpoints instead. The server finishes the file and
// keeps it, so the download completes whether or not the tab is still there, and the
// result is fetched from a plain URL that the browser's own download manager can pull
// - which on Android keeps transferring after the page is closed.
//
// Open jobs are mirrored into localStorage because that is the only thing that
// outlives the page. That mirror is what lets a phone whose tab was killed offer the
// finished file again on the next visit.

import { API } from './api'

const MAX_ENTRIES = 40
// Frequent enough for the row's percentage to move, rare enough not to hammer a
// 0.1-vCPU instance. An extraction takes seconds to minutes, so nothing is missed.
const POLL_MS = 1500

const storage = () => {
  try {
    return window.localStorage
  } catch {
    // Storage blocked (private mode, a locked-down webview) still downloads; it just
    // cannot remember a job across a reload.
    return null
  }
}

export const readJobEntries = (storageKey, maxAgeMs) => {
  const store = storage()
  if (!store) return []
  let parsed
  try {
    parsed = JSON.parse(store.getItem(storageKey) || '[]')
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  const cutoff = Date.now() - maxAgeMs
  return parsed.filter((job) => job && job.id && (job.createdAt || 0) > cutoff)
}

const writeJobEntries = (storageKey, jobs) => {
  const store = storage()
  if (!store) return
  try {
    store.setItem(storageKey, JSON.stringify(jobs.slice(0, MAX_ENTRIES)))
  } catch {
    // Full or blocked: the download itself is unaffected.
  }
}

// Remember a job so a later visit can finish collecting it. Newest first.
export const rememberJob = (storageKey, job) => {
  writeJobEntries(storageKey, [job, ...readJobEntries(storageKey, Number.MAX_SAFE_INTEGER)
    .filter((entry) => entry.id !== job.id)])
}

export const forgetJob = (storageKey, jobId) => {
  writeJobEntries(storageKey, readJobEntries(storageKey, Number.MAX_SAFE_INTEGER)
    .filter((entry) => entry.id !== jobId))
}

export const jobFileUrl = (basePath, jobId) =>
  `${API}/${basePath}/job/${encodeURIComponent(jobId)}/file`

export const startJob = async (basePath, body, label) => {
  const response = await fetch(`${API}/${basePath}/job`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(json.error || `Could not start the ${label}`)
  return json
}

// A job the server has forgotten (or lost to a restart) answers 404. That is not an
// error worth shouting about: it means the file is simply gone, so it comes back as
// null and the caller decides.
export const fetchJob = async (basePath, jobId, signal) => {
  const response = await fetch(`${API}/${basePath}/job/${encodeURIComponent(jobId)}`, { signal })
  if (response.status === 404) return null
  const json = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(json.error || 'Could not read this download')
  return json
}

export const cancelJob = async (storageKey, basePath, jobId) => {
  forgetJob(storageKey, jobId)
  try {
    await fetch(`${API}/${basePath}/job/${encodeURIComponent(jobId)}`, { method: 'DELETE' })
  } catch {
    // The server drops it on its own once it ages out.
  }
}

const abortError = () => new DOMException('The download was stopped', 'AbortError')

// Sleep a stop can cut short, so a row reacts to Stop immediately instead of waiting
// out the whole poll interval.
const delay = (ms, signal) => new Promise((resolve, reject) => {
  if (signal && signal.aborted) return reject(abortError())
  const finish = () => {
    clearTimeout(timer)
    if (signal) signal.removeEventListener('abort', onAbort)
  }
  const onAbort = () => {
    finish()
    reject(abortError())
  }
  const timer = setTimeout(() => {
    finish()
    resolve()
  }, ms)
  if (signal) signal.addEventListener('abort', onAbort)
})

/**
 * Follow a job until the server owns a finished file.
 *
 * The polling is only a progress display: the download runs on the server whether or
 * not anyone is watching, so stopping here stops the display, not the work. Callers
 * that want the work gone as well call cancelJob.
 */
export const waitForJob = async (basePath, jobId, { signal, onUpdate } = {}) => {
  for (;;) {
    const job = await fetchJob(basePath, jobId, signal)
    if (!job) {
      // Tagged so a caller can tell a job the server has lost from a network blip,
      // which surfaces as an ordinary fetch failure and is worth retrying later.
      const gone = new Error('The server no longer has this download')
      gone.code = 'JOB_GONE'
      throw gone
    }
    onUpdate?.(job)
    if (job.status === 'ready') return job
    if (job.status === 'failed') {
      const failed = new Error(job.error || 'Download failed')
      failed.code = 'JOB_FAILED'
      throw failed
    }
    await delay(POLL_MS, signal)
  }
}
