export default function TemplatesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-32 bg-gray-200 rounded-lg" />
          <div className="h-4 w-52 bg-gray-100 rounded mt-2" />
        </div>
        <div className="h-9 w-36 bg-gray-200 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="h-5 w-44 bg-gray-200 rounded mb-3" />
            <div className="h-4 w-full bg-gray-50 rounded mb-2" />
            <div className="h-4 w-3/4 bg-gray-50 rounded mb-4" />
            <div className="flex gap-2">
              <div className="h-7 w-16 bg-gray-100 rounded" />
              <div className="h-7 w-16 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
