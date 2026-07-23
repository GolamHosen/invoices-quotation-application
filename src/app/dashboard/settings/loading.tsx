export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-28 bg-gray-200 rounded-lg" />
        <div className="h-4 w-56 bg-gray-100 rounded mt-2" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i}>
            <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
            <div className="h-10 w-full bg-gray-100 rounded-lg" />
          </div>
        ))}
        <div className="h-10 w-32 bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}
