// Browser-side download pipeline.
//
// yt-dlp still runs on the server, but the media itself no longer has to be
// assembled there. /videoInfo hands us direct googlevideo URLs and /stream
// relays those bytes (the CDN sends no CORS headers, so the browser cannot
// fetch them itself). We pull the video and audio streams in parallel and mux
// them locally with ffmpeg.wasm, which keeps the server to bytes-in/bytes-out:
// no yt-dlp process per download, no temp files, no ffmpeg on the server.
//
// The one thing this cannot offload is server bandwidth - only the server can
// talk to the CDN, so the bytes are relayed through it either way.

import { FFmpeg } from '@ffmpeg/ffmpeg'
// Vite serves the core we installed as assets, so no CDN fetch is needed.
import coreURL from '@ffmpeg/core?url'
import wasmURL from '@ffmpeg/core/wasm?url'

const API = 'http://localhost:3000'

// Loading the core pulls in a ~32MB wasm blob. It is only ever needed once per
// page, so the promise is cached and shared by every item in a playlist.
let ffmpegPromise = null

export const getFFmpeg = () => {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const ffmpeg = new FFmpeg()
      await ffmpeg.load({ coreURL, wasmURL })
      return ffmpeg
    })().catch((err) => {
      ffmpegPromise = null // a failed load should be retryable
      throw err
    })
  }
  return ffmpegPromise
}

// ffmpeg.wasm keeps every input *and* the output in memory (wasm32 tops out
// around 2GB), so muxing a very long video in the browser would crash the tab.
// Beyond this the caller falls back to the server-side pipeline instead.
export const MAX_BROWSER_BYTES = 400 * 1024 * 1024

export const TOO_LARGE = 'TOO_LARGE'

const UNITS = ['B', 'KiB', 'MiB', 'GiB', 'TiB']

export const formatBytes = (bytes) => {
  if (!bytes || !isFinite(bytes)) return ''
  let value = bytes
  let i = 0
  while (value >= 1024 && i < UNITS.length - 1) { value /= 1024; i++ }
  return `${value.toFixed(value < 10 ? 2 : 1)}${UNITS[i]}`
}

const pad = (n) => String(n).padStart(2, '0')

