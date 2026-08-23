import FormatSelector from "./FormatSelector";

export default function VideoCard({ video, url, downloadState, onDownload, formatState }) {
  const { mode, setMode, quality, setQuality, bitrate, setBitrate } = formatState;

  return (
    <div className="bg-card rounded-2xl p-4 sm:p-6 w-full max-w-xl border border-gray-800 mx-1">
      <img
        src={video.thumbnail}
        alt={video.title}
        className="rounded-xl w-full h-44 sm:h-56 object-cover mb-4"
      />
      <h2 className="font-semibold text-base sm:text-lg leading-snug break-words">
        {video.title}
      </h2>
      <p className="text-gray-400 text-sm mt-1">
        {video.channel} • {video.durationString}
      </p>

      {video.isAgeRestricted && (
        <p className="text-yellow-500 text-xs mt-2">
          ⚠ This video is age-restricted; download may fail without authentication.
        </p>
      )}

      <FormatSelector
        mode={mode}
        setMode={setMode}
        quality={quality}
        setQuality={setQuality}
        bitrate={bitrate}
        setBitrate={setBitrate}
      />

      <button
        onClick={onDownload}
        disabled={downloadState === "downloading"}
        className="mt-5 w-full bg-accent hover:bg-indigo-500 transition-colors
                   rounded-xl py-3 font-medium disabled:opacity-50"
      >
        {downloadState === "downloading" ? "Downloading..." : "Download"}
      </button>
    </div>
  );
}