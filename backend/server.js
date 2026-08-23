import express from "express";
import cors from "cors";
import { spawn } from "child_process";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { isValidYouTubeUrl } from "./utils/validate.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
}));

app.use(express.json());

const sseClients = new Map();
const spawnEnv = { ...process.env, PYTHONUNBUFFERED: "1" };

function fetchMetadata(url) {
  return new Promise((resolve, reject) => {
    const args = ["-j", "--no-warnings", "--skip-download", url];
    console.log("Spawning yt-dlp with args:", args);
    const proc = spawn("yt-dlp", args, { env: spawnEnv });

    let data = "";
    let error = "";

    proc.stdout.on("data", (chunk) => (data += chunk));
    proc.stderr.on("data", (chunk) => (error += chunk));

    proc.on("error", (err) => {
      console.log("Spawn error (yt-dlp not found?):", err.message);
      reject(new Error("yt-dlp could not be started: " + err.message));
    });

    proc.on("close", (code) => {
      console.log("yt-dlp metadata process closed with code:", code);
      if (error) console.log("yt-dlp stderr output:", error);

      if (code !== 0) {
        return reject(new Error(error || "yt-dlp failed to fetch metadata"));
      }
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        console.log("JSON parse failed. Raw data was:", data);
        reject(new Error("Failed to parse video metadata"));
      }
    });
  });
}

