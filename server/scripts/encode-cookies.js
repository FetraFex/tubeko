// Turns a browser's YouTube cookie export into the value YOUTUBE_COOKIES_B64
// wants, refusing to hand back something that would only fail later on the host.
//
// Usage:
//   node scripts/encode-cookies.js cookies.txt           prints the base64 to copy
//   node scripts/encode-cookies.js cookies.txt --check    report only, no secret
//
// The export has to be a Netscape cookies file (the format a "cookies.txt"
// extension writes), not the JSON that other extensions produce - a host would
// accept either silently and then fail every download with the bot check, which
// is the exact failure this is meant to end.

const fs = require('fs')
const path = require('path')

// Netscape rows are tab-separated: domain, includeSubdomains, path, secure,
// expiry (epoch seconds, 0 for a session cookie), name, value. Rows for
// HttpOnly cookies are commented out with this prefix, so they are cookies too.
const HTTP_ONLY_PREFIX = '#HttpOnly_'

const parseRows = (text) =>
  text
    .split(/\r?\n/)
    .filter((line) => line.trim() && (!line.startsWith('#') || line.startsWith(HTTP_ONLY_PREFIX)))
    .map((line) => {
      const [domain, , , , expiry, name] = line.replace(HTTP_ONLY_PREFIX, '').split('\t')
      return { domain: (domain || '').trim(), expiry: Number(expiry) || 0, name: (name || '').trim() }
    })
    .filter((row) => row.domain)

// Cookies that mean "this is a signed-in session" rather than "this browser has
// visited once". The bot check is answered by a session, so an export without
// one is worth refusing before it reaches the host.
const SESSION_COOKIE_NAMES = ['SID', 'HSID', 'SSID', 'APISID', 'SAPISID', '__Secure-1PSID', '__Secure-3PSID', 'LOGIN_INFO']

const main = () => {
  const args = process.argv.slice(2)
  const checkOnly = args.includes('--check')
  const file = args.find((arg) => !arg.startsWith('--'))

  if (!file) {
    console.error('[cookies] which file? pass the exported cookies.txt')
    process.exit(1)
  }

  const filePath = path.resolve(file)
  if (!fs.existsSync(filePath)) {
    console.error(`[cookies] ${filePath} does not exist`)
    process.exit(1)
  }

  const text = fs.readFileSync(filePath, 'utf8')
  if (!text.trim()) {
    console.error('[cookies] the file is empty')
    process.exit(1)
  }

  if (/^\s*[[{]/.test(text)) {
    console.error('[cookies] this looks like JSON, not a Netscape cookies file - export it as cookies.txt')
    process.exit(1)
  }

  const rows = parseRows(text)
  const youtube = rows.filter((row) => /(^|\.)youtube\.com$/.test(row.domain) || /(^|\.)google\.com$/.test(row.domain))
  const now = Math.floor(Date.now() / 1000)
  const expired = youtube.filter((row) => row.expiry > 0 && row.expiry < now)
  const live = youtube.filter((row) => row.expiry === 0 || row.expiry >= now)
  const sessions = youtube.filter((row) => SESSION_COOKIE_NAMES.includes(row.name) && (row.expiry === 0 || row.expiry >= now))

  console.log(`[cookies] ${rows.length} rows, ${youtube.length} for youtube.com/google.com (${live.length} still valid)`)
  console.log(
    sessions.length
      ? `[cookies] signed-in session found: ${[...new Set(sessions.map((row) => row.name))].join(', ')}`
      : '[cookies] no signed-in session cookie found - this export looks like a logged-out one'
  )

  if (expired.length) {
    console.log(`[cookies] ${expired.length} of them have already expired and will not be sent`)
  }
  if (!live.length) {
    console.log('[cookies] nothing here is still valid - export again, and keep the browser window closed afterwards')
  }

  // A session this weak is worth stopping on: it would be accepted by the host,
  // reported as "configured", and still refused by YouTube.
  if (!sessions.length) {
    console.error('[cookies] refusing to encode: log in to youtube.com first, then export')
    process.exit(1)
  }

  if (checkOnly) {
    console.log('[cookies] looks usable. Re-run without --check to get the base64 value.')
    return
  }

  const encoded = Buffer.from(text, 'utf8').toString('base64')
  console.log(`\nYOUTUBE_COOKIES_B64 (${encoded.length} characters, one line):\n`)
  console.log(encoded)
}

main()
