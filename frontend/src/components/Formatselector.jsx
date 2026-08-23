const VIDEO_OPTIONS = ["1080p", "720p", "480p"];
const AUDIO_OPTIONS = ["128", "320"];

export default function FormatSelector({ mode, setMode, quality, setQuality, bitrate, setBitrate }) {
  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setMode("video")}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "video" ? "bg-accent" : "bg-gray-800 hover:bg-gray-700"
          }`}
        >
          Video
        </button>
        <button
          onClick={() => setMode("audio")}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "audio" ? "bg-accent" : "bg-gray-800 hover:bg-gray-700"
          }`}
        >
          Audio Only (MP3)
        </button>
      </div>

      {mode === "video" ? (
        <div className="flex gap-2 flex-wrap">
          {VIDEO_OPTIONS.map((q) => (
            <button
              key={q}
              onClick={() => setQuality(q)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                quality === q
                  ? "border-accent bg-accent/20 text-white"
                  : "border-gray-700 text-gray-400 hover:border-gray-500"
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          {AUDIO_OPTIONS.map((b) => (
            <button
              key={b}
              onClick={() => setBitrate(b)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                bitrate === b
                  ? "border-accent bg-accent/20 text-white"
                  : "border-gray-700 text-gray-400 hover:border-gray-500"
              }`}
            >
              {b} kbps
            </button>
          ))}
        </div>
      )}
    </div>
  );
}