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

// ffmpeg.wasm is a single instance with one worker and one in-memory
// filesystem. Two muxes running at once would overwrite each other's
// video.mp4/audio.m4a while the other one is still reading them, which is a
// silent way to corrupt both downloads. Every ffmpeg operation goes through
// this chain so only one runs at a time.
let ffmpegChain = Promise.resolve()

const withFFmpeg = (work) => {
  const run = ffmpegChain.then(work, work)
  ffmpegChain = run.then(() => {}, () => {})
  return run
}

// A core that failed mid-operation can be left in a state where every later
// operation fails too (that is how one bad video used to poison a whole
// playlist). Dropping the instance forces the next mux to load a fresh one.
export const disposeFFmpeg = () => {
  const pending = ffmpegPromise
  ffmpegPromise = null
  if (pending) {
    pending.then((ffmpeg) => ffmpeg.terminate()).catch(() => {})
  }
}

// ffmpeg.wasm keeps every input *and* the output in memory (wasm32 tops out
// around 2GB), so muxing a very long video in the browser would crash the tab.
// Beyond this the caller falls back to the server-side pipeline instead.
export const MAX_BROWSER_BYTES = 400 * 1024 * 1024

export const TOO_LARGE = 'TOO_LARGE'
export const BAD_MEDIA = 'BAD_MEDIA'

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

// The worker serialises anything it throws to a string ("ErrnoError: FS
// error"), so `error.message` is undefined and the UI ends up showing a
// pointless "Download failed". Rebuild a usable Error.
export const normalizeError = (error, fallback = 'Download failed') => {
  if (error instanceof Error) return error
  if (typeof error === 'string') {
    const text = error.trim()
    if (/ErrnoError: FS error/i.test(text)) {
      const err = new Error('The video and audio could not be joined together')
      err.cause = text
      return err
    }
    const err = new Error(text || fallback)
    err.cause = text
    return err
  }
  return new Error(error?.message || fallback)
}

// Formats come from yt-dlp verbatim, and its list also contains HLS (.m3u8)
// manifests whose "media" is really a few KB of text. Writing one of those into
// ffmpeg as video.mp4 is what produced the opaque "ErrnoError: FS error", so
// anything that is not plain HTTPS media is skipped.
export const isDirectMedia = (format) => {
  if (!format || !format.url) return false
  if (format.protocol && format.protocol !== 'https') return false
  if (/\.m3u8(\?|$)/i.test(format.url)) return false
  return /^https?:\/\//i.test(format.url)
}

// A direct googlevideo URL returns the whole file only if the request is
// windowed (unbounded requests get throttled to a crawl), so the server walks
// it in windows. This checks the assembled result instead of trusting it: a
// short read or a stray error page would otherwise go straight into ffmpeg and
// surface as that same meaningless FS error.
const MEDIA_SIGNATURES = [
  { name: 'MP4/M4A', offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }, // "ftyp"
  { name: 'WebM/MKV', offset: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3] },
]

export const mediaLooksValid = (bytes) => {
  if (!bytes || bytes.length < 16) return false
  return MEDIA_SIGNATURES.some(({ offset, bytes: sig }) =>
    sig.every((byte, i) => bytes[offset + i] === byte))
}

const isRetryable = (error) =>
  error.code !== TOO_LARGE && error.name !== 'AbortError' && !error.aborted

// Stream one format through the server relay, reporting bytes as they arrive.
const streamOnce = async (cdnUrl, { onProgress, signal, maxBytes, expectedSize }) => {
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

  // Reject instead of handing ffmpeg something it cannot open.
  if (total && received !== total) {
    const error = new Error(`Truncated download: got ${received} of ${total} bytes`)
    error.code = BAD_MEDIA
    throw error
  }
  // yt-dlp reports the exact byte size; a mismatch means a partial file.
  if (expectedSize && Math.abs(received - expectedSize) > 1024) {
    const error = new Error(`Incomplete download: got ${received} of ${expectedSize} bytes`)
    error.code = BAD_MEDIA
    throw error
  }
  if (!mediaLooksValid(bytes)) {
    const error = new Error('The server sent something that is not a video or audio file')
    error.code = BAD_MEDIA
    throw error
  }

  return { bytes, received, total }
}

// One retry is enough to ride out a dropped relay window, and it keeps a
// playlist moving without doubling every failure.
const downloadStream = async (cdnUrl, label, options) => {
  let lastError
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await streamOnce(cdnUrl, options)
    } catch (error) {
      lastError = error
      if (error.code === TOO_LARGE || !isRetryable(error) || attempt === 2) throw error
      console.warn(`[download] ${label} attempt ${attempt} failed (${error.message}); retrying`)
    }
  }
  throw lastError
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
export const downloadAudioOnly = async ({
  audioUrl,
  expectedSize,
  onProgress,
  maxBytes = MAX_BROWSER_BYTES,
}) => {
  const startedAt = performance.now()
  let lastReport = 0

  const { bytes } = await downloadStream(audioUrl, 'audio', {
    maxBytes,
    expectedSize,
    onProgress: onProgress
      ? ({ received, total }) => {
        const now = performance.now()
        if (now - lastReport < UPDATE_INTERVAL) return
        lastReport = now
        readout({ received, total, startedAt, onProgress })
      }
      : undefined,
  })
  return bytes
}

