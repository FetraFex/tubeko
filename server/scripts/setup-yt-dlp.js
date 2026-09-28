// Fetches the yt-dlp binary for the machine this build runs on.
//
// The repository carries yt-dlp.exe for the Windows machine the server was
// developed on, but server.js looks for a bare `yt-dlp` everywhere else, so a
// Linux host would have nothing to spawn and every endpoint that shells out to
// it - /videoInfo, /download/full, /stream's source - would fail at runtime.
//
// Runs as part of `npm run build`, and does nothing once the binary is in place,
// so it is safe to leave in the build command of a host that caches it.

const fs = require('fs')
const path = require('path')

const BINARY_NAME = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
const BINARY_PATH = path.join(__dirname, '..', BINARY_NAME)
const RELEASE_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download'

// The release assets are split by platform because the plain `yt-dlp` download
// is a Python zipapp and would need python3 on the host. These builds are
// self-contained, and each is saved under the name server.js expects.
//
// 32-bit ARM is deliberately absent: it ships only as a .zip, and unpacking that
// here would need an archiver the host may not have. (Alpine/musl hosts want
// yt-dlp_musllinux, which is not selected for automatically either.)
const assetFor = (platform, arch) => {
  if (platform === 'win32') return 'yt-dlp.exe'
  if (platform === 'darwin') return 'yt-dlp_macos'
  if (platform === 'linux') {
    if (arch === 'arm64') return 'yt-dlp_linux_aarch64'
    if (arch === 'x64') return 'yt-dlp_linux'
    // Anything else is null rather than a fallback. The x86_64 build would be
    // the wrong architecture and only fail later, at spawn time.
    return null
  }
  return null
}

// On Windows the only thing that matters is that the file is there; elsewhere it
// also has to be executable, or spawning it fails with EACCES.
const alreadyInstalled = () => {
  const mode = process.platform === 'win32' ? fs.constants.F_OK : fs.constants.X_OK
  try {
    fs.accessSync(BINARY_PATH, mode)
    return fs.statSync(BINARY_PATH).size > 0
  } catch {
    return false
  }
}

// The bytes are read whole and written in one go, so a dropped connection can
// never leave a half-written binary that the next build would mistake for a
// finished one. The timeout matters more than it looks: without it a stalled
// download hangs the build until the platform kills it.
const DOWNLOAD_TIMEOUT_MS = 180000

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

const main = async () => {
  if (alreadyInstalled()) {
    console.log(`[yt-dlp] ${BINARY_NAME} is already present, nothing to do`)
    return
  }

  if (typeof fetch !== 'function') {
    throw new Error('Node 18 or newer is required (no global fetch)')
  }

  const asset = assetFor(process.platform, process.arch)
  if (!asset) {
    throw new Error(
      `no yt-dlp release for ${process.platform}/${process.arch} - ` +
      `install it yourself as ${BINARY_NAME} next to server.js`
    )
  }

  console.log(`[yt-dlp] downloading ${asset} for ${process.platform}/${process.arch}`)
  const size = await download(`${RELEASE_URL}/${asset}`, BINARY_PATH)
  console.log(`[yt-dlp] wrote ${BINARY_NAME} (${(size / 1024 / 1024).toFixed(1)} MB)`)
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[yt-dlp] ${error.message}`)
    process.exit(1)
  })
}

module.exports = { assetFor, download, BINARY_NAME, BINARY_PATH, alreadyInstalled }
