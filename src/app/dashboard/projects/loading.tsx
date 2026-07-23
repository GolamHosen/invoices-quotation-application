export default function ProjectsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-28 bg-gray-200 rounded-lg" />
          <div className="h-4 w-48 bg-gray-100 rounded mt-2" />
        </div>
        <div className="h-9 w-32 bg-gray-200 rounded-lg" />
      </div>
      <div className="h-10 w-full max-w-sm bg-gray-100 rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="h-5 w-40 bg-gray-200 rounded mb-3" />
            <div className="h-4 w-28 bg-gray-100 rounded mb-2" />
            <div className="h-4 w-32 bg-gray-50 rounded mb-4" />
            <div className="h-5 w-20 bg-gray-100 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
