"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// Create a client-side singleton for the query client
let queryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server side: always create a new query client
    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5, // 5 minutes
          // garbageCollectionTime: 1000 * 60 * 30, // 30 minutes - removed due to type error
          refetchOnWindowFocus: false,
          retry: 1,
        },
      },
    });
  }
  if (queryClient === undefined) {
    // Client side: create a singleton
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5, // 5 minutes
          // garbageCollectionTime: 1000 * 60 * 30, // 30 minutes - removed due to type error
          refetchOnWindowFocus: false,
          retry: 1,
        },
      },
    });
  }
  return queryClient;
}

interface QueryClientProviderProps {
  children: React.ReactNode;
}

export const QueryClientProviderWrapper = ({
  children,
}: QueryClientProviderProps) => {
  return (
    <QueryClientProvider client={getQueryClient()}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};