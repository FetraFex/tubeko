// Load environment variables from .env before anything reads process.env.
// Pinned to this file's own directory rather than the working directory: started
// as `node server/server.js` from the repo root, dotenv would look for ./.env,
// find nothing, and bring the server up without its API key - announcing that
// only in a startup warning that reads like a detail about someone else's machine.
require('dotenv').config({ path: `${__dirname}/.env`, quiet: true })

const express = require("express")
const cors = require('cors')
const axios = require('axios')
const ytdl = require('ytdl-core');
const { spawn } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const os = require('os');
const fileUpload = require('express-fileupload');
const { resolveDownloadFormats } = require('./quality');

// Download Endpoint
const activeDownloads = new Map(); // Track active downloads

const app = express()
const PORT = process.env.PORT || 3000

// The client is served from a different origin depending on where it runs: Vite
// in dev, Vercel in production. The dev ports are listed literally; Vercel needs
// a pattern, because every deployment gets its own hostname (the production
// domain plus a fresh one per preview) and cors() tests a RegExp natively.
// ALLOWED_ORIGINS adds anything else, comma-separated: a client on some other
// host still reaches the server, but is refused the response without an entry.
const VERCEL_ORIGIN = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  VERCEL_ORIGIN,
  ...(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
];

// Content-Length is not a CORS-safelisted response header, so the browser can
// only read it (needed for download progress) if it is explicitly exposed.
app.use(cors({
  origin: ALLOWED_ORIGINS,
  exposedHeaders: [
    'Content-Length', 'Content-Range', 'Accept-Ranges',
    // /download/full reports which quality it actually used when it had to
    // resolve formats itself; the client can only read that if it is exposed.
    'X-Delivered-Quality', 'X-Delivered-Itags',
  ],
}));
app.use(fileUpload());
ffmpeg.setFfmpegPath(ffmpegPath);
app.use(express.json());

// Setting up API Key and the BASE_URL
// The key lives in server/.env (gitignored); see server/.env.example.
const API_KEY = process.env.YOUTUBE_API_KEY
const BASE_URL = "https://www.googleapis.com/youtube/v3"

if (!API_KEY) {
  console.warn(
    '[warn] YOUTUBE_API_KEY is not set. Copy server/.env.example to server/.env ' +
    'and add a YouTube Data API v3 key; /api/playlist and /api/video will fail without it.'
  )
}

// A playlist id is an opaque token of letters, digits, '-' and '_'. Validating it
// up front turns junk input into a clear 400 instead of a confusing API error.
const PLAYLIST_ID_PATTERN = /^[A-Za-z0-9_-]{10,}$/;
// 50 items per page * 40 pages = up to 2000 videos, a safety valve against
// runaway pagination on very large or malformed playlists.
const MAX_PLAYLIST_PAGES = 40;

// yt-dlp reports sizes like "6.70MiB". These helpers convert to bytes and back
// to a display string so the UI can show how much of the stream has arrived.
const SIZE_UNITS = { B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KIB: 1024, MIB: 1024 ** 2, GIB: 1024 ** 3, TIB: 1024 ** 4 };

const parseSize = (text) => {
  const m = String(text).trim().match(/^([\d.]+)\s*([KMGT]?i?B)$/i);
  if (!m) return null;
  const unit = SIZE_UNITS[m[2].toUpperCase()];
  return unit ? parseFloat(m[1]) * unit : null;
};

const formatSize = (bytes) => {
  if (!bytes || !isFinite(bytes)) return '';
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i++; }
  return `${value.toFixed(value < 10 ? 2 : 1)}${units[i]}`;
};

// YouTube reports a video's length as an ISO 8601 duration ("PT1H2M3S").
const parseIsoDuration = (iso) => {
  const m = String(iso || '').match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  const [, days, hours, minutes, seconds] = m;
  return (Number(days) || 0) * 86400 + (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60 + (Number(seconds) || 0);
};

// Seconds to the clock the playlist rows show: "5:48", or "1:02:03" once it runs
// past an hour. Null in, null out, so an unknown length stays unknown.
const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const clock = `${minutes}:${String(secs).padStart(2, '0')}`;
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : clock;
};

// playlistItems carries the titles but no length, so the lengths are asked for
// separately, in batches of 50 (the API's own ceiling) to keep the request count
// proportional to the list rather than to the video count. A batch that fails
// costs only the clock labels on those rows, never the playlist itself.
const attachDurations = async (videos) => {
  for (let i = 0; i < videos.length; i += 50) {
    const batch = videos.slice(i, i + 50);
    try {
      const response = await axios.get(`${BASE_URL}/videos`, {
        params: {
          part: 'contentDetails',
          id: batch.map((video) => video.videoId).join(','),
          key: API_KEY,
        },
      });

      const secondsById = new Map((response.data.items || []).map((item) => [
        item.id,
        parseIsoDuration(item.contentDetails?.duration),
      ]));

      for (const video of batch) {
        const seconds = secondsById.get(video.videoId);
        video.durationSeconds = Number.isFinite(seconds) ? seconds : null;
        video.duration = formatDuration(seconds);
      }
    } catch (error) {
      console.warn(`Video durations unavailable for ${batch.length} videos:`, error.message);
    }
  }

  return videos;
};

// Parse one yt-dlp progress line, e.g.
//   [download]  12.3% of    6.70MiB at  481.32KiB/s ETA 00:11
const parseYtDlpProgress = (line) => {
  const m = line.match(/\[download\]\s+([\d.]+)%\s+of\s+~?\s*([\d.]+\s*[KMGT]?i?B)/i);
  if (!m) return null;
  const percent = parseFloat(m[1]);
  const totalBytes = parseSize(m[2]);
  const speed = line.match(/at\s+([\d.]+\s*[KMGT]?i?B\/s)/i);
  const eta = line.match(/ETA\s+([\d:]+)/i);
  return {
    percent,
    total: formatSize(totalBytes),
    downloaded: totalBytes ? formatSize(totalBytes * (percent / 100)) : '',
    speed: speed ? speed[1].replace(/\s+/g, '') : '',
    eta: eta ? eta[1] : '',
  };
};

