const express = require("express")
const cors = require('cors')
const axios = require('axios')
const ytdl = require('ytdl-core');

const app = express()
const PORT = 3000

app.use(cors({ origin: 'http://localhost:5173' }));

app.use(express.json());

// Setting up API Key and the BASE_URL
const API_KEY = "AIzaSyDUvyeu0mkXczGIU5RHZDpxWQdDNGb-rn4"
const BASE_URL = "https://www.googleapis.com/youtube/v3"

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