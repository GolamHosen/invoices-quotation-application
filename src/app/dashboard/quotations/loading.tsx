export default function QuotationsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-36 bg-gray-200 rounded-lg" />
          <div className="h-4 w-56 bg-gray-100 rounded mt-2" />
        </div>
        <div className="h-9 w-36 bg-gray-200 rounded-lg" />
      </div>
      {/* Filters skeleton */}
      <div className="flex gap-3">
        <div className="h-9 w-24 bg-gray-100 rounded-lg" />
        <div className="h-9 w-24 bg-gray-100 rounded-lg" />
        <div className="h-9 w-24 bg-gray-100 rounded-lg" />
      </div>
      {/* Table skeleton */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex gap-4">
          {["w-24", "w-32", "w-28", "w-20", "w-20", "w-16"].map((w, i) => (
            <div key={i} className={`h-4 ${w} bg-gray-200 rounded`} />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-6 py-4 border-b border-gray-100 flex items-center gap-4">
            <div className="h-4 w-20 bg-gray-100 rounded" />
            <div className="h-4 w-32 bg-gray-100 rounded" />
            <div className="h-4 w-28 bg-gray-50 rounded" />
            <div className="h-5 w-16 bg-gray-100 rounded-full" />
            <div className="h-4 w-20 bg-gray-100 rounded" />
            <div className="h-4 w-16 bg-gray-50 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
