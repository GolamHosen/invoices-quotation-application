export default function ReportsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-28 bg-gray-200 rounded-lg" />
        <div className="h-4 w-52 bg-gray-100 rounded mt-2" />
      </div>
      {/* Charts skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
          <div className="h-48 bg-gray-100 rounded-lg" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="h-5 w-36 bg-gray-200 rounded mb-4" />
          <div className="h-48 bg-gray-100 rounded-lg" />
        </div>
      </div>
      {/* Summary skeleton */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-t border-gray-50">
            <div className="h-4 w-32 bg-gray-100 rounded" />
            <div className="h-4 w-20 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
