// Cloudflare Worker: a pass-through relay for googlevideo media URLs.
//
// Why this exists: /videoInfo hands the client direct googlevideo URLs, but the
// CDN sends no Access-Control-Allow-Origin header, so a browser cannot fetch
// them itself. Until now the Express server relayed the bytes (/stream), which
// made every download cost Render bandwidth and CPU - and that is the number
// that caps how many people can download at once. This Worker does the same job
// on Cloudflare's edge, which is the difference between a handful of concurrent
// downloads and as many as Cloudflare's network will carry.
//
// It deliberately does NOT walk the file in windows the way /stream does. A
// Worker on the free plan allows 50 external subrequests per invocation and a
// sliver of CPU time, and buffering bytes in JS would burn both on a large file.
// Passing response.body through untouched costs almost nothing and still scales.
// Windowing is the client's job instead: it asks for each window with a Range
// header, which this Worker forwards verbatim.
//
// Deploy it with `npx wrangler deploy` from worker/ - see worker/README.md.

const RELAY_HOST_PATTERN = /(^|\.)googlevideo\.com$/i

// Content-Length, Content-Range and Accept-Ranges are not CORS-safelisted
// response headers, so the browser can only read them - needed for progress and
// for learning the total size - if they are explicitly exposed.
const EXPOSED_HEADERS = 'Content-Length, Content-Range, Accept-Ranges'

// With ALLOWED_ORIGINS unset the relay is open, because the media itself is
// public and locking it down only matters if you want to stop other sites
// relaying through your quota. Set it to a comma-separated list of origins to
// restrict it to your own client.
const allowedOrigins = (env) =>
  String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

// Returns the CORS headers for this request, or null when the origin is not
// allowed. Vary: Origin keeps a shared cache from handing one origin's
// allow-header to another.
const corsHeaders = (env, origin) => {
  const allowed = allowedOrigins(env)
  let allowOrigin = '*'
  if (allowed.length > 0) {
    if (!allowed.includes(origin)) return null
    allowOrigin = origin
  }
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    // Range is the one header the client sends that is not safelisted, so a
    // preflight (if the browser decides to send one) has to be answered for it.
    'Access-Control-Allow-Headers': 'Range',
    'Access-Control-Expose-Headers': EXPOSED_HEADERS,
    // Let the browser cache the preflight instead of re-asking for every window.
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

const json = (body, status, headers) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })

const parseTarget = (raw) => {
  if (!raw) return null
  let url
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || !RELAY_HOST_PATTERN.test(url.hostname)) return null
  return url
}

export default {
  async fetch(request, env = {}) {
    const origin = request.headers.get('Origin') || ''
    const cors = corsHeaders(env, origin)
    if (!cors) return new Response('Origin not allowed', { status: 403 })

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405, headers: cors })
    }

    const { pathname, searchParams } = new URL(request.url)
    // Hitting the bare hostname is how you check the deploy went through.
    if (pathname !== '/stream') {
      return json(
        { ok: true, service: 'tubeko-relay', usage: 'GET /stream?url=<https googlevideo url>' },
        200,
        cors
      )
    }

    const target = parseTarget(searchParams.get('url'))
    if (!target) {
      return json({ error: 'Only https googlevideo.com URLs can be relayed' }, 403, cors)
    }

    const range = request.headers.get('Range')
    const upstream = await fetch(target.toString(), {
      headers: {
        // Forwarded verbatim: the client asks for one window at a time because
        // googlevideo throttles an unbounded request.
        ...(range ? { Range: range } : {}),
        // Without this the CDN may answer gzip-encoded, which makes the
        // Content-Length the browser reads for progress meaningless.
        'accept-encoding': 'identity',
      },
    })

    const headers = new Headers(upstream.headers)
    for (const [key, value] of Object.entries(cors)) headers.set(key, value)

    // The body is handed over as an opaque stream - never read or buffered here
    // - which is what keeps the Worker's CPU and memory near zero.
    return new Response(upstream.body, { status: upstream.status, headers })
  },
}
