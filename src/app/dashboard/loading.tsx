export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-40 bg-gray-200 rounded-lg" />
          <div className="h-4 w-64 bg-gray-100 rounded mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-36 bg-gray-200 rounded-lg" />
          <div className="h-9 w-32 bg-gray-100 rounded-lg" />
        </div>
      </div>

      {/* Revenue cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl p-6 h-24" />
        <div className="bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl p-6 h-24" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-xl p-4 h-28">
            <div className="w-10 h-10 bg-gray-200 rounded-lg mb-3" />
            <div className="h-6 w-12 bg-gray-200 rounded" />
            <div className="h-3 w-20 bg-gray-100 rounded mt-2" />
          </div>
        ))}
      </div>

      {/* Bottom grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="h-5 w-36 bg-gray-200 rounded mb-4" />
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between py-3 border-t border-gray-50">
                <div>
                  <div className="h-4 w-24 bg-gray-100 rounded" />
                  <div className="h-3 w-16 bg-gray-50 rounded mt-1" />
                </div>
                <div className="h-4 w-16 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
