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