app.post("/api/metadata", async (req, res) => {
  console.log("=== Metadata request received ===");
  console.log("Body:", req.body);

  const { url } = req.body;

  if (!isValidYouTubeUrl(url)) {
    console.log("Invalid URL rejected:", url);
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  try {
    console.log("Calling yt-dlp for:", url);
    const info = await fetchMetadata(url);
    console.log("yt-dlp succeeded, title:", info.title);

    if (info.is_live) {
      return res.status(422).json({ error: "Live streams cannot be downloaded" });
    }

    res.json({
      title: info.title,
      thumbnail: info.thumbnail,
      channel: info.uploader || info.channel,
      duration: info.duration,
      durationString: formatDuration(info.duration),
      isAgeRestricted: info.age_limit > 0,
    });
  } catch (err) {
    console.log("yt-dlp FAILED with error:", err.message);
    res.status(500).json({ error: classifyError(err.message) });
  }
});

app.get("/api/progress/:id", (req, res) => {
  const { id } = req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  sseClients.set(id, res);
  res.write(`data: ${JSON.stringify({ percent: 0 })}\n\n`);

  req.on("close", () => {
    sseClients.delete(id);
  });
});

app.get("/api/download", (req, res) => {
  console.log("=== Download request received ===");
  const { url, quality, audioOnly, audioBitrate, downloadId, title } = req.query;

  if (!isValidYouTubeUrl(url)) {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  if (audioOnly === "true") {
    const args = [
      "-o", "-",
      "--no-warnings",
      "--no-part",
      "--newline",
      "-x",
      "--audio-format", "mp3",
      "--audio-quality", audioBitrate === "320" ? "320k" : "128k",
      url,
    ];

    const audioFileName = `${sanitizeFilename(title)} [${audioBitrate === "320" ? "320kbps" : "128kbps"}].mp3`;
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${audioFileName}"; filename*=UTF-8''${encodeURIComponent(audioFileName)}`
    );
    res.setHeader("Content-Type", "application/octet-stream");

    const proc = spawn("yt-dlp", args, { env: spawnEnv });
    proc.stdout.pipe(res);

    let stderrLog = "";
    let lineBuffer = "";

    proc.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderrLog += text;
      lineBuffer += text;
      const lines = lineBuffer.split(/\r|\n/);
      lineBuffer = lines.pop();
      for (const line of lines) {
        const percentMatch = line.match(/(\d+(?:\.\d+)?)%/);
        const speedMatch = line.match(/at\s+([\d.]+\s*\w+\/s)/);
        const etaMatch = line.match(/ETA\s+([\d:]+)/);

        if (percentMatch && downloadId && sseClients.has(downloadId)) {
          sseClients.get(downloadId).write(
            `data: ${JSON.stringify({
              percent: parseFloat(percentMatch[1]),
              speed: speedMatch ? speedMatch[1] : null,
              eta: etaMatch ? etaMatch[1] : null,
            })}\n\n`
          );
        }
      }
    });

    proc.on("close", (code) => {
      console.log("AUDIO yt-dlp closed with code:", code);
      if (code !== 0) console.log("AUDIO stderr:", stderrLog);
      if (downloadId && sseClients.has(downloadId)) {
        const client = sseClients.get(downloadId);
        client.write(`data: ${JSON.stringify({ percent: 100, done: true })}\n\n`);
        client.end();
        sseClients.delete(downloadId);
      }
      if (code !== 0 && !res.headersSent) {
        res.status(500).json({ error: classifyError(stderrLog) });
      }
    });

    req.on("close", () => {
      if (!proc.killed) proc.kill("SIGKILL");
    });

    return;
  }

  const heightMap = { "1080p": 1080, "720p": 720, "480p": 480 };
  const height = heightMap[quality] || 720;
  const formatArg = `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`;

  const tempFileName = `${randomUUID()}.mp4`;
  const tempFilePath = path.join(os.tmpdir(), tempFileName);

  const args = [
    "-o", tempFilePath,
    "--no-warnings",
    "--no-part",
    "--newline",
    "--progress",
    "-f", formatArg,
    "--merge-output-format", "mp4",
    url,
  ];

  const proc = spawn("yt-dlp", args, { env: spawnEnv });

  let stderrLog = "";
  let lineBuffer = "";

  proc.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    stderrLog += text;
    lineBuffer += text;
    const lines = lineBuffer.split(/\r|\n/);
    lineBuffer = lines.pop();
    for (const line of lines) {
      const percentMatch = line.match(/(\d+(?:\.\d+)?)%/);
      const speedMatch = line.match(/at\s+([\d.]+\s*\w+\/s)/);
      const etaMatch = line.match(/ETA\s+([\d:]+)/);

      if (percentMatch && downloadId && sseClients.has(downloadId)) {
        sseClients.get(downloadId).write(
          `data: ${JSON.stringify({
            percent: parseFloat(percentMatch[1]),
            speed: speedMatch ? speedMatch[1] : null,
            eta: etaMatch ? etaMatch[1] : null,
          })}\n\n`
        );
      }
    }
  });

  proc.on("error", (err) => {
    console.log("VIDEO process error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Download process failed to start" });
  });

  proc.on("close", (code) => {
    console.log("VIDEO yt-dlp closed with code:", code);
    if (code !== 0) console.log("VIDEO stderr:", stderrLog);

    if (code !== 0) {
      if (downloadId && sseClients.has(downloadId)) {
        sseClients.get(downloadId).end();
        sseClients.delete(downloadId);
      }
      if (!res.headersSent) res.status(500).json({ error: classifyError(stderrLog) });
      return;
    }

    const videoFileName = `${sanitizeFilename(title)} [${quality || "720p"}].mp4`;
    const stats = fs.statSync(tempFilePath);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${videoFileName}"; filename*=UTF-8''${encodeURIComponent(videoFileName)}`
    );
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Length", stats.size);

    const readStream = fs.createReadStream(tempFilePath);
    readStream.pipe(res);

    readStream.on("close", () => {
      fs.unlink(tempFilePath, () => {});
      if (downloadId && sseClients.has(downloadId)) {
        const client = sseClients.get(downloadId);
        client.write(`data: ${JSON.stringify({ percent: 100, done: true })}\n\n`);
        client.end();
        sseClients.delete(downloadId);
      }
    });
  });

  req.on("close", () => {
    if (!proc.killed) proc.kill("SIGKILL");
  });
});

function formatDuration(seconds) {
  if (!seconds) return "N/A";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function sanitizeFilename(name) {
  if (!name) return "video";
  const cleaned = name
    .replace(/[/\\?%*:|"<>]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
    .slice(0, 150);
  return cleaned || "video";
}

function classifyError(msg = "") {
  const lower = msg.toLowerCase();
  if (lower.includes("private video")) return "This video is private and cannot be accessed.";
  if (lower.includes("sign in to confirm your age")) return "This video is age-restricted.";
  if (lower.includes("live event")) return "Live streams cannot be downloaded.";
  if (lower.includes("video unavailable")) return "This video is unavailable or has been removed.";
  if (lower.includes("unsupported url")) return "Invalid or unsupported YouTube URL.";
  return "Something went wrong while processing this video.";
}

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));