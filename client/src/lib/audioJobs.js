// Server-side audio jobs (the /download/audio/job endpoints in server/server.js).
//
// The mp3 is encoded by the instance and kept there, so a tab that dies mid-download
// does not lose the file: it is collected from a plain URL by the browser's own
// download manager, and offered again by the recovery list if the tab never came back.
//
// The plumbing itself lives in lib/jobStore.js, which the video job shares - the two
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

const STORAGE_KEY = 'tubeko.audioJobs'
const BASE_PATH = 'download/audio'
// Nothing on the server is kept forever, so neither is this: an entry older than the
// server's own window is one the UI could never fulfil.
const MAX_AGE_MS = 30 * 60 * 1000

export const audioJobFileUrl = (jobId) => jobFileUrl(BASE_PATH, jobId)

export const readAudioJobs = () => readJobEntries(STORAGE_KEY, MAX_AGE_MS)

export const rememberAudioJob = (job) => rememberJob(STORAGE_KEY, job)

export const forgetAudioJob = (jobId) => forgetJob(STORAGE_KEY, jobId)

export const startAudioJob = ({ url, title, jobId }) =>
  startJob(BASE_PATH, { url, title, id: jobId }, 'audio download')

export const fetchAudioJob = (jobId, signal) => fetchJob(BASE_PATH, jobId, signal)

export const cancelAudioJob = (jobId) => cancelJob(STORAGE_KEY, BASE_PATH, jobId)

export const waitForAudioJob = (jobId, options) => waitForJob(BASE_PATH, jobId, options)
