import { useEffect, useRef, useState } from "react";
import UrlInput from "./components/UrlInput";
import VideoCard from "./components/VideoCard";
import Skeleton from "./components/Skeleton";
import ProgressBar from "./components/ProgressBar";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function App() {
  const [url, setUrl] = useState("");
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloadState, setDownloadState] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [speedInfo, setSpeedInfo] = useState({ speed: null, eta: null });

  const [mode, setMode] = useState("video");
  const [quality, setQuality] = useState("720p");
  const [bitrate, setBitrate] = useState("128");

  const eventSourceRef = useRef(null);
  const iframeRef = useRef(null);
  const downloadFinishedRef = useRef(false);

  const clearDownload = () => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    if (iframeRef.current?.isConnected) iframeRef.current.remove();
    iframeRef.current = null;
  };

  useEffect(() => clearDownload, []);

  const handleFetch = async () => {
    setError("");
    setVideo(null);
    if (!url.trim()) return setError("Please paste a YouTube URL.");

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch video");
      setVideo(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    clearDownload();
    const downloadId = crypto.randomUUID();
    downloadFinishedRef.current = false;
    setDownloadState("downloading");
    setProgress(0);
    setSpeedInfo({ speed: null, eta: null });

    const es = new EventSource(`${API_BASE}/api/progress/${downloadId}`);
    eventSourceRef.current = es;

    const params = new URLSearchParams({
      url,
      quality,
      audioOnly: mode === "audio" ? "true" : "false",
      audioBitrate: bitrate,
      downloadId,
      title: video?.title || "video",
    });

    es.onopen = () => {
      const iframe = document.createElement("iframe");
      iframe.hidden = true;
      iframe.src = `${API_BASE}/api/download?${params.toString()}`;
      document.body.appendChild(iframe);
      iframeRef.current = iframe;
    };

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.error) {
        downloadFinishedRef.current = true;
        clearDownload();
        setDownloadState("idle");
        setProgress(0);
        setSpeedInfo({ speed: null, eta: null });
        setError(data.error);
        return;
      }

      setProgress(Math.max(0, Math.min(data.percent ?? 0, 100)));
      setSpeedInfo({ speed: data.speed, eta: data.eta });

      if (data.done) {
        downloadFinishedRef.current = true;
        setTimeout(() => {
          setDownloadState("idle");
          setProgress(0);
          setSpeedInfo({ speed: null, eta: null });
          clearDownload();
        }, 1000);
      }
    };

    es.onerror = () => {
      if (downloadFinishedRef.current) return;
      es.close();
      clearDownload();
      setDownloadState("idle");
      setProgress(0);
      setSpeedInfo({ speed: null, eta: null });
      setError("Download could not be completed. Please try again.");
    };
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 sm:px-6 py-10 sm:py-16">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-center">
        YouTube Downloader
      </h1>
      <p className="text-gray-400 mb-6 sm:mb-8 text-sm text-center">
        Paste a link, pick a format, download instantly.
      </p>

      <UrlInput url={url} setUrl={setUrl} onFetch={handleFetch} loading={loading} />

      {error && (
        <p className="text-red-400 text-sm mt-4 max-w-xl text-center px-2">
          {error}
        </p>
      )}

      <div className="mt-6 sm:mt-8 w-full flex flex-col items-center">
        {loading && <Skeleton />}
        {!loading && video && (
          <div className="w-full max-w-xl">
            <VideoCard
              video={video}
              downloadState={downloadState}
              onDownload={handleDownload}
              formatState={{ mode, setMode, quality, setQuality, bitrate, setBitrate }}
            />
            {downloadState === "downloading" && (
              <ProgressBar percent={progress} speed={speedInfo.speed} eta={speedInfo.eta} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
