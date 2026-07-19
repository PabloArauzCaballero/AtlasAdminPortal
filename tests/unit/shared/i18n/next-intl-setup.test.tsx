import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import esBO from "@/shared/i18n/messages/es-BO.json";

function CommonRetry() {
  const t = useTranslations("common");
  return <span>{t("retry")}</span>;
}

function ForbiddenMessage() {
  const t = useTranslations("errors");
  return <span>{t("forbidden")}</span>;
}

function wrap(ui: ReactNode) {
  return render(
    <NextIntlClientProvider
      locale="es-BO"
      messages={esBO}
      timeZone="America/La_Paz"
    >
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("next-intl (es-BO) — infraestructura", () => {
  it("resuelve una clave del catálogo común", () => {
    wrap(<CommonRetry />);
    expect(screen.getByText("Reintentar")).toBeInTheDocument();
  });

  it("resuelve una clave del namespace de errores", () => {
    wrap(<ForbiddenMessage />);
    expect(
      screen.getByText("No tienes permisos para ver esta sección."),
    ).toBeInTheDocument();
  });

  it("el catálogo trae los namespaces esperados", () => {
    expect(Object.keys(esBO)).toEqual(
      expect.arrayContaining(["common", "auth", "errors", "pii"]),
    );
  });
});
