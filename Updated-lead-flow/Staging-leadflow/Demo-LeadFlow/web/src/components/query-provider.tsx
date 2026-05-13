"use client";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

const defaultStale = 5 * 60_000;
const defaultGc = 10 * 60_000;

/**
 * App-wide React Query provider.
 *
 * Prefer server data in RSC routes; use `useQuery` in client components when you
 * need cached client fetches (e.g. `fetch("/api/...")` in modals or live filters).
 *
 * Lazily allocates one client per mounted tree (recommended TanStack pattern).
 */
export function AppQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: defaultStale,
            gcTime: defaultGc,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
