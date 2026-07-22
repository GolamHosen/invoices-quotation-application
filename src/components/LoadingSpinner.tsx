type LoadingSpinnerProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
};

const sizeMap = {
  sm: "h-6 w-6 border-2",
  md: "h-8 w-8 border-4",
  lg: "h-12 w-12 border-4",
};

export default function LoadingSpinner({
  size = "md",
  className = "",
  text,
}: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-8 ${className}`}>
      <div
        className={`animate-spin rounded-full ${sizeMap[size]} border-[#1e3a5f] border-t-transparent mx-auto`}
      ></div>
      {text && <p className="mt-3 text-sm text-gray-500">{text}</p>}
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner size="lg" />
    </div>
  );
}

export function TableLoading() {
  return (
    <div className="p-8 text-center">
      <LoadingSpinner size="md" />
    </div>
  );
}

