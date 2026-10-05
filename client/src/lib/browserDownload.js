// Browser-side download pipeline.
//
// yt-dlp still runs on the server, but the media itself no longer has to be
// assembled there. /videoInfo hands us direct googlevideo URLs and /stream
// relays those bytes (the CDN sends no CORS headers, so the browser cannot
// fetch them itself). We pull the video and audio streams in parallel and mux
// them locally with ffmpeg.wasm, which keeps the server to bytes-in/bytes-out:
// no yt-dlp process per download, no temp files, no ffmpeg on the server.
//
// The bytes still have to be relayed (the CDN sends no CORS header), but not
// necessarily by the server: set VITE_RELAY_BASE and they come from a Cloudflare
// Worker (worker/) instead, which takes both the bandwidth and the concurrency
// ceiling off the Render instance. The server's /stream stays as the fallback.
//
// Audio is the exception: mp3 is not a container YouTube serves, so /download/audio
// has the server extract and encode it (see the route in server/server.js) and the
// row saves the finished file without touching ffmpeg here. Those downloads are
// collected from a server-side job (see lib/audioJobs.js) rather than buffered as a
// blob, so they survive the tab being closed - a phone whose screen locked can pick
// the finished mp3 up again on the next visit.

import { FFmpeg } from '@ffmpeg/ffmpeg'
// Vite serves the core we installed as assets, so no CDN fetch is needed.
import coreURL from '@ffmpeg/core?url'
import wasmURL from '@ffmpeg/core/wasm?url'

import { API, RELAY_API } from './api'

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
//
// The ceiling is set well under the wasm32 limit on purpose: the bytes are held
// in the page *and* copied into ffmpeg's filesystem, so the real footprint is
// roughly twice the media size. It was 400MB, which sent anything longer than a
// short 1080p video to the server; 700MB keeps that headroom while letting much
// more download and merge locally. Downloads that turn out to be bigger than
// their reported size are still caught mid-stream and fall back.
export const MAX_BROWSER_BYTES = 700 * 1024 * 1024

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

/**
 * Pause / resume / stop for one transfer, shared by the video and audio paths.
 *
 * Pausing does not buffer anything: the reader is simply not asked for the next
 * chunk, so the browser's own backpressure holds the connection open and the
 * relay stops sending. Resuming carries on with the same stream instead of
 * starting the file again.
 */
export const createTransferControl = () => {
  const controller = new AbortController()
  const startedAt = performance.now()
  let paused = false
  let pausedSince = 0
  let pausedMs = 0
  let waiting = []

  // Wake everything sitting in waitWhilePaused.
  const release = () => {
    const pending = waiting
    waiting = []
    pending.forEach((resolve) => resolve())
  }

  return {
    signal: controller.signal,
    get paused() { return paused },
    get stopped() { return controller.signal.aborted },
    pause() {
      if (paused || controller.signal.aborted) return
      paused = true
      pausedSince = performance.now()
    },
    resume() {
      if (!paused) return
      paused = false
      pausedMs += performance.now() - pausedSince
      release()
    },
    stop() {
      paused = false
      // A paused transfer is parked in waitWhilePaused and would never reach the
      // aborted signal, so it has to be woken up first.
      release()
      controller.abort()
    },
    // Awaited before every read. While paused this does not settle, which is what
    // holds the transfer mid-file.
    async waitWhilePaused() {
      if (!paused) return
      await new Promise((resolve) => waiting.push(resolve))
    },
    // Elapsed transfer time with the paused stretches removed, so speed and ETA
    // do not collapse after a minute on hold.
    elapsedMs() {
      const held = paused ? performance.now() - pausedSince : 0
      return performance.now() - startedAt - pausedMs - held
    },
  }
}

const isRetryable = (error) =>
  error.code !== TOO_LARGE && error.name !== 'AbortError' && !error.aborted

