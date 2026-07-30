"use client";

import { useEffect, useRef } from "react";

export type ToastType = "loading" | "success" | "error" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

function ToastIcon({ type }: { type: ToastType }) {
  if (type === "loading") {
    return (
      <div className="w-5 h-5 shrink-0">
        <svg className="animate-spin w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (type === "success") {
    return (
      <div className="w-5 h-5 shrink-0 rounded-full bg-emerald-500 flex items-center justify-center animate-[scaleIn_0.2s_ease-out]">
        <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  if (type === "info") {
    return (
      <div className="w-5 h-5 shrink-0 rounded-full bg-blue-500 flex items-center justify-center animate-[scaleIn_0.2s_ease-out]">
        <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="6" cy="3.5" r="0.5" fill="currentColor" />
          <line x1="6" y1="5.5" x2="6" y2="9" />
        </svg>
      </div>
    );
  }

  // error
  return (
    <div className="w-5 h-5 shrink-0 rounded-full bg-red-500 flex items-center justify-center animate-[scaleIn_0.2s_ease-out]">
      <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
        <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function SingleToast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (toast.type === "success" || toast.type === "error" || toast.type === "info") {
      timerRef.current = setTimeout(() => {
        onDismiss(toast.id);
      }, toast.type === "success" ? 3000 : toast.type === "info" ? 4000 : 5000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.type, toast.id, onDismiss]);

  const bgClass =
    toast.type === "loading"
      ? "bg-white border-gray-200"
      : toast.type === "success"
      ? "bg-white border-emerald-200"
      : toast.type === "info"
      ? "bg-white border-blue-200"
      : "bg-white border-red-200";

  const textClass =
    toast.type === "loading"
      ? "text-gray-700"
      : toast.type === "success"
      ? "text-emerald-800"
      : toast.type === "info"
      ? "text-blue-800"
      : "text-red-800";

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${bgClass} 
        animate-[slideUp_0.3s_ease-out] min-w-[280px] max-w-[420px]`}
      role="alert"
    >
      <ToastIcon type={toast.type} />
      <span className={`text-sm font-medium ${textClass} flex-1`}>{toast.message}</span>
      {toast.type !== "loading" && (
        <button
          onClick={() => onDismiss(toast.id)}
          className="p-0.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default function ToastContainer({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col-reverse gap-2 items-center pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <SingleToast toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
