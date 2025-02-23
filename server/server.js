const express = require("express")
const cors = require('cors')
const axios = require('axios')

const app = express()
const PORT = 3000

app.use(cors({origin: 'http://localhost:5173'}));

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

app.listen(PORT, () => {
    console.log(`API running at http://localhost:${PORT}`);
})