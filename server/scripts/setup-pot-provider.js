// Fetches the PO-token provider that lets yt-dlp get past YouTube's bot check.
//
// YouTube answers a shared host's IP (Render's, for one) with "Sign in to
// confirm you're not a bot" for the clients yt-dlp uses by default: the address
// is flagged, so the requests have to look like they came from a real client. A
// proof-of-origin token does that, and yt-dlp's own guidance for a refused
// client is to pair a token with the mweb client.
//
// It takes two pieces, neither of which belongs in git: a single-file provider
// server that mints the tokens, and the yt-dlp plugin that asks it for one.
// server.js passes them to yt-dlp only when both are present, so a dev checkout
// that has not run this script behaves exactly as before.
//
// Runs as part of `npm run build`, and does nothing once both are in place.

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const BINARY_NAME = process.platform === 'win32' ? 'bgutil-pot.exe' : 'bgutil-pot'
const BINARY_PATH = path.join(ROOT, BINARY_NAME)
const PLUGIN_DIR = path.join(ROOT, 'plugins')
const PLUGIN_NAME = 'bgutil-ytdlp-pot-provider-rs.zip'
const PLUGIN_PATH = path.join(PLUGIN_DIR, PLUGIN_NAME)
const RELEASE_URL = 'https://github.com/jim60105/bgutil-ytdlp-pot-provider-rs/releases/latest/download'

// The provider is a Rust program, so every target has an asset of its own. The
// list stops at what the project actually publishes: 32-bit ARM and musl hosts
// are absent on purpose, and asking for a binary the host cannot run would only
// move the failure to spawn time.
const assetFor = (platform, arch) => {
  if (platform === 'win32') return arch === 'x64' ? 'bgutil-pot-windows-x86_64.exe' : null
  if (platform === 'darwin') {
    if (arch === 'arm64') return 'bgutil-pot-macos-aarch64'
    if (arch === 'x64') return 'bgutil-pot-macos-x86_64'
    return null
  }
  if (platform === 'linux') {
    if (arch === 'arm64') return 'bgutil-pot-linux-aarch64'
    if (arch === 'x64') return 'bgutil-pot-linux-x86_64'
    return null
  }
  return null
}

// Elsewhere the binary also has to be executable, or spawning it fails with
// EACCES; on Windows only its presence matters.
const alreadyInstalled = () => {
  const mode = process.platform === 'win32' ? fs.constants.F_OK : fs.constants.X_OK
  try {
    fs.accessSync(BINARY_PATH, mode)
    if (fs.statSync(BINARY_PATH).size === 0) return false
  } catch {
    return false
  }
  return fs.existsSync(PLUGIN_PATH)
}

// The provider is around 50 MB, so this is the slow part of a build. The bytes
// are read whole and written in one go: a dropped connection then leaves no
// half-written binary for the next build to treat as finished. The timeout is
// what stops a stalled download from hanging the build until the platform
// kills it.
const DOWNLOAD_TIMEOUT_MS = 300000

const download = async (url, dest) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })
  if (!response.ok) {
    throw new Error(`download failed: ${response.status} ${response.statusText} for ${url}`)
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  if (!bytes.length) throw new Error(`download was empty: ${url}`)

  fs.writeFileSync(dest, bytes)
  if (process.platform !== 'win32') fs.chmodSync(dest, 0o755)
  return bytes.length
}

const megabytes = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`

const main = async () => {
  if (alreadyInstalled()) {
    console.log(`[pot] ${BINARY_NAME} and ${PLUGIN_NAME} are already present, nothing to do`)
    return
  }

  if (typeof fetch !== 'function') {
    throw new Error('Node 18 or newer is required (no global fetch)')
  }

  const asset = assetFor(process.platform, process.arch)
  if (!asset) {
    // Not fatal, and not worth failing a deploy over: without a provider the
    // site still works from an IP YouTube has not flagged, which is every dev
    // machine and any host on a residential range.
    console.warn(
      `[pot] no PO-token provider build for ${process.platform}/${process.arch} - ` +
      'yt-dlp will run without tokens'
    )
    return
  }

  console.log(`[pot] downloading ${asset} for ${process.platform}/${process.arch}`)
  const binarySize = await download(`${RELEASE_URL}/${asset}`, BINARY_PATH)
  console.log(`[pot] wrote ${BINARY_NAME} (${megabytes(binarySize)})`)

  fs.mkdirSync(PLUGIN_DIR, { recursive: true })
  await download(`${RELEASE_URL}/${PLUGIN_NAME}`, PLUGIN_PATH)
  console.log(`[pot] wrote plugins/${PLUGIN_NAME}`)

  if (!alreadyInstalled()) {
    throw new Error('the provider was downloaded but is not usable - check file permissions')
  }
}

// Only the download itself is fatal: without the provider a flagged host is back
// to "Sign in to confirm you're not a bot", which is the failure this whole
// script exists to fix, and a build that says so is easier to act on than a
// deploy that quietly serves nothing.
if (require.main === module) {
  main().catch((error) => {
    console.error(`[pot] ${error.message}`)
    process.exit(1)
  })
}

module.exports = { assetFor, download, alreadyInstalled, BINARY_NAME, BINARY_PATH, PLUGIN_DIR, PLUGIN_NAME, PLUGIN_PATH }