/**
 * Download the video and audio formats in parallel, reporting combined
 * progress so the UI shows one coherent size/speed/ETA readout.
 */
export const downloadMedia = async ({
  videoUrl,
  audioUrl,
  videoSize,
  audioSize,
  onProgress,
  maxBytes = MAX_BROWSER_BYTES,
}) => {
  const state = {
    video: { received: 0, total: 0 },
    audio: { received: 0, total: 0 },
  }
  const startedAt = performance.now()
  let lastReport = 0
  // If one stream is oversized, the other request is cancelled too.
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
    const [video, audio] = await Promise.all([
      downloadStream(videoUrl, 'video', {
        signal: controller.signal,
        maxBytes,
        expectedSize: videoSize,
        onProgress: (p) => { state.video = p; report() },
      }),
      downloadStream(audioUrl, 'audio', {
        signal: controller.signal,
        maxBytes,
        expectedSize: audioSize,
        onProgress: (p) => { state.audio = p; report() },
      }),
    ])
    report(true)
    return { videoData: video.bytes, audioData: audio.bytes }
  } catch (error) {
    controller.abort()
    throw error
  }
}

// ffmpeg's own log is the only place the real reason lives ("moov atom not
// found", "Invalid data found when processing input", ...). Without it a failed
// mux can only report the FS error the library throws afterwards.
const LOG_NOISE = /^(configuration:|libav|libsw| {2}built| {2}lib|Input #|Duration|Stream #|Output #|Press \[q)/
const collectLogs = (ffmpeg) => {
  const lines = []
  const onLog = ({ message }) => {
    if (message && !LOG_NOISE.test(message.trim())) lines.push(message.trim())
    if (lines.length > 40) lines.shift()
  }
  ffmpeg.on('log', onLog)
  return { lines, stop: () => ffmpeg.off('log', onLog) }
}

const WORK_FILES = ['video.mp4', 'audio.m4a', 'output.mp4']

/**
 * Mux the two streams into a single mp4. Both inputs are already H.264/AAC in
 * an mp4 container, so this is a stream copy - no re-encoding, just remuxing.
 */
export const muxToMp4 = ({ videoData, audioData, onProgress }) => withFFmpeg(async () => {
  const ffmpeg = await getFFmpeg()
  const [videoInput, audioInput] = WORK_FILES
  const output = WORK_FILES[2]
  const logs = collectLogs(ffmpeg)

  const handleProgress = ({ progress }) => {
    if (typeof progress === 'number' && isFinite(progress)) {
      onProgress?.(Math.max(0, Math.min(100, progress * 100)))
    }
  }
  ffmpeg.on('progress', handleProgress)

  // Any leftover file from an earlier failed run would make ffmpeg stop and ask
  // whether to overwrite, which it cannot do without a stdin.
  const clean = async () => {
    for (const file of WORK_FILES) {
      try { await ffmpeg.deleteFile(file) } catch { /* was not there */ }
    }
  }

  try {
    await clean()

    try {
      await ffmpeg.writeFile(videoInput, videoData)
      await ffmpeg.writeFile(audioInput, audioData)
    } catch (error) {
      throw normalizeError(error, 'Could not load the streams for merging')
    }

    // -nostdin/-y: ffmpeg.wasm has no stdin, so an "overwrite?" prompt would
    // fail the command instead of asking.
    const args = [
      '-nostdin', '-y',
      '-i', videoInput,
      '-i', audioInput,
      // Explicit mapping keeps the first video/audio track and drops any
      // subtitle or cover-art streams the inputs may carry.
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-c', 'copy',
      '-movflags', '+faststart',
      output,
    ]

    let status = await ffmpeg.exec(args)

    // Muxers that cannot place a codec in mp4 fail on the container, not the
    // data. Retry without faststart before giving up on the whole merge.
    if (status !== 0) {
      console.warn('[merge] ffmpeg exited with', status, '- retrying without faststart')
      await clean()
      await ffmpeg.writeFile(videoInput, videoData)
      await ffmpeg.writeFile(audioInput, audioData)
      status = await ffmpeg.exec([
        '-nostdin', '-y', '-i', videoInput, '-i', audioInput,
        '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy', output,
      ])
    }

    if (status !== 0) {
      const detail = logs.lines.slice(-3).join(' | ')
      const error = new Error(`Merging failed: ${detail || `ffmpeg exited with code ${status}`}`)
      error.code = BAD_MEDIA
      throw error
    }

    let data
    try {
      data = await ffmpeg.readFile(output)
    } catch (error) {
      throw normalizeError(error, 'The merged file was not produced')
    }
    if (!data || data.length === 0) {
      const error = new Error('The merged file came out empty')
      error.code = BAD_MEDIA
      throw error
    }

    onProgress?.(100)
    return new Blob([data], { type: 'video/mp4' })
  } catch (error) {
    // Leave the instance clean for the next video instead of letting one
    // failure break everything that follows it.
    disposeFFmpeg()
    throw normalizeError(error, 'Merging failed')
  } finally {
    ffmpeg.off('progress', handleProgress)
    logs.stop()
    // Free the wasm heap again, otherwise a playlist download would accumulate
    // every video until the tab runs out of memory.
    await clean().catch(() => {})
  }
})

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
