# YouTube Downloader

React/Vite frontend with an Express backend powered by `yt-dlp` and `ffmpeg`.

## Run locally

1. Install `yt-dlp` and `ffmpeg`, and add both to your PATH.
2. In `backend`, run `npm install` then `npm run dev`.
3. In `frontend`, run `npm install` then `npm run dev`.

The frontend expects the backend at `http://localhost:5000`. Use `VITE_API_BASE` for a different API URL. Set `FRONTEND_URL` in the backend environment to allow an additional production frontend origin.