const formatEta = (seconds) => {
  if (!isFinite(seconds) || seconds < 0) return ''
  const total = Math.round(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

export const sanitizeFilename = (name) =>
  (name || 'video').replace(/[\\/:*?"<>|]+/g, '_').trim().slice(0, 120) || 'video'

// Stream one format through the server relay, reporting bytes as they arrive.
const downloadStream = async (cdnUrl, onProgress, signal, maxBytes) => {
  const response = await fetch(`${API}/stream?url=${encodeURIComponent(cdnUrl)}`, { signal })

  if (!response.ok || !response.body) {
    if (response.status === 403 || response.status === 410) {
      throw new Error('YouTube rejected the media link (it may have expired). Try again.')
    }
    throw new Error(`Media stream failed with status ${response.status}`)
  }

  const total = Number(response.headers.get('content-length')) || 0
  if (maxBytes && total > maxBytes) {
    const error = new Error('Video is too large to merge in the browser')
    error.code = TOO_LARGE
    throw error
  }

  const reader = response.body.getReader()
  const chunks = []
  let received = 0

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    // content-length can be absent; bail out on what has actually arrived.
    if (maxBytes && received + value.length > maxBytes) {
      await reader.cancel().catch(() => {})
      const error = new Error('Video is too large to merge in the browser')
      error.code = TOO_LARGE
      throw error
    }
    chunks.push(value)
    received += value.length
    onProgress?.({ received, total })
  }

  // A single allocation at the end avoids a second full-size copy of the stream
  // (new Blob(...).arrayBuffer() would duplicate every byte).
  const bytes = new Uint8Array(received)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  return bytes
}

const UPDATE_INTERVAL = 200

// Build the shared size/speed/ETA readout for a transfer that has already
// received some bytes for some time.
const readout = ({ received, total, startedAt, onProgress }) => {
  const seconds = (performance.now() - startedAt) / 1000
  const speed = seconds > 0 ? received / seconds : 0
  onProgress({
    percent: total ? Math.min(100, (received / total) * 100) : 0,
    downloaded: formatBytes(received),
    total: formatBytes(total),
    speed: speed > 0 ? `${formatBytes(speed)}/s` : '',
    eta: speed > 0 && total > received ? formatEta((total - received) / speed) : '',
  })
}

/**
 * Audio-only download: pulls just the audio stream and saves it as-is. The
 * format is already AAC in an m4a container, so no re-encode is needed.
 */
export const downloadAudioOnly = async ({ audioUrl, onProgress, maxBytes = MAX_BROWSER_BYTES }) => {
  const startedAt = performance.now()
  let lastReport = 0

  return downloadStream(audioUrl, ({ received, total }) => {
    if (!onProgress) return
    const now = performance.now()
    if (now - lastReport < UPDATE_INTERVAL) return
    lastReport = now
    readout({ received, total, startedAt, onProgress })
  }, undefined, maxBytes)
}

/**
 * Download the video and audio formats in parallel, reporting combined
 * progress so the UI shows one coherent size/speed/ETA readout.
 */
export const downloadMedia = async ({ videoUrl, audioUrl, onProgress, maxBytes = MAX_BROWSER_BYTES }) => {
  const state = {
    video: { received: 0, total: 0 },
    audio: { received: 0, total: 0 },
  }
  const startedAt = performance.now()
  let lastReport = 0
  // If the video turns out to be oversized, the audio request is cancelled too.
  const controller = new AbortController()

  const report = (force = false) => {
    if (!onProgress) return
    const now = performance.now()
    if (!force && now - lastReport < UPDATE_INTERVAL) return
    lastReport = now

    readout({
      received: state.video.received + state.audio.received,
      total: state.video.total + state.audio.total,
      startedAt,
      onProgress,
    })
  }

  try {
    const [videoData, audioData] = await Promise.all([
      downloadStream(videoUrl, (p) => { state.video = p; report() }, controller.signal, maxBytes),
      downloadStream(audioUrl, (p) => { state.audio = p; report() }, controller.signal, maxBytes),
    ])
    report(true)
    return { videoData, audioData }
  } catch (error) {
    controller.abort()
    throw error
  }
}

/**
 * Mux the two streams into a single mp4. Both inputs are already H.264/AAC in
 * an mp4 container, so this is a stream copy - no re-encoding, just remuxing.
 */
export const muxToMp4 = async ({ videoData, audioData, onProgress }) => {
  const ffmpeg = await getFFmpeg()
  const inputs = ['video.mp4', 'audio.m4a']
  const output = 'output.mp4'

  const handleProgress = ({ progress }) => {
    if (typeof progress === 'number' && isFinite(progress)) {
      onProgress?.(Math.max(0, Math.min(100, progress * 100)))
    }
  }
  ffmpeg.on('progress', handleProgress)

  try {
    await ffmpeg.writeFile(inputs[0], videoData)
    await ffmpeg.writeFile(inputs[1], audioData)
    await ffmpeg.exec([
      '-i', inputs[0],
      '-i', inputs[1],
      // Explicit mapping keeps the first video/audio track and drops any
      // subtitle or cover-art streams the inputs may carry.
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-c', 'copy',
      '-movflags', '+faststart',
      output,
    ])
    const data = await ffmpeg.readFile(output)
    onProgress?.(100)
    return new Blob([data], { type: 'video/mp4' })
  } finally {
    ffmpeg.off('progress', handleProgress)
    // Free the wasm heap again, otherwise a playlist download would accumulate
    // every video until the tab runs out of memory.
    for (const file of [...inputs, output]) {
      try { await ffmpeg.deleteFile(file) } catch { /* never written */ }
    }
  }
}

export const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Revoking straight away can cancel the save in some browsers, so give the
  // download a moment to start first.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
