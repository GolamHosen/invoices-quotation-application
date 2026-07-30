export default function Loading() {
  return (
    <div className="p-8 text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#1e3a5f] border-t-transparent mx-auto"></div>
      <p className="mt-3 text-sm text-gray-500">Loading email history...</p>
    </div>
  );
}
