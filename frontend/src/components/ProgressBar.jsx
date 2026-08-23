export default function ProgressBar({ percent, speed, eta }) {
  return (
    <div className="mt-4 w-full px-1">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>
          Downloading{speed ? ` — ${speed}` : ""}
          {eta ? ` — ETA ${eta}` : ""}
        </span>
        <span>{Math.min(percent, 100).toFixed(0)}%</span>
      </div>
      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent transition-all duration-300 ease-out"
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}