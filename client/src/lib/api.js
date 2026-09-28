// Where the Express server lives.
//
// Vercel serves only the static client, so the deployed build points at the
// real host through VITE_API_BASE (see .env.example). Locally nothing is
// configured: the fallback is the port the server has always run on, so dev
// keeps working without an .env file.
export const API = (import.meta.env.VITE_API_BASE || 'http://localhost:3000').replace(/\/+$/, '')
