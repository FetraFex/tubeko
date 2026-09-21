// Format-selection rules.
//
// Deliberately free of ffmpeg/browser imports so the rules can be exercised
// directly in Node: a wrong pick otherwise only shows up as a failed download
// deep inside a worker, where the real reason is unreadable.

// yt-dlp's format list also contains HLS (.m3u8) manifests and mhtml
// storyboards whose "media" is a few KB of text. Writing one of those into
// ffmpeg as video.mp4 is what produced the opaque "ErrnoError: FS error", so
// anything that is not plain HTTPS media is skipped.
export const isDirectMedia = (format) => {
  if (!format || !format.url) return false
  if (format.protocol && format.protocol !== 'https') return false
  if (/\.m3u8(\?|$)/i.test(format.url)) return false
  return /^https?:\/\//i.test(format.url)
}

export const usableFormats = (formats) => (formats || []).filter(isDirectMedia)

// "720p" / "1080p" -> 720 / 1080. Anything unparseable ranks last.
const height = (format) => parseInt(format.quality) || 0

// Which video format to fetch is no longer decided here: it is driven by the
// quality the user picked, and the resolution plus its fallbacks live in
// quality.js (resolveVideoQuality).

// Prefer ~128kbps audio, otherwise the highest bitrate on offer.
export const selectAudioFormat = (formats) => {
  const audioFormats = usableFormats(formats).filter((f) => f.type === 'audio only')
  if (audioFormats.length === 0) return null

  const preferred = audioFormats.find((format) => {
    const qualityValue = parseInt(format.quality.split('.')[0])
    return qualityValue === 129 || qualityValue === 128
  })
  if (preferred) return preferred

  return audioFormats.reduce((highest, current) =>
    (parseFloat(current.quality) || 0) > (parseFloat(highest.quality) || 0) ? current : highest,
    audioFormats[0])
}

/**
 * Best video format whose streams still fit within `maxBytes` once the audio
 * track is added, or null when nothing fits.
 *
 * A video too large to mux in the browser does not have to fall back to the
 * server: the same video is usually published at several resolutions, and a
 * smaller one can be downloaded *and* merged in the browser. Choosing the best
 * resolution that fits keeps the server out of the transfer while costing as
 * little sharpness as the limit allows.
 *
 * `below` restricts the search to resolutions lower than that format, for the
 * case where one was already tried and turned out to be over budget.
 */
export const selectVideoFormatThatFits = (formats, audioBytes = 0, maxBytes = 0, below = null) => {
  const ceiling = below ? height(below) : Infinity

  // Formats with no known size cannot be judged, so they are never chosen here
  // (the streaming guard still catches them if the pick is over budget).
  const candidates = usableFormats(formats)
    .filter((format) => format.type.includes('video')
      && format.filesizeBytes > 0
      && height(format) < ceiling)
    .sort((a, b) => height(b) - height(a))

  const budget = maxBytes - audioBytes
  if (budget <= 0) return null

  return candidates.find((format) => format.filesizeBytes <= budget) || null
}

// Combined byte count for the formats a download would pull.
export const totalBytes = (formats) =>
  (formats || []).reduce((sum, format) => sum + (format?.filesizeBytes || 0), 0)
