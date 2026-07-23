export default function ClientsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-28 bg-gray-200 rounded-lg" />
          <div className="h-4 w-48 bg-gray-100 rounded mt-2" />
        </div>
        <div className="h-9 w-32 bg-gray-200 rounded-lg" />
      </div>
      {/* Search bar skeleton */}
      <div className="h-10 w-full max-w-sm bg-gray-100 rounded-lg" />
      {/* Table skeleton */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex gap-4">
          {["w-32", "w-28", "w-36", "w-24", "w-20"].map((w, i) => (
            <div key={i} className={`h-4 ${w} bg-gray-200 rounded`} />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-6 py-4 border-b border-gray-100 flex items-center gap-4">
            <div className="w-9 h-9 bg-gray-200 rounded-full" />
            <div className="flex-1 flex gap-4">
              <div className="h-4 w-32 bg-gray-100 rounded" />
              <div className="h-4 w-40 bg-gray-50 rounded" />
              <div className="h-4 w-28 bg-gray-50 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
