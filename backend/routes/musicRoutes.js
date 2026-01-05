// backend/routes/musicRoutes.js
const express = require("express");
const router = express.Router();
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const STEMS_DIR = path.resolve(__dirname, "../stems");
if (!fs.existsSync(STEMS_DIR)) fs.mkdirSync(STEMS_DIR, { recursive: true });

const VALID_STEMS = ["mix", "vocals", "drums", "bass", "other"];
let splittingProgress = {}; // in-memory progress tracker

function getPaths(videoId, stem) {
  const videoDir = path.join(STEMS_DIR, videoId);
  return {
    videoDir,
    inputFile: path.join(videoDir, "input.wav"),
    mixFile: path.join(videoDir, "mix.wav"),
    stemFile:
      stem === "mix"
        ? path.join(videoDir, "mix.wav")
        : path.join(videoDir, `htdemucs/input/${stem}.wav`),
  };
}

// ✅ FIX: Move this route to the TOP
router.get("/status/:videoId", (req, res) => {
  const { videoId } = req.params;

  // Check if file already exists
  const { stemFile } = getPaths(videoId, "vocals");
  if (fs.existsSync(stemFile)) {
    return res.json({ done: true, progress: 100 });
  }

  // Check in-memory progress
  if (!splittingProgress[videoId]) {
    return res.json({ done: false, progress: 0 });
  }

  res.json(splittingProgress[videoId]);
});

// Main Route (Generic /:videoId/:stem) comes LAST
router.get("/:videoId/:stem", async (req, res) => {
  const { videoId, stem } = req.params;
  if (!VALID_STEMS.includes(stem)) {
    return res.status(400).json({ error: "Invalid stem requested" });
  }

  const { videoDir, inputFile, mixFile, stemFile } = getPaths(videoId, stem);

  try {
    // ensure directory
    if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

    // Serve cached stem if it exists
    if (fs.existsSync(stemFile)) {
      return res.sendFile(stemFile);
    }

    // Ensure input.wav exists
    if (!fs.existsSync(inputFile)) {
      await new Promise((resolve, reject) => {
        const ytdlp = spawn("yt-dlp", [
          "-f",
          "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio",
          "-o",
          "-",
          `https://www.youtube.com/watch?v=${videoId}`,
        ]);

        const ffmpeg = spawn("ffmpeg", [
          "-i",
          "pipe:0",
          "-ar",
          "44100",
          "-ac",
          "2",
          "-f",
          "wav",
          inputFile,
        ]);

        ytdlp.stdout.pipe(ffmpeg.stdin);

        ytdlp.stderr.on("data", (d) => console.error(`yt-dlp: ${d}`));
        ffmpeg.stderr.on("data", (d) => console.error(`ffmpeg: ${d}`));

        ffmpeg.on("close", (code) => {
          if (code === 0) resolve();
          else reject("ffmpeg failed");
        });
      });

      // copy input to mix so we can play original immediately
      fs.copyFileSync(inputFile, mixFile);
    }

    if (stem === "mix" || stem === "input") {
      return res.sendFile(mixFile);
    }

    // Start Splitting Logic
    if (!splittingProgress[videoId]) {
      splittingProgress[videoId] = { done: false, progress: 0 };

      const demucs = spawn("demucs", [inputFile, "-o", videoDir]);

      demucs.stdout.on("data", (data) => {
        console.log(`demucs: ${data}`);
        const text = data.toString();
        const match = text.match(/(\d+)%/);
        if (match) {
          splittingProgress[videoId].progress = parseInt(match[1], 10);
        }
      });

      demucs.stderr.on("data", (d) => console.error(`demucs err: ${d}`));

      demucs.on("close", (code) => {
        if (code === 0) {
          splittingProgress[videoId] = { done: true, progress: 100 };
          console.log(`Demucs finished for ${videoId}`);
        } else {
          console.error(`Demucs failed: ${code}`);
          splittingProgress[videoId] = { done: true, progress: 0, error: true };
        }
      });
    }

    return res.status(202).json({
      message: "Stem is being generated",
      progress: splittingProgress[videoId]?.progress || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.toString() });
  }
});

module.exports = router;