import { useState, useRef } from "react";
import UrlInput from "./components/UrlInput";
import VideoCard from "./components/VideoCard";
import Skeleton from "./components/Skeleton";
import ProgressBar from "./components/ProgressBar";

const API_BASE = "http://localhost:5000";

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
    const downloadId = crypto.randomUUID();
    setDownloadState("downloading");
    setProgress(0);
    setSpeedInfo({ speed: null, eta: null });

    const es = new EventSource(`${API_BASE}/api/progress/${downloadId}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setProgress(data.percent);
      setSpeedInfo({ speed: data.speed, eta: data.eta });

      if (data.done) {
        es.close();
        setTimeout(() => {
          setDownloadState("idle");
          setProgress(0);
          setSpeedInfo({ speed: null, eta: null });
          if (iframeRef.current) {
            document.body.removeChild(iframeRef.current);
            iframeRef.current = null;
          }
        }, 1000);
      }
    };

    es.onerror = () => {
      es.close();
      setDownloadState("idle");
      setProgress(0);
      setSpeedInfo({ speed: null, eta: null });
    };

    const params = new URLSearchParams({
      url,
      quality,
      audioOnly: mode === "audio" ? "true" : "false",
      audioBitrate: bitrate,
      downloadId,
      title: video?.title || "video",
    });

    const downloadUrl = `${API_BASE}/api/download?${params.toString()}`;

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = downloadUrl;
    document.body.appendChild(iframe);
    iframeRef.current = iframe;
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
              url={url}
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