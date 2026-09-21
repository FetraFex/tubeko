// Quality vocabulary and fallback rules for the download-quality selector.
//
// Kept pure like formatSelection.js - no DOM and no ffmpeg imports - so the
// rules can be exercised directly in Node. A wrong pick is otherwise only
// visible as a failed or unexpectedly-sized download inside a worker, where the
// real reason is unreadable.

// Explicit extension: Vite resolves either way, but Node's ESM resolver needs
// it, and being runnable under plain node is the point of these rule modules.
import { usableFormats } from './formatSelection.js'

export const BEST = 'best'

// Offered in the UI. `height` is what the fallback rule matches against; the
// `best` option has none because it means "highest resolution this video has".
export const QUALITY_OPTIONS = [
  { value: BEST, label: 'Best available' },
  { value: '1080p', label: '1080p', height: 1080 },
  { value: '720p', label: '720p', height: 720 },
  { value: '480p', label: '480p', height: 480 },
  { value: '360p', label: '360p', height: 360 },
]

// What the selector starts on. 720p is what the app picked before the selector
// existed, so the default download is unchanged for anyone who never touches it.
export const DEFAULT_QUALITY = '720p'

export const qualityOption = (value) =>
  QUALITY_OPTIONS.find((option) => option.value === value) ||
  QUALITY_OPTIONS.find((option) => option.value === DEFAULT_QUALITY)

const parseHeight = (format) => parseInt(format?.quality) || 0

// H.264 is what the mp4 muxer and the browser both accept, so among formats at
// the same resolution it is the one to take. This is also why the previous
// 720p rule preferred itag 136.
const isMp4Friendly = (format) => /^avc/i.test(format?.codec?.video || '')

const videoCandidates = (formats) =>
  usableFormats(formats).filter((format) => format.type.includes('video') && parseHeight(format) > 0)

// Highest resolution first; ties broken by mp4 compatibility, then by the
// larger file (the higher-bitrate encode of the same resolution).
const byQualityDesc = (a, b) =>
  parseHeight(b) - parseHeight(a) ||
  Number(isMp4Friendly(b)) - Number(isMp4Friendly(a)) ||
  (b.filesizeBytes || 0) - (a.filesizeBytes || 0)

/**
 * Resolve which format to download for a requested quality.
 *
 * The rule, in order:
 *   1. the exact resolution asked for;
 *   2. otherwise the highest resolution *below* it, because a lower resolution
 *      is a graceful miss while a higher one would hand back more than was
 *      asked for;
 *   3. otherwise the lowest resolution above it, reported as a fallback, since
 *      the only alternative is not downloading at all.
 *
 * Returns { format, requested, requestedLabel, delivered, fallback, reason }.
 * `reason` is one of 'exact' | 'lower' | 'higher' | 'best' | 'no-video'.
 */
export const resolveVideoQuality = (formats, requestedValue = DEFAULT_QUALITY) => {
  const option = qualityOption(requestedValue)
  const candidates = videoCandidates(formats)

  const describe = (format, fallback, reason) => ({
    format,
    requested: option.value,
    requestedLabel: option.label,
    delivered: format ? format.quality : '',
    fallback,
    reason,
  })

  if (candidates.length === 0) return describe(null, false, 'no-video')

  const sorted = [...candidates].sort(byQualityDesc)

  // 'best' has no target to miss, so the highest resolution is the answer
  // rather than a fallback.
  if (option.value === BEST || !option.height) return describe(sorted[0], false, 'best')

  const exact = sorted.find((format) => parseHeight(format) === option.height)
  if (exact) return describe(exact, false, 'exact')

  const lower = sorted.find((format) => parseHeight(format) < option.height)
  if (lower) return describe(lower, true, 'lower')

  // Nothing at or below the target: the smallest available is the closest we
  // can get while staying as light as possible.
  return describe(sorted[sorted.length - 1], true, 'higher')
}

// Human-readable note for a resolved fallback, or '' when the request was met.
export const fallbackNotice = (resolution) => {
  if (!resolution?.fallback || !resolution.format) return ''

  if (resolution.reason === 'higher') {
    return `This video has nothing at or below ${resolution.requestedLabel}, so it downloads at the smallest available resolution, ${resolution.delivered}.`
  }
  return `${resolution.requestedLabel} is not available for this video, so it downloads at ${resolution.delivered} instead.`
}