// googlevideo throttles an unbounded request to a crawl, so the file is pulled in
// windows. The server's /stream route does that internally; the Cloudflare relay
// does not, because a Worker only gets a sliver of CPU and 50 subrequests per
// invocation (see worker/src/index.js). With the relay configured the client asks
// for one window at a time with a Range header and the worker just forwards it,
// so neither side ever holds more than a single window.
const RELAY_WINDOW_BYTES = 4 * 1024 * 1024

// `bytes 0-4194303/12345678` -> 12345678. The total only appears on a ranged
// reply, and it is the authoritative size the progress readout needs.
const totalFromContentRange = (value) => {
  const match = /\/\s*(\d+)\s*$/.exec(value || '')
  return match ? Number(match[1]) : 0
}

const relayFailure = (response) => {
  if (response.status === 403 || response.status === 410) {
    return new Error('YouTube rejected the media link (it may have expired). Try again.')
  }
  return new Error(`Media stream failed with status ${response.status}`)
}

// Stream one format through a relay, reporting bytes as they arrive.
const streamOnce = async (cdnUrl, { onProgress, signal, maxBytes, expectedSize, control }) => {
  // yt-dlp reports the exact byte size; when it does, that figure decides
  // whether this is too big, not the response header. A header that disagrees
  // must not push a perfectly mergeable video to the server.
  const known = expectedSize > 0 ? expectedSize : 0
  const chunks = []
  let received = 0
  // Better than a zero total while the first window is still in flight.
  let total = known

  if (maxBytes && known > maxBytes) {
    // Report the real figure: "too large" on its own gives no way to tell a
    // genuinely huge video from a wrong number.
    const error = new Error(`This stream is ${formatBytes(known)}, over the ${formatBytes(maxBytes)} browser limit`)
    error.code = TOO_LARGE
    throw error
  }

  // Refuses anything that grows past the browser limit mid-transfer, where
  // content-length can be absent and the reported size can simply have been
  // wrong. content-length can be absent; bail out on what has actually arrived.
  const consume = (part) => {
    if (maxBytes && received + part.length > maxBytes) {
      const error = new Error(`This stream is over the ${formatBytes(maxBytes)} browser limit`)
      error.code = TOO_LARGE
      throw error
    }
    chunks.push(part)
    received += part.length
    onProgress?.({ received, total })
  }

  if (RELAY_API) {
    // Window by window through the pass-through worker.
    for (let offset = 0; ; offset += RELAY_WINDOW_BYTES) {
      // Held before the next window is asked for: a paused transfer stops
      // requesting bytes, so the relay sends no more.
      await control?.waitWhilePaused()

      const response = await fetch(`${RELAY_API}/stream?url=${encodeURIComponent(cdnUrl)}`, {
        signal,
        headers: { Range: `bytes=${offset}-${offset + RELAY_WINDOW_BYTES - 1}` },
      })

      // The previous window ended exactly at EOF; there is nothing left.
      if (response.status === 416 && received > 0) break
      if (!response.ok || !response.body) throw relayFailure(response)

      const part = new Uint8Array(await response.arrayBuffer())
      const rangedTotal = totalFromContentRange(response.headers.get('content-range'))
      if (rangedTotal) total = rangedTotal
      // A 200 (rather than 206) means the CDN ignored the Range and sent
      // everything at once, so the length is the whole file.
      if (response.status !== 206 && part.length) total = part.length

      consume(part)

      // A short window means the file ended; a 200 is done either way.
      if (response.status !== 206) break
      if (part.length < RELAY_WINDOW_BYTES) break
      if (total && received >= total) break
    }
  } else {
    // The server's /stream walks the windows itself, so one request is enough.
    const response = await fetch(`${API}/stream?url=${encodeURIComponent(cdnUrl)}`, { signal })
    if (!response.ok || !response.body) throw relayFailure(response)

    total = Number(response.headers.get('content-length')) || total
    if (maxBytes && total > maxBytes) {
      const error = new Error(`This stream is ${formatBytes(total)}, over the ${formatBytes(maxBytes)} browser limit`)
      error.code = TOO_LARGE
      throw error
    }

    const reader = response.body.getReader()
    for (;;) {
      // Held before the next chunk is asked for: a paused transfer stops pulling
      // bytes, and the relay stops sending them.
      await control?.waitWhilePaused()
      const { done, value } = await reader.read()
      if (done) break
      try {
        consume(value)
      } catch (error) {
        await reader.cancel().catch(() => {})
        throw error
      }
    }
  }

  // A single allocation at the end avoids a second full-size copy of the stream
  // (new Blob(...).arrayBuffer() would duplicate every byte).
  const bytes = new Uint8Array(received)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }

  // Reject instead of handing ffmpeg something it cannot open. The expected
  // length comes from yt-dlp when available (it is the exact figure) and from
  // the response header otherwise.
  const expected = known || total
  if (expected && Math.abs(received - expected) > 1024) {
    const error = new Error(`Incomplete download: got ${received} of ${expected} bytes`)
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
      // A stop is not a dropped connection: retrying would start the transfer
      // again right after the user asked for it to end.
      if (options.control?.stopped || error.code === TOO_LARGE || !isRetryable(error) || attempt === 2) throw error
      console.warn(`[download] ${label} attempt ${attempt} failed (${error.message}); retrying`)
    }
  }
  throw lastError
}

