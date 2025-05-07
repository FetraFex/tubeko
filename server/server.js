const express = require("express")
const cors = require('cors')
const axios = require('axios')
const ytdl = require('ytdl-core');
const { spawn } = require('child_process');

const app = express()
const PORT = 3000

app.use(cors({ origin: 'http://localhost:5173' }));

app.use(express.json());

// Setting up API Key and the BASE_URL
const API_KEY = "AIzaSyDUvyeu0mkXczGIU5RHZDpxWQdDNGb-rn4"
const BASE_URL = "https://www.googleapis.com/youtube/v3"

// Helper function to safely run yt-dlp
const runYtDlpCommand = (args, options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      // Determine the correct binary path
      const ytdlpPath = path.join(
        __dirname,
        process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
      );

      // Verify binary exists
      if (!fs.existsSync(ytdlpPath)) {
        throw new Error(`yt-dlp binary not found at ${ytdlpPath}`);
      }

      // Create the process
      const childProcess = spawn(ytdlpPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
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

app.get('/api/playlist/:playlistId', async (req, res) => {
  const { playlistId } = req.params;
  const { pageToken } = req.query;

  try {
    const response = await axios.get(`${BASE_URL}/playlistItems`, {
      params: {
        part: 'snippet',
        maxResults: 50,
        playlistId: playlistId,
        pageToken: pageToken || '',
        key: API_KEY,
      },
    });

    const videos = response.data.items.map((item) => ({
      title: item.snippet.title,
      videoId: item.snippet.resourceId.videoId,
      thumbnail: item.snippet.thumbnails.medium.url,
    }));

    res.json({
      videos,
      nextPageToken: response.data.nextPageToken || null,
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

    const info = await runYtDlpCommand([
      url,
      '--dump-json',
      '--no-warnings',
      '--force-ipv4'
    ]);

    // Process formats with better merging detection
    const formats = info.formats.map(format => {
      const isCombined = format.acodec && format.acodec !== 'none' &&
        format.vcodec && format.vcodec !== 'none';
      const isVideo = format.vcodec && format.vcodec !== 'none';
      const isAudio = format.acodec && format.acodec !== 'none';

      let type;
      if (isCombined) type = 'video+audio';
      else if (isVideo) type = 'video only';
      else if (isAudio) type = 'audio only';

      return {
        itag: format.format_id,
        quality: format.height ? `${format.height}p` :
          format.abr ? `${format.abr}kbps` :
            format.format_note || format.ext.toUpperCase(),
        type,
        codec: {
          video: format.vcodec,
          audio: format.acodec
        },
        filesize: format.filesize ? `${(format.filesize / (1024 * 1024)).toFixed(2)}MB` : 'N/A'
      };
    }).filter(f => f.type); // Remove invalid formats

    // Add merge suggestions for higher quality videos
    const enhancedFormats = formats.map(format => {
      if (format.type === 'video only') {
        // Find compatible audio streams
        const compatibleAudio = formats.find(f =>
          f.type === 'audio only' &&
          !f.quality.includes('video') // Ensure it's pure audio
        );
        return {
          ...format,
          canMerge: !!compatibleAudio,
          mergeWith: compatibleAudio?.itag
        };
      }
      return format;
    });

    res.json({
      title: info.title,
      thumbnail: info.thumbnail,
      duration: info.duration_string,
      formats: enhancedFormats
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Add this after your /api/playlist/:playlistId route
app.get('/download', async (req, res) => {
  try {
      const videoURL = req.query.url;
      const format = req.query.format || 'mp4';
      
      const info = await ytdl.getInfo(videoURL);
      const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');

      res.header('Content-Disposition', `attachment; filename="${title}.${format}"`);

      if (format === 'mp3') {
          ytdl(videoURL, { quality: 'highestaudio', filter: 'audioonly' })
              .pipe(res);
      } else {
          ytdl(videoURL, { quality: 'highest' })
              .pipe(res);
      }
      
  } catch (error) {
    console.log(error);
    
      res.status(500).send('Error downloading video', error);
  }
});

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
})