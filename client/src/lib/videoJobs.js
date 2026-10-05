// Server-side video jobs (the /download/video/job endpoints in server/server.js).
//
// The mp4 is assembled on the instance - both streams pulled, then merged - and kept
// there, so a tab that dies mid-merge does not throw away a file that was seconds from
// being finished. The result is collected from a plain URL by the browser's own
// download manager, and offered again by the recovery list if the tab never came back.
//
// The plumbing itself lives in lib/jobStore.js, which the audio job shares - the two
// differ only in endpoint, storage key and how long the server keeps the result.

import {
  cancelJob,
  fetchJob,
  forgetJob,
  jobFileUrl,
  readJobEntries,
  rememberJob,
  startJob,
  waitForJob,
} from './jobStore'

const STORAGE_KEY = 'tubeko.videoJobs'
const BASE_PATH = 'download/video'
// Longer than the audio window: an mp4 is far bigger, so collecting it can take a
// while longer on a phone. The server keeps its files for the same period.
const MAX_AGE_MS = 60 * 60 * 1000

export const videoJobFileUrl = (jobId) => jobFileUrl(BASE_PATH, jobId)

export const readVideoJobs = () => readJobEntries(STORAGE_KEY, MAX_AGE_MS)

export const rememberVideoJob = (job) => rememberJob(STORAGE_KEY, job)

export const forgetVideoJob = (jobId) => forgetJob(STORAGE_KEY, jobId)

export const startVideoJob = ({ url, quality, title, jobId }) =>
  startJob(BASE_PATH, { url, quality, title, id: jobId }, 'video download')

export const fetchVideoJob = (jobId, signal) => fetchJob(BASE_PATH, jobId, signal)

export const cancelVideoJob = (jobId) => cancelJob(STORAGE_KEY, BASE_PATH, jobId)

export const waitForVideoJob = (jobId, options) => waitForJob(BASE_PATH, jobId, options)
