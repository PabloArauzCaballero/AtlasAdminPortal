import { render, type RenderResult } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import esBO from "@/shared/i18n/messages/es-BO.json";

/**
 * Renderiza bajo el mismo NextIntlClientProvider que la app (locale es-BO,
 * catálogo real), para testear componentes que usan `useTranslations`.
 */
export function renderWithIntl(ui: ReactElement): RenderResult {
  function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return (
      <NextIntlClientProvider
        locale="es-BO"
        messages={esBO}
        timeZone="America/La_Paz"
      >
        {children}
      </NextIntlClientProvider>
    );
  }
  return render(ui, { wrapper: Wrapper });
}
