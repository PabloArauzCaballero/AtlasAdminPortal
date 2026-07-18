"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AuthProvider } from "@/shared/auth/auth-context";
import { SessionCacheGuard } from "@/shared/auth/session-cache-guard";
import { consoleSink } from "@/shared/observability/console-sink";
import { setObservabilitySink } from "@/shared/observability/reporter";

export function AppProviders({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  useEffect(() => {
    // Solo en desarrollo: en producción se registra un sink real. En test
    // (NODE_ENV="test") no se toca, para no ensuciar la salida de los tests.
    if (process.env.NODE_ENV === "development") {
      setObservabilitySink(consoleSink);
    }
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 20_000,
            retry: (failureCount, error) => {
              if (typeof error === "object" && error && "status" in error) {
                const status = Number((error as { status?: number }).status);
                if (status === 401 || status === 403 || status === 404)
                  return false;
              }
              return failureCount < 1;
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SessionCacheGuard />
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
