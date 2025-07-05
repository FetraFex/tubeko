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
const PORT = 3000

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'] }));
app.use(fileUpload());
ffmpeg.setFfmpegPath(ffmpegPath);
app.use(express.json());

// Setting up API Key and the BASE_URL
const API_KEY = "REDACTED_YOUTUBE_API_KEY"
const BASE_URL = "https://www.googleapis.com/youtube/v3"

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
  let { pageToken } = req.query;

  let videos = [];
  let nextPageToken = pageToken || '';

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

      // Add fetched videos to the array
      videos.push(
        ...response.data.items.map((item) => ({
          title: item.snippet.title,
          videoId: item.snippet.resourceId.videoId,
          thumbnail: item.snippet.thumbnails.medium.url,
        }))
      );

      // Update nextPageToken for the next request
      nextPageToken = response.data.nextPageToken || null;

    } while (nextPageToken);

    // Send the combined list of videos as the response
    res.json({
      videos,
      totalVideos: videos.length,
    });
  } catch (error) {
    console.error('Error fetching playlist:', error);
    res.status(500).send('Internal Server Error');
  }
});

/** Get a video information */
app.get('/videoInfo', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL required' });

    // Properly formatted headers with escaped quotes
    const info = await runYtDlpCommand([
      url,
      '--dump-json',
      '--no-warnings',
      '--force-ipv4',
      '--no-check-certificates',
      '--retries', '5',
      '--fragment-retries', '5',
      '--socket-timeout', '15',
      '--add-header', 'User-Agent:"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"',
      '--add-header', 'Accept-Language:"en-US,en;q=0.9"',
      '--age-limit', '99',
      // Add cookies if available (uncomment if needed)
      // '--cookies', 'cookies.txt'
    ]);

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
    console.error('yt-dlp stderr:', output);

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