import type { ReactElement, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render,
  type RenderOptions,
  type RenderResult,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import esBO from "@/shared/i18n/messages/es-BO.json";

/**
 * QueryClient aislado por test: sin reintentos ni cache, para que un test no
 * herede datos de otro ni dependa de timers de backoff.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

type ProviderRenderOptions = Omit<RenderOptions, "wrapper"> & {
  queryClient?: QueryClient;
};

export function renderWithProviders(
  ui: ReactElement,
  options: ProviderRenderOptions = {},
): RenderResult & { queryClient: QueryClient } {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;

  // Espejo de producción: AppProviders envuelve el árbol en NextIntlClientProvider.
  // Así los componentes que usan useTranslations funcionan en sus tests.
  function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return (
      <NextIntlClientProvider
        locale="es-BO"
        messages={esBO}
        timeZone="America/La_Paz"
      >
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </NextIntlClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}
