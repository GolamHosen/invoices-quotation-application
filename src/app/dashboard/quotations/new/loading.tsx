export default function NewQuotationLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-40 bg-gray-200 rounded-lg" />
          <div className="h-4 w-64 bg-gray-100 rounded mt-2" />
        </div>
        <div className="h-9 w-20 bg-gray-200 rounded-lg" />
      </div>
      {/* Steps skeleton */}
      <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center flex-1 gap-2 px-3 py-2">
            <div className="w-6 h-6 bg-gray-200 rounded-full" />
            <div className="h-4 flex-1 bg-gray-100 rounded hidden md:block" />
          </div>
        ))}
      </div>
      {/* Content skeleton */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl border-2 border-gray-200 space-y-2">
              <div className="h-5 w-32 bg-gray-200 rounded" />
              <div className="h-4 w-24 bg-gray-100 rounded" />
              <div className="h-3 w-40 bg-gray-50 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
