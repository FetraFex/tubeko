// Where the Express server lives.
//
// Vite serves the client from localhost in dev and Vercel serves a static build
// in production, and those two need different servers, so the base is chosen by
// mode rather than spelled out at the call sites. VITE_API_BASE overrides both
// when set (see .env.example).
const DEV_API = 'http://localhost:3000'
const PRODUCTION_API = 'https://tubeko.onrender.com'

const configured = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? PRODUCTION_API : DEV_API)

// Trailing slashes are trimmed so `${API}/stream` cannot come out as `//stream`.
export const API = configured.replace(/\/+$/, '')

// Optional Cloudflare Worker that relays googlevideo bytes (see worker/). It adds
// the CORS headers the CDN omits, so the browser can pull media from the edge
// instead of through the Render server - which is what lifts the download
// concurrency ceiling off a 0.1-vCPU instance and its 5 GB/month egress. Unset,
// the client falls back to the server's /stream relay, which windows the file
// itself; when set, browserDownload.js does the windowing and the worker just
// passes each window through.
export const RELAY_API = (import.meta.env.VITE_RELAY_BASE || '').replace(/\/+$/, '')
