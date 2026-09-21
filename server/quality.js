// Quality resolution for the server-side download pipeline.
//
// CommonJS mirror of the client's lib/quality.js, but written against yt-dlp's
// raw format objects, because the server never has the /videoInfo-shaped list
// the client works with.
//
// Why the server needs its own copy of the rule: the client picks the itags and
// sends them, but a link can expire or a format can be dropped between the
// metadata request and the download, and /download/full has to finish at the
// quality that was asked for instead of failing or silently taking anything.
//
// Dependency-free so it can be exercised with plain node.

const isDirectMedia = (format) => {
  if (!format || !format.url) return false
  // m3u8 is an HLS manifest and mhtml is a storyboard - neither is a media file.
  if (format.protocol && format.protocol !== 'https') return false
  if (/\.m3u8(\?|$)/i.test(format.url)) return false
  return true
}

const hasVideo = (format) => Boolean(format.vcodec) && format.vcodec !== 'none'
const hasAudio = (format) => Boolean(format.acodec) && format.acodec !== 'none'
const isMp4Friendly = (format) => /^avc/i.test(format?.vcodec || '')
const bitrate = (format) => Number(format?.abr) || 0

// "720p" -> 720. "best" and anything unparseable mean "no target".
const qualityToHeight = (quality) => {
  const match = /^(\d{2,4})p$/i.exec(String(quality ?? '').trim())
  return match ? Number(match[1]) : null
}

/**
 * Pick the video format for a requested quality.
 *
 * Same rule as the client's resolveVideoQuality:
 *   1. the exact resolution asked for;
 *   2. otherwise the highest resolution below it;
 *   3. otherwise the smallest resolution above it, flagged as a fallback.
 *
 * Ties are broken in favour of video-only streams (they pair with the separate
 * audio track this pipeline downloads), then H.264 (what the mp4 muxer takes),
 * then the larger file.
 *
 * Returns { itag, height, label, fallback, reason }.
 */
const pickVideoFormat = (formats, quality) => {
  const target = qualityToHeight(quality)

  const candidates = (formats || [])
    .filter((format) => isDirectMedia(format) && hasVideo(format) && Number(format.height) > 0)

  if (candidates.length === 0) return { itag: null, height: 0, label: '', fallback: false, reason: 'no-video' }

  const ranked = [...candidates].sort((a, b) =>
    Number(b.height) - Number(a.height) ||
    Number(hasAudio(a)) - Number(hasAudio(b)) ||
    Number(isMp4Friendly(b)) - Number(isMp4Friendly(a)) ||
    (Number(b.filesize) || 0) - (Number(a.filesize) || 0))

  const describe = (format, fallback, reason) => ({
    itag: String(format.format_id),
    height: Number(format.height),
    label: `${Number(format.height)}p`,
    fallback,
    reason,
  })

  if (!target) return describe(ranked[0], false, 'best')

  const exact = ranked.find((format) => Number(format.height) === target)
  if (exact) return describe(exact, false, 'exact')

  const lower = ranked.find((format) => Number(format.height) < target)
  if (lower) return describe(lower, true, 'lower')

  return describe(ranked[ranked.length - 1], true, 'higher')
}

/**
 * Pick the audio track: whichever sits closest to 128kbps, which is the
 * bitrate the client prefers, falling back to the highest available.
 */
const pickAudioFormat = (formats) => {
  const audio = (formats || []).filter((format) => isDirectMedia(format) && hasAudio(format) && !hasVideo(format))
  if (audio.length === 0) return { itag: null, bitrate: 0, label: '' }

  const best = [...audio].sort((a, b) =>
    Math.abs(bitrate(a) - 128) - Math.abs(bitrate(b) - 128) || bitrate(b) - bitrate(a))[0]

  return { itag: String(best.format_id), bitrate: Math.round(bitrate(best)), label: `${Math.round(bitrate(best))}kbps` }
}

const resolveDownloadFormats = (formats, quality) => ({
  video: pickVideoFormat(formats, quality),
  audio: pickAudioFormat(formats),
})

module.exports = { isDirectMedia, qualityToHeight, pickVideoFormat, pickAudioFormat, resolveDownloadFormats }