// YouTube cookies -------------------------------------------------------------
//
// The error a flagged host gets back says what to do about it: "Sign in to
// confirm you're not a bot... use --cookies for the authentication". A logged-in
// session is what clears that check, and unlike a token it also brings back the
// higher-resolution formats.
//
// The cookies are a Netscape export, arriving base64-encoded in
// YOUTUBE_COOKIES_B64 (or raw in YOUTUBE_COOKIES) so that a host holding them as
// a secret does not have to cope with tabs and newlines. They are written once,
// to a 0600 file in the temporary directory rather than into the repo, and are
// never logged: the point of a session cookie is that it stays secret.
const LOCAL_COOKIES_PATH = path.join(__dirname, 'cookies.txt');
const RUNTIME_COOKIES_PATH = path.join(os.tmpdir(), 'tubeko-yt-dlp-cookies.txt');

const writeCookiesFromEnv = () => {
  const encoded = process.env.YOUTUBE_COOKIES_B64;
  const raw = process.env.YOUTUBE_COOKIES;
  if (!encoded && !raw) return null;

  const contents = encoded
    ? Buffer.from(encoded, 'base64').toString('utf8')
    : raw.replace(/\\n/g, '\n');

  if (!contents.includes('youtube.com')) {
    console.warn('[cookies] the configured cookies never mention youtube.com - check the export');
  }

  try {
    fs.writeFileSync(RUNTIME_COOKIES_PATH, contents, { mode: 0o600 });
    return RUNTIME_COOKIES_PATH;
  } catch (error) {
    console.error(`[cookies] could not write the cookie file: ${error.message}`);
    return null;
  }
};

// Resolved once: the environment cannot change under a running process, and
// re-reading the file per request would only add a stat() to every call.
const cookies = { resolved: false, path: null, source: null };

const cookiesFile = () => {
  if (cookies.resolved) return cookies.path;
  cookies.resolved = true;

  const fromEnv = writeCookiesFromEnv();
  if (fromEnv) {
    cookies.path = fromEnv;
    cookies.source = process.env.YOUTUBE_COOKIES_B64 ? 'YOUTUBE_COOKIES_B64' : 'YOUTUBE_COOKIES';
  } else if (fs.existsSync(LOCAL_COOKIES_PATH)) {
    cookies.path = LOCAL_COOKIES_PATH;
    cookies.source = 'server/cookies.txt';
  }
  return cookies.path;
};

const cookieArgs = () => {
  const file = cookiesFile();
  return file ? ['--cookies', file] : [];
};

const logCookieState = () => {
  console.log(
    cookiesFile()
      ? `[cookies] using cookies from ${cookies.source}`
      : '[cookies] none configured - a flagged host will answer "Sign in to confirm you\'re not a bot"'
  );
};

// YouTube's bot check on a shared host ----------------------------------------
//
// From a datacenter IP (Render's, for one) YouTube answers yt-dlp's default
// clients with "Sign in to confirm you're not a bot": the address is flagged, so
// nothing about the request looks like a real client. A proof-of-origin token
// fixes that, and yt-dlp's guidance for a refused client is to pair one with the
// mweb client.
//
// scripts/setup-pot-provider.js fetches both halves during the build - a
// single-file server that mints the tokens, and the yt-dlp plugin that asks it
// for one - and neither lives in git. When they are missing (a dev checkout that
// has not run that script, or a platform with no published build) none of this
// reaches yt-dlp and the previous behaviour applies.
const POT_BINARY_PATH = path.join(__dirname, process.platform === 'win32' ? 'bgutil-pot.exe' : 'bgutil-pot');
const POT_PLUGIN_DIR = path.join(__dirname, 'plugins');
const POT_PLUGIN_ZIP = path.join(POT_PLUGIN_DIR, 'bgutil-ytdlp-pot-provider-rs.zip');
const POT_PORT = Number(process.env.POT_SERVER_PORT) || 4416;

// The provider is started once with the server and answers every request over
// loopback, so its tokens are cached for hours rather than minted per call.
//
// potAvailable is what the yt-dlp arguments follow: pointing them at a port
// nothing is serving buys only a failed token fetch per request, which reads in
// the logs as the very bot check this setup exists to avoid.
let potProvider = null;
let potAvailable = false;

// A pinged port can still be a wedged process, and "is it actually there" is the
// first thing to check when a host reports the bot check anyway.
const potProviderReachable = async () => {
  try {
    const response = await axios.get(`http://127.0.0.1:${POT_PORT}/ping`, { timeout: 2000 });
    return response.status === 200;
  } catch {
    return false;
  }
};

// mweb is the client these tokens are meant for, and the one yt-dlp's docs point
// at when a host is refused. With a cookie session that flips: the default client
// is then the tested path, and pinning mweb would only get in the way. Either way
// the choice stays overridable while the clients are being blocked one by one.
const activePlayerClient = () =>
  process.env.YTDLP_PLAYER_CLIENT || (cookiesFile() ? null : 'mweb');

// Outside Windows the binary also has to be executable, or spawning it fails and
// every request comes back as a failed token fetch rather than a missing
// provider that the code knows to work around.
const potProviderInstalled = () => {
  const mode = process.platform === 'win32' ? fs.constants.F_OK : fs.constants.X_OK;
  try {
    fs.accessSync(POT_BINARY_PATH, mode);
    return fs.statSync(POT_BINARY_PATH).size > 0 && fs.existsSync(POT_PLUGIN_ZIP);
  } catch {
    return false;
  }
};

