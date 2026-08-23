export default function Skeleton() {
  return (
    <div className="bg-card rounded-2xl p-4 sm:p-6 animate-pulse w-full max-w-xl mx-1">
      <div className="h-44 sm:h-56 bg-gray-700/50 rounded-xl mb-4" />
      <div className="h-5 bg-gray-700/50 rounded w-3/4 mb-2" />
      <div className="h-4 bg-gray-700/50 rounded w-1/2" />
    </div>
  );
}