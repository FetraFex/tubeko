// Load environment variables from .env before anything reads process.env.
require('dotenv').config({ quiet: true })

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

// Download Endpoint
const activeDownloads = new Map(); // Track active downloads

const app = express()
const PORT = process.env.PORT || 3000

// Content-Length is not a CORS-safelisted response header, so the browser can
// only read it (needed for download progress) if it is explicitly exposed.
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  exposedHeaders: ['Content-Length', 'Content-Range', 'Accept-Ranges'],
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
        '--no-warnings'
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

    // Send the combined list of videos as the response
    res.json({
      videos,
      totalVideos: videos.length,
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
        part: 'snippet',
        id: videoId,
        key: API_KEY,
      },
    });

    if (response.data.items && response.data.items.length > 0) {
      const item = response.data.items[0];
      const thumbnail = item.snippet.thumbnails.medium ? item.snippet.thumbnails.medium.url : (item.snippet.thumbnails.default ? item.snippet.thumbnails.default.url : '');
      
      res.json({
        videos: [{
          title: item.snippet.title,
          videoId: item.id,
          thumbnail: thumbnail,
        }],
        totalVideos: 1,
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
  const { url, videoItag, audioItag, id } = req.query;
  if (!url || !videoItag || !audioItag) {
    return res.status(400).json({ error: 'url, videoItag, and audioItag are required' });
  }

  const downloadId = id || Math.random().toString(36).substring(7);
  const ytdlpPath = path.join(__dirname, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
  const cookiesPath = path.join(__dirname, 'cookies.txt');
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
      ...extraArgs,
      '-o', filePath
    ];
    if (fs.existsSync(cookiesPath)) args.push('--cookies', cookiesPath);

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

  try {
    // 1. Download video to temp file
    broadcast({ type: 'phase', phase: 'video' });
    await runToFile([url, '-f', videoItag], videoPath, 'video');

    // 2. Download audio to temp file
    broadcast({ type: 'phase', phase: 'audio' });
    await runToFile([url, '-f', audioItag], audioPath, 'audio');

    // 3. Merge with ffmpeg
    await merge(videoPath, audioPath, mergedPath);

    // 4. Stream the merged file back
    const stat = fs.statSync(mergedPath);
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

  // Copy one window to the client, honouring backpressure. Resolves with the
  // number of bytes actually written.
  const pipeWindow = (stream) => new Promise((resolve, reject) => {
    let bytes = 0;
    stream.on('data', (chunk) => {
      bytes += chunk.length;
      if (!res.write(chunk)) {
        stream.pause();
        res.once('drain', () => stream.resume());
      }
    });
    stream.on('end', () => resolve(bytes));
    stream.on('error', reject);
  });

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
      const upstream = await requestWindow(offset, end);

      if (upstream.status !== 200 && upstream.status !== 206) {
        upstream.data.destroy();
        const message = `YouTube responded with ${upstream.status}`;
        if (!res.headersSent) return res.status(502).json({ error: message });
        throw new Error(message);
      }

      if (!total) {
        const range = upstream.headers['content-range'];
        // Content-Range looks like "bytes 0-4194303/18642971"; the total after
        // the slash is what lets the browser show a real progress bar.
        total = Number(range && range.split('/')[1]) || Number(upstream.headers['content-length']) || 0;
        res.status(200);
        res.setHeader('Content-Type', upstream.headers['content-type'] || 'application/octet-stream');
        res.setHeader('Accept-Ranges', 'bytes');
        if (total) res.setHeader('Content-Length', total);
      }

      const written = await pipeWindow(upstream.data);

      if (clientGone) {
        upstream.data.destroy();
        return;
      }
      if (written === 0) break; // no progress; stop rather than spin
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
    '-o', '-'
  ];



  // Add cookies if available
  const cookiesPath = path.join(__dirname, 'cookies.txt');
  if (fs.existsSync(cookiesPath)) {
    args.push('--cookies', cookiesPath);
  }

  console.log('Executing yt-dlp with args:', args); // Debug logging

  const childProcess = spawn(ytdlpPath, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
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
      '-o', '-'
    ];

    childProcess = spawn(ytdlpPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
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

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
})