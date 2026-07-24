"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data stays "fresh" for 30 seconds — no re-fetch on mount/focus
        staleTime: 30 * 1000,
        // Cached data survives in memory for 5 minutes after last observer unmounts
        gcTime: 5 * 60 * 1000,
        // Don't refetch every time the user alt-tabs back
        refetchOnWindowFocus: false,
        // Retry once on failure, then show error
        retry: 1,
        // Keep previous data visible while loading new data (smooth pagination)
        placeholderData: (prev: unknown) => prev,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

// Singleton for browser — avoids re-creating on every render
let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always create a new client (no sharing between requests)
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(getQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
