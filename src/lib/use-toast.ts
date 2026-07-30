"use client";

import { useState, useCallback, useRef } from "react";
import type { ToastItem, ToastType } from "@/components/Toast";

let toastCounter = 0;

function generateToastId() {
  toastCounter += 1;
  return `toast-${toastCounter}-${Date.now()}`;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const activeOpsRef = useRef<Map<string, string>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    // Clean up active ops that reference this toast
    for (const [key, val] of activeOpsRef.current.entries()) {
      if (val === id) activeOpsRef.current.delete(key);
    }
  }, []);

  /**
   * Directly add a toast item.
   */
  const addToast = useCallback(
    ({ type, message }: { type: ToastType; message: string }): string => {
      const id = generateToastId();
      setToasts((prev) => [...prev, { id, type, message }]);
      return id;
    },
    []
  );

  /**
   * Show a loading toast. Returns a toastId that can be used to
   * transition to success/error via `updateToast`.
   * 
   * `operationKey` prevents duplicate toasts for the same operation.
   */
  const showLoading = useCallback((message: string, operationKey?: string): string => {
    // Prevent duplicate toasts for the same operation
    if (operationKey && activeOpsRef.current.has(operationKey)) {
      return activeOpsRef.current.get(operationKey)!;
    }

    const id = generateToastId();

    if (operationKey) {
      activeOpsRef.current.set(operationKey, id);
    }

    setToasts((prev) => [...prev, { id, type: "loading", message }]);
    return id;
  }, []);

  /**
   * Transition a loading toast to success or error.
   */
  const updateToast = useCallback((id: string, type: ToastType, message: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, type, message } : t))
    );
    // Clean up active ops
    for (const [key, val] of activeOpsRef.current.entries()) {
      if (val === id) activeOpsRef.current.delete(key);
    }
  }, []);

  /**
   * Helper that wraps an async operation with loading → success/error toast transitions.
   */
  const withToast = useCallback(
    async <T,>({
      loadingMessage,
      successMessage,
      errorMessage,
      operationKey,
      fn,
    }: {
      loadingMessage: string;
      successMessage: string;
      errorMessage?: string;
      operationKey?: string;
      fn: () => Promise<T>;
    }): Promise<T | undefined> => {
      const toastId = showLoading(loadingMessage, operationKey);
      try {
        const result = await fn();
        updateToast(toastId, "success", successMessage);
        return result;
      } catch (err: any) {
        const msg = errorMessage || err?.message || "An error occurred.";
        updateToast(toastId, "error", msg);
        return undefined;
      }
    },
    [showLoading, updateToast]
  );

  return { toasts, dismiss, showLoading, updateToast, withToast, addToast };
}