// Appended to every yt-dlp call. Order matters: yt-dlp keeps only the last
// --extractor-args for a given provider, so a caller must not add its own for
// youtube or youtubepot-bgutilhttp after these.
const potYtDlpArgs = () => {
  if (!potProviderInstalled() || !potAvailable) return [];
  const client = activePlayerClient();
  return [
    '--plugin-dirs', POT_PLUGIN_DIR,
    // mweb cannot play anything until the player's JavaScript challenge is
    // solved, and the interpreter this process already runs on means the host
    // needs no extra runtime installed.
    '--js-runtimes', `node:${process.execPath}`,
    '--extractor-args', `youtubepot-bgutilhttp:base_url=http://127.0.0.1:${POT_PORT}`,
    ...(client ? ['--extractor-args', `youtube:player_client=${client}`] : []),
  ];
};

// If the provider dies, the plugin's request fails and the caller sees that
// error; the server itself stays up.
const startPotProvider = () => {
  if (!potProviderInstalled()) {
    console.log('[pot] no PO-token provider installed - yt-dlp runs without tokens');
    return;
  }

  potProvider = spawn(
    POT_BINARY_PATH,
    ['server', '--host', '127.0.0.1', '--port', String(POT_PORT)],
    { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }
  );
  potAvailable = true;

  potProvider.stdout.on('data', (data) => process.stdout.write(`[pot] ${data}`));
  potProvider.stderr.on('data', (data) => process.stderr.write(`[pot] ${data}`));
  potProvider.on('error', (error) => console.error(`[pot] could not start the provider: ${error.message}`));
  potProvider.on('exit', async (code, signal) => {
    potProvider = null;
    const where = `code ${code}${signal ? `, signal ${signal}` : ''}`;

    // A provider that was already running is a normal way to lose the race -
    // typically last run's copy still holding the port on a dev machine - and
    // its tokens are as good as ours, so there is nothing to fix.
    if (await potProviderReachable()) {
      console.warn(`[pot] our provider exited (${where}), but ${POT_PORT} is already served by another one - using it`);
      potAvailable = true;
      return;
    }

    potAvailable = false;
    console.warn(`[pot] provider exited (${where}) - yt-dlp will run without tokens`);
  });

  console.log(`[pot] token provider listening on 127.0.0.1:${POT_PORT}`);
};

// Without this, Ctrl+C in a dev terminal would leave the provider holding port
// 4416 and the next run would start against a token server it cannot bind.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (potProvider) potProvider.kill();
    process.exit(0);
  });
}

// Mints a token through the provider's command line - the one check that proves
// the provider works on this host rather than merely being installed. It boots
// the whole 50 MB binary, so /health only runs it when asked with ?deep=1.
let deepCheck = { at: 0, result: null };

const potMintCheck = () =>
  new Promise((resolve) => {
    if (!potProviderInstalled()) {
      return resolve({ ok: false, error: 'provider is not installed' });
    }

    const startedAt = Date.now();
    const child = spawn(
      POT_BINARY_PATH,
      ['--content-binding', 'dQw4w9WgXcQ'],
      { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }
    );

    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill();
      resolve({ ok: false, error: 'timed out after 20s' });
    }, 20000);

    child.stdout.on('data', (data) => {
      stdout += data;
    });
    child.stderr.on('data', (data) => {
      stderr += data;
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ ok: false, error: error.message });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      const milliseconds = Date.now() - startedAt;
      if (code === 0 && stdout.trim()) return resolve({ ok: true, milliseconds });
      // Only the last line: the token itself is not worth leaking into a log.
      const detail = stderr.trim().split('\n').pop();
      resolve({ ok: false, milliseconds, error: detail || `exit code ${code}` });
    });
  });

// Helper function to safely run yt-dlp
const runYtDlpCommand = (args, options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const ytdlpPath = path.join(
        __dirname,
        process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
      );

      if (!fs.existsSync(ytdlpPath)) {
        throw new Error(`yt-dlp binary not found at ${ytdlpPath}`);
      }

      const defaultArgs = [
        '--no-check-certificates',
        '--force-ipv4',
        '--retries', '5',
        '--fragment-retries', '5',
        '--socket-timeout', '15',
        '--add-header', 'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        '--add-header', 'Accept-Language:en-US,en;q=0.9',
        '--dump-json',
        // --no-warnings hides exactly the messages that explain a refused
        // request (the token plugin reports its failures as warnings), so it is
        // dropped when YTDLP_VERBOSE asks for that detail.
        ...(process.env.YTDLP_VERBOSE ? ['--verbose'] : ['--no-warnings']),
        ...cookieArgs(),
        ...potYtDlpArgs()
      ];

      const fullArgs = [...defaultArgs, ...args];

      // ✅ Print to confirm headers are intact
      console.log('Spawning yt-dlp with args:\n', fullArgs);

      const childProcess = spawn(ytdlpPath, fullArgs, {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false, // ✅ must be false
        windowsHide: true,
        ...options
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout.on('data', (data) => (stdout += data.toString()));
      childProcess.stderr.on('data', (data) => (stderr += data.toString()));

      childProcess.on('close', (code) => {
        if (code === 0) {
          try {
            resolve(stdout ? JSON.parse(stdout) : {});
          } catch (e) {
            resolve(stdout);
          }
        } else {
          reject(new Error(stderr || `Process failed with code ${code}`));
        }
      });

      childProcess.on('error', (err) => {
        reject(new Error(`Process error: ${err.message}`));
      });
    } catch (err) {
      reject(err);
    }
  });
};



// Cheap liveness probe. It exists mainly for the keep-alive ping
// (.github/workflows/keep-alive.yml) and any uptime monitor: Render's free
// instance sleeps after about fifteen minutes without traffic, so something has
// to knock periodically - and a check against the root would read a 404 as a
// broken deploy rather than a healthy one. uptimeSeconds doubles as proof of
// whether the instance has been kept awake or has just cold-started.
//
// It also answers the question a broken download raises next: is the token
// provider running on this host, and are cookies configured at all. `?deep=1`
// goes further and mints a token, which is the only way to know the provider
// works here rather than merely being installed.
app.get('/health', async (req, res) => {
  const pot = {
    installed: potProviderInstalled(),
    // running is our own child; available is what the yt-dlp arguments follow,
    // so a provider someone else started still counts.
    running: Boolean(potProvider),
    reachable: await potProviderReachable(),
    available: potAvailable,
    playerClient: activePlayerClient() || 'default',
  };

  if (req.query.deep) {
    // Cached for a minute: the check boots the provider binary, and nobody needs
    // a fresh answer per request - including whoever might point a loop at it.
    const now = Date.now();
    if (!deepCheck.result || now - deepCheck.at > 60000) {
      deepCheck = { at: now, result: await potMintCheck() };
    }
    pot.mint = { ...deepCheck.result, cachedSecondsAgo: Math.round((now - deepCheck.at) / 1000) };
  }

  res.json({
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    cookies: { configured: Boolean(cookiesFile()), source: cookies.source },
    pot,
  });
});

