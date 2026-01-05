const express = require('express');
const axios = require('axios');
// const franc = require('franc');

const router = express.Router();



const parseISO8601Duration = (duration) => {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  return hours * 3600 + minutes * 60 + seconds;
};

const isShorts = (title, description) => {
  const shortsKeywords = /shorts|#shorts|trailer|clip/i;
  return shortsKeywords.test(title) || shortsKeywords.test(description);
};

const detectLanguage = async (text) => {
  const { franc } = await import('franc');
  const langCode = franc(text);
  return langCode !== 'und' ? langCode : null;
};

router.get('/', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    const API_KEY = process.env.YOUTUBE_API_KEY;

    const searchResponse = await axios.get(
      'https://www.googleapis.com/youtube/v3/search',
      {
        params: {
          part: 'snippet',
          q: query,
          maxResults: 20,
          type: 'video',
          relevanceLanguage: 'auto',
          regionCode: 'IN',
          key: API_KEY,
        },
      }
    );

    const videoIds = searchResponse.data.items.map((item) => item.id.videoId).filter(Boolean);
    if (!videoIds.length) return res.json({ items: [] });

    const videoDetailsResponse = await axios.get(
      'https://www.googleapis.com/youtube/v3/videos',
      {
        params: {
          part: 'contentDetails,snippet',
          id: videoIds.join(','),
          key: API_KEY,
        },
      }
    );

    const items = videoDetailsResponse.data.items
      .filter((video) => {
        const duration = parseISO8601Duration(video.contentDetails.duration);
        const title = video.snippet.title;
        const description = video.snippet.description;

        return duration > 60 && duration < 600 && !isShorts(title, description);
      })
      .map((video) => {
        const duration = parseISO8601Duration(video.contentDetails.duration);
        const title = video.snippet.title;
        const description = video.snippet.description;

        return {
          id: video.id,
          title,
          thumbnail: video.snippet.thumbnails.medium.url,
          duration: `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`,
          album: video.snippet.channelTitle,
          language: detectLanguage(`${title} ${description}`),
          dateAdded: new Date(video.snippet.publishedAt).toLocaleDateString(),
        };
      });

    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

//Suggest endpoint
router.get('/suggest', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json({ suggestions: [] });

  try {
    const response = await axios.get('https://suggestqueries.google.com/complete/search', {
      params: {
        client: 'firefox',
        ds: 'yt',
        q: query,
      },
    });

    const suggestions = response.data[1];
    res.json({ suggestions });
  } catch (err) {
    console.error(err);
    res.json({ suggestions: [] });
  }
});

module.exports = router;
