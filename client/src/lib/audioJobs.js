// Server-side audio jobs (the /download/audio/job endpoints in server/server.js).
//
// An mp3 used to be fetched and buffered in the tab: the server encoded it, but the
// bytes only existed while the page that asked stayed alive to receive them. Locking
// a phone or switching to another app dropped the response and the work was gone
// with it.
//
// These helpers talk to the job endpoints instead. The server encodes the file and
// keeps it, so the download finishes whether or not the tab is still there, and the
// finished file is fetched from a plain URL that the browser's own download manager
// can pull - which on Android keeps transferring after the page is closed.
//
// The open jobs are mirrored into localStorage because that is the only thing that
// outlives the page. That mirror is what lets a phone whose tab was killed offer the
// finished mp3 again on the next visit.

import { API } from './api'

const STORAGE_KEY = 'tubeko.audioJobs'
// Nothing on the server is kept forever, so neither is this: an entry older than the
// server's own window is one the UI could never fulfil.
const MAX_AGE_MS = 30 * 60 * 1000
const MAX_ENTRIES = 40
// Frequent enough for the row's percentage to move, rare enough not to hammer a
// 0.1-vCPU instance. An extraction takes seconds to minutes, so nothing is missed.
const POLL_MS = 1500

export const audioJobFileUrl = (jobId) =>
  `${API}/download/audio/job/${encodeURIComponent(jobId)}/file`

const storage = () => {
  try {
    return window.localStorage
  } catch {
    // Storage blocked (private mode, a locked-down webview) still downloads; it just
    // cannot remember a job across a reload.
    return null
  }
}

export const readAudioJobs = () => {
  const store = storage()
  if (!store) return []
  let parsed
  try {
    parsed = JSON.parse(store.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  const cutoff = Date.now() - MAX_AGE_MS
  return parsed.filter((job) => job && job.id && (job.createdAt || 0) > cutoff)
}

const writeAudioJobs = (jobs) => {
  const store = storage()
  if (!store) return
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(jobs.slice(0, MAX_ENTRIES)))
  } catch {
    // Full or blocked: the download itself is unaffected.
  }
}

// Remember a job so a later visit can finish collecting it. Newest first.
export const rememberAudioJob = (job) => {
  const rest = readAudioJobs().filter((entry) => entry.id !== job.id)
  writeAudioJobs([job, ...rest])
}

export const forgetAudioJob = (jobId) => {
  writeAudioJobs(readAudioJobs().filter((entry) => entry.id !== jobId))
}

export const startAudioJob = async ({ url, title, jobId }) => {
  const response = await fetch(`${API}/download/audio/job`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, title, id: jobId }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Could not start the audio download')
  return body
}

// A job the server has forgotten (or lost to a restart) answers 404. That is not an
// error worth shouting about: it means the file is simply gone, so it comes back as
// null and the caller decides.
export const fetchAudioJob = async (jobId, signal) => {
  const response = await fetch(`${API}/download/audio/job/${encodeURIComponent(jobId)}`, { signal })
  if (response.status === 404) return null
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Could not read the audio download')
  return body
}

export const cancelAudioJob = async (jobId) => {
  forgetAudioJob(jobId)
  try {
    await fetch(`${API}/download/audio/job/${encodeURIComponent(jobId)}`, { method: 'DELETE' })
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
 * Follow a job until the server owns a finished mp3.
 *
 * The polling is only a progress display: the extraction runs on the server whether
 * or not anyone is watching, so stopping here stops the display, not the work.
 * Callers that want the work gone as well call cancelAudioJob.
 */
export const waitForAudioJob = async (jobId, { signal, onUpdate } = {}) => {
  for (;;) {
    const job = await fetchAudioJob(jobId, signal)
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
      const failed = new Error(job.error || 'Audio download failed')
      failed.code = 'JOB_FAILED'
      throw failed
    }
    await delay(POLL_MS, signal)
  }
}