// SSE endpoint for progress updates
app.get('/download/progress/:id', (req, res) => {
  const { id } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(':heartbeat\n\n');
  }, 15000);

  // Add client to active downloads
  if (!activeDownloads.has(id)) {
    activeDownloads.set(id, new Set());
  }
  activeDownloads.get(id).add(res);

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    if (activeDownloads.has(id)) {
      activeDownloads.get(id).delete(res);
      if (activeDownloads.get(id).size === 0) {
        activeDownloads.delete(id);
      }
    }
  });
});



app.get('/api/playlist/:playlistId', async (req, res) => {
  const { playlistId } = req.params;
  let nextPageToken = req.query.pageToken || undefined;

  if (!API_KEY) {
    return res.status(503).json({
      error: 'YouTube API key is not configured on the server.',
      videos: [],
      totalVideos: 0,
    });
  }

  if (!PLAYLIST_ID_PATTERN.test(playlistId)) {
    return res.status(400).json({
      error: 'Invalid playlist ID',
      details: `"${playlistId}" is not a valid YouTube playlist ID.`,
      videos: [],
      totalVideos: 0,
    });
  }

  const videos = [];
  let pages = 0;

  try {
    do {
      const response = await axios.get(`${BASE_URL}/playlistItems`, {
        params: {
          part: 'snippet',
          maxResults: 50,
          playlistId: playlistId,
          pageToken: nextPageToken,
          key: API_KEY,
        },
      });

      for (const item of response.data.items || []) {
        const snippet = item.snippet || {};
        const videoId = snippet.resourceId?.videoId;

        // Playlists accumulate deleted/private videos over time. The API still
        // lists them, but they have no usable id/thumbnail, cannot be downloaded,
        // and (previously) made the whole request fail when thumbnails was absent.
        if (!videoId) continue;

        videos.push({
          title: snippet.title || 'Untitled',
          videoId,
          thumbnail:
            snippet.thumbnails?.medium?.url ||
            snippet.thumbnails?.default?.url ||
            `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        });
      }

      // Update nextPageToken for the next request
      nextPageToken = response.data.nextPageToken || undefined;
      pages += 1;
    } while (nextPageToken && pages < MAX_PLAYLIST_PAGES);

    // playlistItems returns the videos but no header, so the playlist's own title,
    // channel and total count are asked for separately. One extra API call, and the
    // list is still perfectly usable without it, hence the swallowed failure.
    let playlist = null;
    try {
      const metaResponse = await axios.get(`${BASE_URL}/playlists`, {
        params: { part: 'snippet,contentDetails', id: playlistId, key: API_KEY },
      });
      const meta = metaResponse.data.items?.[0];
      if (meta) {
        playlist = {
          title: meta.snippet?.title || 'Untitled playlist',
          channel: meta.snippet?.channelTitle || '',
          itemCount: meta.contentDetails?.itemCount ?? null,
        };
      }
    } catch (metaError) {
      console.warn(`Playlist metadata unavailable for ${playlistId}:`, metaError.message);
    }

    // Lengths last, after the list is known to be good, so a slow or failed
    // duration lookup cannot hold back the titles.
    await attachDurations(videos);

    // Send the combined list of videos as the response
    res.json({
      videos,
      totalVideos: videos.length,
      playlist,
      ...(nextPageToken ? { nextPageToken } : {}),
    });
  } catch (error) {
    // Surface what YouTube actually said instead of an opaque 500.
    const apiError = error.response?.data?.error;
    const status = error.response?.status;
    const reason = apiError?.errors?.[0]?.reason;
    let message = apiError?.message || error.message || 'Failed to fetch playlist';

    if (status === 404 || reason === 'playlistNotFound') {
      message = 'Playlist not found. It may have been deleted or made private.';
    } else if (status === 403) {
      message =
        'YouTube denied the request. The API key quota may be exhausted, or the playlist is private.';
    } else if (status === 400) {
      message = 'This playlist is invalid or no longer available.';
    }

    console.error(`Error fetching playlist ${playlistId}:`, apiError || error.message);

    res.status(status === 403 ? 403 : status === 404 ? 404 : 502).json({
      error: message,
      reason: reason || null,
      videos: [],
      totalVideos: 0,
    });
  }
});

app.get('/api/video/:videoId', async (req, res) => {
  const { videoId } = req.params;

  if (!API_KEY) {
    return res.status(503).json({ error: 'YouTube API key is not configured on the server.' });
  }

  try {
    const response = await axios.get(`${BASE_URL}/videos`, {
      params: {
        // contentDetails is what carries the length, and this route already makes
        // exactly one videos.list call, so the clock comes free.
        part: 'snippet,contentDetails',
        id: videoId,
        key: API_KEY,
      },
    });

    if (response.data.items && response.data.items.length > 0) {
      const item = response.data.items[0];
      const thumbnail = item.snippet.thumbnails.medium ? item.snippet.thumbnails.medium.url : (item.snippet.thumbnails.default ? item.snippet.thumbnails.default.url : '');
      const seconds = parseIsoDuration(item.contentDetails?.duration);

      res.json({
        videos: [{
          title: item.snippet.title,
          videoId: item.id,
          thumbnail: thumbnail,
          durationSeconds: Number.isFinite(seconds) ? seconds : null,
          duration: formatDuration(seconds),
        }],
        totalVideos: 1,
        // Same header fields as the playlist route so the client renders one shape.
        channel: item.snippet.channelTitle || '',
      });
    } else {
      res.status(404).json({ error: "Video not found" });
    }
  } catch (error) {
    const apiError = error.response?.data?.error;
    console.error('Error fetching video:', apiError || error.message);
    res.status(error.response?.status || 502).json({
      error: apiError?.message || 'Failed to fetch video',
      reason: apiError?.errors?.[0]?.reason || null,
    });
  }
});

/** Get a video information */
app.get('/videoInfo', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL required' });

    // runYtDlpCommand already includes --dump-json, headers, retries, etc.
    const info = await runYtDlpCommand([url]);

    // Validate response structure
    if (!info || !info.formats || !Array.isArray(info.formats)) {
      throw new Error('Invalid response from YouTube - missing formats data');
    }

    // Process formats with additional validation
    const formats = info.formats
      .map(format => {
        try {
          const hasVideo = format.vcodec && format.vcodec !== 'none';
          const hasAudio = format.acodec && format.acodec !== 'none';

          let type;
          if (hasVideo && hasAudio) type = 'video+audio';
          else if (hasVideo) type = 'video only';
          else if (hasAudio) type = 'audio only';
          else return null;

          // Calculate quality label
          let quality;
          if (format.height) {
            quality = `${format.height}p`;
          } else if (format.abr) {
            quality = `${Math.round(format.abr)}kbps`;
          } else {
            quality = format.format_note || (format.ext ? format.ext.toUpperCase() : 'N/A');
          }

          return {
            itag: format.format_id || 'N/A',
            quality,
            type,
            codec: {
              video: format.vcodec || 'none',
              audio: format.acodec || 'none'
            },
            filesize: format.filesize ? `${(format.filesize / (1024 * 1024)).toFixed(2)}MB` : 'N/A',
            // Raw byte count so a client can tell a complete download from a
            // truncated one (the string above is display-only). Only the exact
            // figure is sent: filesize_approx is an estimate, and rejecting a
            // complete download over an estimate would be worse than useless.
            filesizeBytes: format.filesize || null,
            // 'https' is direct media. 'm3u8_native' (HLS) and 'mhtml'
            // (storyboards) are manifests/thumbnails, not media files - a
            // browser that treats one as a video file cannot mux it.
            protocol: format.protocol || 'https',
            url: format.url || null  // Add direct URL if available
          };
        } catch (formatError) {
          console.warn('Error processing format:', formatError);
          return null;
        }
      })
      .filter(Boolean); // Remove null entries

    // Enhanced format merging with compatibility check
    const enhancedFormats = formats.map(format => {
      if (format.type === 'video only') {
        // Find best matching audio stream
        const compatibleAudio = formats
          .filter(f => f.type === 'audio only')
          .sort((a, b) => {
            // Prefer higher bitrate audio
            const aBitrate = parseInt(a.quality) || 0;
            const bBitrate = parseInt(b.quality) || 0;
            return bBitrate - aBitrate;
          })[0];

        return {
          ...format,
          canMerge: !!compatibleAudio,
          mergeWith: compatibleAudio?.itag || null,
          mergeQuality: compatibleAudio?.quality || null
        };
      }
      return format;
    });

    // Final response validation
    const response = {
      title: info.title || 'No title available',
      thumbnail: info.thumbnail || null,
      duration: info.duration_string || '0:00',
      formats: enhancedFormats,
      warnings: info._warnings || []  // Capture any yt-dlp warnings
    };

    // Check if we have any usable formats
    if (enhancedFormats.length === 0) {
      response.warnings.push('No playable formats found');
    }

    res.json(response);
  } catch (error) {
    console.error('Error in /videoInfo:', error);

    // Enhanced error messages
    let statusCode = 500;
    let errorMessage = error.message;

    if (error.message.includes('403')) {
      statusCode = 403;
      errorMessage = 'YouTube blocked the request. Try again later or use cookies.';
    } else if (error.message.includes('Invalid response')) {
      statusCode = 502;
    } else if (error.message.includes('URL required')) {
      statusCode = 400;
    }

    res.status(statusCode).json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});


/**
 * Single-pipeline download: fetch video + audio to temp files, merge with
 * ffmpeg, and stream the merged file back to the client.  Progress is pushed
 * over the existing SSE /download/progress/:id channel.
 */
app.get('/download/full', async (req, res) => {
  const { url, videoItag, audioItag, id, quality } = req.query;
  // Either the caller names the streams (the client already resolved them) or it
  // names a quality and lets this endpoint resolve them itself.
  if (!url || (!quality && (!videoItag || !audioItag))) {
    return res.status(400).json({ error: 'url, and either a quality or both itags, are required' });
  }

  const downloadId = id || Math.random().toString(36).substring(7);
  const ytdlpPath = path.join(__dirname, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
  const tempDir = path.join(os.tmpdir(), 'yt-full');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const ts = Date.now();
  const videoPath = path.join(tempDir, `video_${ts}.mp4`);
  const audioPath = path.join(tempDir, `audio_${ts}`);
  const mergedPath = path.join(tempDir, `merged_${ts}.mp4`);

  // Helper: broadcast an SSE message to all clients watching this downloadId
  const broadcast = (msg) => {
    if (!activeDownloads.has(downloadId)) return;
    for (const clientRes of activeDownloads.get(downloadId)) {
      clientRes.write(`data: ${JSON.stringify(msg)}\n\n`);
    }
  };

  // Helper: run a yt-dlp command that writes to a file (not stdout)
  const runToFile = (extraArgs, filePath, phase) => new Promise((resolve, reject) => {
    const args = [
      '--no-check-certificates', '--force-ipv4',
      '--retries', '5', '--fragment-retries', '5', '--socket-timeout', '15',
      '--add-header', 'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      '--no-warnings', '--newline',
      ...potYtDlpArgs(),
      ...extraArgs,
      '-o', filePath
    ];
    args.push(...cookieArgs());

    console.log('Executing yt-dlp:', args.join(' '));
    const proc = spawn(ytdlpPath, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false, windowsHide: true });

    // yt-dlp prints progress to stdout; only fatal errors go to stderr.
    let stdoutBuffer = '';
    proc.stdout.on('data', (chunk) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop(); // keep the trailing partial line
      for (const line of lines) {
        const parsed = parseYtDlpProgress(line);
        if (!parsed) continue;
        console.log(line.trim());
        broadcast({ type: 'progress', phase, ...parsed });
      }
    });

    proc.stderr.on('data', (d) => {
      const line = d.toString().trim();
      if (line.includes('ERROR')) {
        console.error(line);
        broadcast({ type: 'error', error: line });
      }
    });

    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) {
        broadcast({ type: 'progress', phase, percent: 100 });
        resolve();
      } else {
        reject(new Error(`yt-dlp exited with code ${code}`));
      }
    });
  });

  // Helper: run ffmpeg to merge two files
  const merge = (vPath, aPath, outPath) => new Promise((resolve, reject) => {
    broadcast({ type: 'phase', phase: 'merge' });
    ffmpeg()
      .input(vPath)
      .input(aPath)
      .outputOptions(['-c:v copy', '-c:a aac', '-movflags +faststart'])
      .output(outPath)
      .on('start', (cmd) => console.log('FFmpeg:', cmd))
      .on('progress', (p) => {
        // Before ffmpeg knows the stream duration it can report nonsense
        // (e.g. -180348016.8%), so only forward sane percentages.
        const percent = isFinite(p.percent) && p.percent >= 0 && p.percent <= 100 ? p.percent : 0;
        broadcast({ type: 'progress', phase: 'merge', percent, timemark: p.timemark || '' });
      })
      .on('end', () => { console.log('Merge complete'); resolve(); })
      .on('error', (err) => { console.error('FFmpeg error:', err); reject(err); })
      .run();
  });

  // Helper: clean up temp files (best-effort)
  const cleanup = () => {
    for (const f of [videoPath, audioPath, mergedPath]) {
      try { fs.unlinkSync(f); } catch (_) { /* already gone */ }
    }
  };

  // Ask yt-dlp for this video's formats and resolve the requested quality
  // against them. Only reached when the itags the client sent are unusable.
  const resolveFromQuality = async () => {
    const info = await runYtDlpCommand([url]);
    const formats = Array.isArray(info?.formats) ? info.formats : [];
    return resolveDownloadFormats(formats, quality);
  };

  // Set once this endpoint resolves anything itself, so the response can say
  // which quality it ended up delivering.
  let delivered = null;

  try {
    let videoStream = videoItag;
    let audioStream = audioItag;

    // No itags at all: the server owns the choice from the start.
    if (!videoStream || !audioStream) {
      const resolved = await resolveFromQuality();
      if (!resolved.video.itag) {
        throw new Error('No downloadable video format was found for this link');
      }
      videoStream = resolved.video.itag;
      audioStream = resolved.audio.itag || 'bestaudio';
      delivered = { quality: resolved.video.label, itags: `${videoStream}+${audioStream}` };
    }

    // 1 + 2. Download video, then audio, to temp files
    const fetchStreams = async () => {
      broadcast({ type: 'phase', phase: 'video' });
      await runToFile([url, '-f', videoStream], videoPath, 'video');

      broadcast({ type: 'phase', phase: 'audio' });
      await runToFile([url, '-f', audioStream], audioPath, 'audio');
    };

    try {
      await fetchStreams();
    } catch (firstError) {
      // A media link can expire, or a format can be dropped, between the
      // metadata request that chose these itags and the download itself.
      // Re-resolve from the requested quality and retry once rather than
      // failing the whole download. If somehow nothing matches either, the
      // original error is what the caller sees.
      if (!quality) throw firstError;

      console.warn(
        `[download/full] itags ${videoStream}+${audioStream} unusable (${firstError.message}); re-resolving for ${quality}`
      );

      const resolved = await resolveFromQuality();
      if (!resolved.video.itag) throw firstError;

      videoStream = resolved.video.itag;
      audioStream = resolved.audio.itag || 'bestaudio';
      delivered = { quality: resolved.video.label, itags: `${videoStream}+${audioStream}` };

      // A partly written file from the failed attempt would be resumed rather
      // than replaced, so start this one clean.
      for (const file of [videoPath, audioPath]) {
        try { fs.unlinkSync(file); } catch (_) { /* never created */ }
      }

      await fetchStreams();
    }

    // 3. Merge with ffmpeg
    await merge(videoPath, audioPath, mergedPath);

    // 4. Stream the merged file back
    const stat = fs.statSync(mergedPath);
    // Has to be set before the body starts arriving: the client reads these to
    // tell a fulfilled quality request from a fallback.
    if (delivered) {
      res.setHeader('X-Delivered-Quality', delivered.quality);
      res.setHeader('X-Delivered-Itags', delivered.itags);
    }
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"');
    const readStream = fs.createReadStream(mergedPath);
    readStream.pipe(res);
    readStream.on('end', () => {
      broadcast({ type: 'complete', filename: 'video.mp4' });
      cleanup();
    });
    readStream.on('error', (err) => {
      console.error('Read stream error:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Failed to send merged file' });
      cleanup();
    });
  } catch (err) {
    console.error('/download/full error:', err);
    broadcast({ type: 'error', error: err.message });
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Download failed' });
    }
    cleanup();
  }
});

/**
 * Pure byte relay for the media streams.
 *
 * /videoInfo returns direct googlevideo URLs per format, but YouTube's CDN sends
 * no Access-Control-Allow-Origin header, so the browser cannot fetch them
 * itself. This endpoint pipes the bytes through - no yt-dlp process, no temp
 * files, no ffmpeg - so the client can download and merge locally.
 *
 * Only googlevideo hosts are allowed, otherwise this would be an open proxy.
 */
const RELAY_HOST_PATTERN = /(^|\.)googlevideo\.com$/i;

// The CDN throttles unbounded requests to a crawl (measured: an open-ended
// `Range: bytes=0-` transfer runs at ~30KiB/s and never finishes), while
// bounded windows run at full link speed. So instead of proxying the stream
// wholesale, walk the file in windows and stitch them together.
const RELAY_WINDOW_BYTES = 4 * 1024 * 1024;

app.get('/stream', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url is required' });

  let target;
  try {
    target = new URL(url);
  } catch {
    return res.status(400).json({ error: 'url is not a valid URL' });
  }

  if (target.protocol !== 'https:' || !RELAY_HOST_PATTERN.test(target.hostname)) {
    return res.status(403).json({ error: 'Only https googlevideo.com URLs can be relayed' });
  }

  const requestWindow = (start, end) => axios.get(target.toString(), {
    responseType: 'stream',
    timeout: 30000,
    maxRedirects: 5,
    validateStatus: () => true,
    headers: {
      range: `bytes=${start}-${end}`,
      // Keeps Content-Length meaningful, which the client's progress relies on.
      'accept-encoding': 'identity',
    },
  });

  // Read one window into memory before writing it out. Buffering is what makes
  // the retry below safe: a window that dies half way through can be fetched
  // again from its start without the client ever seeing duplicate or missing
  // bytes. Windows are 4MB, so this is bounded.
  const readWindow = async (start, end) => {
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const upstream = await requestWindow(start, end);
        if (upstream.status !== 200 && upstream.status !== 206) {
          upstream.data.destroy();
          throw new Error(`YouTube responded with ${upstream.status}`);
        }
        const chunks = [];
        for await (const chunk of upstream.data) chunks.push(chunk);
        return { headers: upstream.headers, body: Buffer.concat(chunks) };
      } catch (error) {
        // The CDN resets throttled connections (ECONNRESET) and drops slow
        // ones, so a single bad window used to truncate the whole download.
        lastError = error;
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
      }
    }
    throw lastError;
  };

  // A bodyless GET emits 'close' on the request immediately, so watch the
  // response instead to notice the browser going away.
  let clientGone = false;
  res.on('close', () => {
    if (!res.writableEnded) clientGone = true;
  });

  try {
    let offset = 0;
    let total = 0;

    while (!total || offset < total) {
      const end = total ? Math.min(offset + RELAY_WINDOW_BYTES - 1, total - 1) : offset + RELAY_WINDOW_BYTES - 1;
      let window;
      try {
        window = await readWindow(offset, end);
      } catch (error) {
        if (!res.headersSent) {
          return res.status(502).json({ error: 'Failed to relay stream', details: error.message });
        }
        throw error;
      }
      if (!total) {
        const range = window.headers['content-range'];
        // Content-Range looks like "bytes 0-4194303/18642971"; the total after
        // the slash is what lets the browser show a real progress bar.
        total = Number(range && range.split('/')[1]) || Number(window.headers['content-length']) || 0;
        res.status(200);
        res.setHeader('Content-Type', window.headers['content-type'] || 'application/octet-stream');
        res.setHeader('Accept-Ranges', 'bytes');
        if (total) res.setHeader('Content-Length', total);
      }

      const written = window.body.length;
      if (written === 0) break; // no progress; stop rather than spin

      // Honour backpressure, otherwise a big file buffers server-side.
      if (!res.write(window.body)) {
        await new Promise((resolve) => res.once('drain', resolve));
      }

      if (clientGone) return;
      offset += written;
    }

    res.end();
  } catch (error) {
    console.error('/stream error:', error.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to relay stream', details: error.message });
    } else if (!res.writableEnded) {
      res.destroy(error);
    }
  }
});

// Add this after your /api/playlist/:playlistId route
app.get('/download', async (req, res) => {
  const { url, itag, id } = req.query;
  if (!url || !itag) {
    return res.status(400).json({ error: 'URL and itag are required' });
  }

  const downloadId = id || Math.random().toString(36).substring(7);
  const ytdlpPath = path.join(__dirname, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

  // Verify yt-dlp exists
  if (!fs.existsSync(ytdlpPath)) {
    console.error(`yt-dlp not found at: ${ytdlpPath}`);
    return res.status(500).json({
      error: 'Internal server error - yt-dlp missing',
      details: `Could not find yt-dlp at ${ytdlpPath}`
    });
  }

  // Build robust download command
  const args = [
    url,
    '-f', itag,
    '--no-warnings',
    '--newline',
    '--force-ipv4',
    '--socket-timeout', '30',
    '--retries', '5',
    '--fragment-retries', '5',
    '--throttled-rate', '1M',
    '--add-header', 'User-Agent:"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"',
    ...potYtDlpArgs(),
    '-o', '-'
  ];



  args.push(...cookieArgs());

  console.log('Executing yt-dlp with args:', args); // Debug logging

  const childProcess = spawn(ytdlpPath, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    // The arguments are already an array, so a shell would only re-split them -
    // and the paths potYtDlpArgs() adds can contain spaces.
    shell: false,
    windowsHide: true
  });

  let hasData = false;
  let downloadFailed = false;

  res.header('Content-Disposition', 'attachment; filename="video.mp4"');
  res.header('Content-Type', 'video/mp4');

  // Handle data stream
  childProcess.stdout.on('data', (chunk) => {
    hasData = true;
    res.write(chunk);
  });

  childProcess.stdout.on('end', () => {
    if (!hasData && !downloadFailed) {
      console.error('No data received from yt-dlp');
      if (!res.headersSent) {
        res.status(500).json({ error: 'No video data received' });
      }
    } else if (!downloadFailed) {
      res.end();
    }
  });

  // Handle errors
  childProcess.stderr.on('data', (data) => {
    const output = data.toString().trim();

    if (output.startsWith('[download]')) {
      console.log(output);
      // Send progress to all connected clients
      if (activeDownloads.has(downloadId)) {
        for (const clientRes of activeDownloads.get(downloadId)) {
          clientRes.write(`data: ${JSON.stringify({
            type: 'progress',
            data: output
          })}\n\n`);
        }
      }
    }

    if (output.includes('Le chemin d\'accès spécifié est introuvable')) {
      downloadFailed = true;
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal server error - path not found',
          details: 'yt-dlp executable path is incorrect'
        });
      }
      childProcess.kill();
    } else if (output.includes('ERROR')) {
      downloadFailed = true;
      if (!res.headersSent) {
        res.status(500).json({ error: output });
      }
    }
  });

  childProcess.on('error', (error) => {
    console.error('Process error:', error);
    downloadFailed = true;
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Download failed',
        details: error.message
      });
    }
  });

  childProcess.on('close', (code) => {
    if (code !== 0 && !downloadFailed && !res.headersSent) {
      res.status(500).json({
        error: `Process exited with code ${code}`,
        details: 'Unknown error occurred'
      });
    }
  });
});

app.get('/download/audio', async (req, res) => {
  let childProcess;
  try {
    const { url, itag, id } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const downloadId = id || Math.random().toString(36).substring(7);
    const ytdlpPath = path.join(
      __dirname,
      process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
    );

    if (!fs.existsSync(ytdlpPath)) {
      throw new Error(`yt-dlp binary not found at ${ytdlpPath}`);
    }

    const args = [
      url,
      '--no-warnings',
      '--force-ipv4',
      '--socket-timeout', '30',
      '--extract-audio',
      '--audio-format', 'mp3',
      '-f', itag || 'bestaudio',
      ...cookieArgs(),
      ...potYtDlpArgs(),
      '-o', '-'
    ];

    childProcess = spawn(ytdlpPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      windowsHide: true
    });

    // Track if we got any data
    let hasData = false;

    // Set headers
    res.header('Content-Disposition', 'attachment; filename="audio.mp3"');
    res.header('Content-Type', 'audio/mpeg');

    // Pipe stdout to response
    childProcess.stdout.on('data', (chunk) => {
      hasData = true;
      res.write(chunk); // Manually write chunks instead of .pipe()
    });

    childProcess.stdout.on('end', () => {
      if (!hasData) {
        throw new Error('No audio data received from yt-dlp');
      }
      res.end();
    });

    childProcess.stderr.on('data', (data) => {
      const output = data.toString().trim();

      if (output.startsWith('[download]')) {
        console.log(output);
        // Send progress to all connected clients
        if (activeDownloads.has(downloadId)) {
          for (const clientRes of activeDownloads.get(downloadId)) {
            clientRes.write(`data: ${JSON.stringify({
              type: 'progress',
              data: output
            })}\n\n`);
          }
        }
      }

      if (output.includes('ERROR') && !res.headersSent) {
        res.status(500).json({ error: output });
        childProcess.kill();
      }
    });

    childProcess.on('error', (error) => {
      console.error('Process error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Download failed', details: error.message });
      }

      if (activeDownloads.has(downloadId)) {
        for (const clientRes of activeDownloads.get(downloadId)) {
          clientRes.write(`data: ${JSON.stringify({
            type: 'error',
            error: error.message
          })}\n\n`);
          clientRes.end();
        }
        activeDownloads.delete(downloadId);
      }
    });

    childProcess.on('close', (code) => {
      if (code !== 0 && !res.headersSent) {
        res.status(500).json({ error: `Process exited with code ${code}` });
      }

      if (activeDownloads.has(downloadId)) {
        for (const clientRes of activeDownloads.get(downloadId)) {
          clientRes.write(`data: ${JSON.stringify({
            type: 'complete',
            code: code
          })}\n\n`);
          clientRes.end();
        }
        activeDownloads.delete(downloadId);
      }
    });

  } catch (error) {
    console.error('Audio download error:', error);
    if (childProcess) childProcess.kill();
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Audio download failed',
        details: error.message
      });
    }
  }
});

app.post('/merge', async (req, res) => {
  try {
    // Check if files were uploaded
    if (!req.files || !req.files.video || !req.files.audio) {
      return res.status(400).json({
        success: false,
        error: 'Both video and audio files are required'
      });
    }

    // Create temporary directory
    const tempDir = path.join(os.tmpdir(), 'yt-merge');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Generate unique filenames
    const timestamp = Date.now();
    const videoPath = path.join(tempDir, `video_${timestamp}.mp4`);
    const audioPath = path.join(tempDir, `audio_${timestamp}.mp3`);
    const outputPath = path.join(tempDir, `merged_${timestamp}.mp4`);


    // Save files
    await req.files.video.mv(videoPath);
    await req.files.audio.mv(audioPath);

    // Merge files
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(videoPath)
        .input(audioPath)
        .outputOptions([
          '-c:v copy',        // Copy video stream
          '-c:a aac',         // Convert audio to AAC
          '-movflags +faststart' // Enable streaming
        ])
        .output(outputPath)
        .on('start', (command) => console.log('FFmpeg command:', command))
        .on('progress', (progress) => console.log('Processing:', progress))
        .on('end', () => {
          console.log('Merge completed successfully');
          resolve();
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          reject(new Error('Failed to merge files'));
        })
        .run();
    });

    // Respond with success
    res.json({
      message: 'Video downloaded and audio merged successfully',
      success: true,
      filename: `merged_${timestamp}.mp4`
    });

  } catch (error) {
    console.error('Merge error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Merge failed'
    });
  }
});

// Download merged file endpoint
app.get('/download-merged', (req, res) => {
  const { filename } = req.query;
  if (!filename) {
    return res.status(400).send('Filename is required');
  }

  const tempDir = path.join(os.tmpdir(), 'yt-merge');
  const filePath = path.join(tempDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  res.download(filePath, 'merged_video.mp4', (err) => {
    if (err) {
      console.error('Download error:', err);
    }
    // Optionally clean up the file after download
    // fs.unlinkSync(filePath);
  });
});

startPotProvider();
logCookieState();

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
})