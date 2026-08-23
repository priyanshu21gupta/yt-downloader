export default function UrlInput({ url, setUrl, onFetch, loading }) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter") onFetch();
  };

  return (
    <div className="flex flex-col sm:flex-row w-full max-w-xl gap-2 px-1">
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Paste YouTube video or Shorts URL..."
        className="flex-1 bg-card border border-gray-700 rounded-xl px-4 py-3
                   focus:outline-none focus:ring-2 focus:ring-accent
                   placeholder-gray-500 text-sm w-full"
      />
      <button
        onClick={onFetch}
        disabled={loading}
        className="bg-accent hover:bg-indigo-500 transition-colors
                   rounded-xl px-5 py-3 font-medium disabled:opacity-50
                   w-full sm:w-auto"
      >
        {loading ? "Fetching..." : "Fetch"}
      </button>
    </div>
  );
}