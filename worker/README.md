# Tubeko relay

A Cloudflare Worker that relays googlevideo bytes with the CORS headers the CDN
omits, so the browser can pull media straight from Cloudflare's edge instead of
through the Render server.

## Why

`/videoInfo` hands the client direct googlevideo URLs, but googlevideo sends no
`Access-Control-Allow-Origin`, so a browser cannot fetch them. The server's
`/stream` route existed to fix that, and every download paid for it in Render
bandwidth (5 GB/month on the Hobby plan) and CPU (0.1 vCPU). The number of people
who could download at once was whichever of those ran out first.

This Worker does the same job on Cloudflare, where the free plan gives 100,000
requests/day and does not bill egress.

## How it works

The Worker is a **pass-through**, not a second `/stream`:

- it validates that the `url` parameter is an `https` `googlevideo.com` URL,
- forwards the client's `Range` header upstream (and asks for `identity`
  encoding, so `Content-Length` means something to the client's progress bar),
- adds the CORS headers, and
- hands the upstream `response.body` over untouched.

It never buffers or windows the file. That is deliberate: a Worker on the free
plan allows **50 external subrequests per invocation** and only a sliver of CPU
time, and copying bytes in JS would spend both on a large video. Passing the body
through costs almost nothing.

Because the Worker does not window, **the client does**. `browserDownload.js`
asks for one 4 MB window at a time via `Range`, which is exactly what the server
route used to do internally. Each window is a separate Worker invocation with a
single subrequest, so the 50-subrequest limit is never approached.

## Deploy

```bash
cd worker
npx wrangler deploy
```

Wrangler prints the deployment URL (`https://tubeko-relay.<subdomain>.workers.dev`).

Then point the client at it - on Vercel, set the environment variable, or put it
in `client/.env` for local work:

```
VITE_RELAY_BASE=https://tubeko-relay.<subdomain>.workers.dev
```

Until `VITE_RELAY_BASE` is set, the client keeps using the server's `/stream`
relay, so nothing breaks if the Worker is not deployed yet.

Check the deploy by visiting the bare URL: it should answer
`{"ok":true,"service":"tubeko-relay",...}`.

## Limits worth knowing

| Limit (free plan) | Value | What it means here |
| --- | --- | --- |
| Requests/day | 100,000 | one per 4 MB window, so ~4,000 100 MB downloads/day |
| Subrequests per invocation | 50 | we use 1 |
| CPU time per request | 10 ms | the body is passed through, not copied |
| Memory per isolate | 128 MB | nothing is buffered |

Locked down to your own client with `ALLOWED_ORIGINS` in `wrangler.toml`; left
empty it accepts any origin, which is fine for public media but lets other sites
spend your daily quota.

## Relationship to `/stream`

`/stream` is not removed. It is the fallback when `VITE_RELAY_BASE` is unset and
is still the only relay that needs no third-party account. Moving the relay here
does not stop Render serving `/videoInfo`, the server-side merge path, or the
YouTube Data API routes.
