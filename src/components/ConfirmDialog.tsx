"use client";

import { useEffect, useRef } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  loading?: boolean;
  loadingLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const variantStyles = {
  danger: {
    icon: (
      <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
    iconBg: "bg-red-100",
    confirmBtn: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
    confirmBtnDisabled: "bg-red-400 cursor-not-allowed",
    progressBar: "bg-red-500",
  },
  warning: {
    icon: (
      <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    iconBg: "bg-amber-100",
    confirmBtn: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500",
    confirmBtnDisabled: "bg-amber-400 cursor-not-allowed",
    progressBar: "bg-amber-500",
  },
  info: {
    icon: (
      <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    iconBg: "bg-blue-100",
    confirmBtn: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
    confirmBtnDisabled: "bg-blue-400 cursor-not-allowed",
    progressBar: "bg-blue-500",
  },
};

export default function ConfirmDialog({
  open,
  title = "Confirm Action",
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
  loadingLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const styles = variantStyles[variant];
  const activeLoadingLabel = loadingLabel || `${confirmLabel.replace(/e$/, "")}ing…`;

  useEffect(() => {
    if (open && !loading) {
      cancelRef.current?.focus();
    }
  }, [open, loading]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel, loading]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={loading ? undefined : onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-[scaleIn_0.2s_ease-out]">
        {/* Animated progress bar at the top during loading */}
        {loading && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 overflow-hidden">
            <div
              className={`h-full ${styles.progressBar} animate-[indeterminate_1.5s_ease-in-out_infinite]`}
            />
          </div>
        )}

        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Icon — pulse animation when loading */}
            <div
              className={`flex-shrink-0 w-11 h-11 rounded-full ${styles.iconBg} flex items-center justify-center transition-all ${
                loading ? "animate-pulse" : ""
              }`}
            >
              {loading ? (
                <svg
                  className="w-6 h-6 animate-spin text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                styles.icon
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 leading-6">
                {loading ? activeLoadingLabel : title}
              </h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                {loading
                  ? "Please wait while we process your request. This may take a moment…"
                  : message}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 ${
              loading
                ? "text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed"
                : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
            }`}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition inline-flex items-center gap-2 ${
              loading ? styles.confirmBtnDisabled : styles.confirmBtn
            }`}
          >
            {loading && (
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            {loading ? activeLoadingLabel : confirmLabel}
          </button>
        </div>
      </div>

      {/* Keyframe for the indeterminate progress bar */}
      <style jsx>{`
        @keyframes indeterminate {
          0% {
            transform: translateX(-100%);
            width: 40%;
          }
          50% {
            transform: translateX(60%);
            width: 60%;
          }
          100% {
            transform: translateX(200%);
            width: 40%;
          }
        }
      `}</style>
    </div>
  );
}
