const express = require('express');
const router = express.Router();
const Playlist = require('../models/playlist');
const User = require('../models/user');

// PUT - Like or Unlike Song
router.put('/liked/:userId', async (req, res) => {
  const { userId } = req.params;
  const { song, action } = req.body;

  if (!song || !song.videoId) {
    return res.status(400).json({ error: "Invalid song data" });
  }

  try {
    let playlist = await Playlist.findOne({ userId, title: "Liked Songs" });

    if (!playlist) {
      playlist = new Playlist({ userId, title: "Liked Songs", songs: [] });
    }

    if (action === 'add') {
      if (!playlist.songs.some(s => s.videoId === song.videoId)) {
        playlist.songs.push(song);
      }
    } else if (action === 'remove') {
      playlist.songs = playlist.songs.filter(s => s.videoId !== song.videoId);
    }

    await playlist.save();
    res.json(playlist);
  } catch (error) {
    console.error('Error saving playlist:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET - Fetch Liked Songs
router.get('/liked/:userId', async (req, res) => {
  try {
    const playlist = await Playlist.findOne({ userId: req.params.userId, title: 'Liked Songs' });
    if (!playlist) {
      return res.json({ songs: [] });
    }
    res.json({ songs: playlist.songs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