const UPDATE_INTERVAL = 200

// Build the shared size/speed/ETA readout for a transfer that has already
// received some bytes for some time.
const readout = ({ received, total, elapsedMs, onProgress }) => {
  const seconds = elapsedMs / 1000
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
  control,
}) => {
  const state = {
    video: { received: 0, total: 0 },
    audio: { received: 0, total: 0 },
  }
  const startedAt = performance.now()
  const elapsedMs = () => (control ? control.elapsedMs() : performance.now() - startedAt)
  let lastReport = 0
  // If one stream is oversized, the other request is cancelled too.
  const controller = new AbortController()
  // Both fetches listen to this controller rather than to the control's own
  // signal, so a stop has to reach them through it.
  control?.signal.addEventListener('abort', () => controller.abort(), { once: true })

  const report = (force = false) => {
    if (!onProgress) return
    const now = performance.now()
    if (!force && now - lastReport < UPDATE_INTERVAL) return
    lastReport = now

    readout({
      received: state.video.received + state.audio.received,
      total: state.video.total + state.audio.total,
      elapsedMs: elapsedMs(),
      onProgress,
    })
  }

  try {
    const [video, audio] = await Promise.all([
      downloadStream(videoUrl, 'video', {
        signal: controller.signal,
        control,
        maxBytes,
        expectedSize: videoSize,
        onProgress: (p) => { state.video = p; report() },
      }),
      downloadStream(audioUrl, 'audio', {
        signal: controller.signal,
        control,
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

// Any leftover file from an earlier failed run would make ffmpeg stop and ask
// whether to overwrite, which it cannot do without a stdin.
const removeFiles = async (ffmpeg, files) => {
  for (const file of files) {
    try { await ffmpeg.deleteFile(file) } catch { /* was not there */ }
  }
}

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

  const clean = () => removeFiles(ffmpeg, WORK_FILES)

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

// Hand a URL to the browser's own download manager rather than buffering the file
// into a blob first. Same synchronous anchor click as saveBlob, but the bytes are
// fetched by the browser instead of by the page: on Android that transfer belongs to
// the download manager and keeps going after the tab is closed, which is what makes a
// server-side job worth collecting this way.
export const saveUrlAs = (url, filename) => {
  const link = document.createElement('a')
  link.href = url
  // Ignored for a cross-origin URL: the server's Content-Disposition names the file.
  if (filename) link.download = filename
  link.rel = 'noopener'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
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
