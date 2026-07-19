import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MaskedValue } from "@/shared/components/security/masked-value";
import {
  EmptyState,
  ErrorState,
  ForbiddenState,
} from "@/shared/components/ui/states";
import { findA11yViolations } from "../../helpers/axe";
import { renderWithIntl } from "../../helpers/render-with-intl";

describe("Accesibilidad (axe) de componentes clave — FASE 12", () => {
  it("EmptyState no tiene violaciones", async () => {
    const { container } = render(
      <EmptyState title="Sin resultados" description="Ajusta los filtros." />,
    );
    expect(await findA11yViolations(container)).toEqual([]);
  });

  it("ErrorState con reintento no tiene violaciones", async () => {
    const { container } = render(
      <ErrorState requestId="req_1" onRetry={() => {}} />,
    );
    expect(await findA11yViolations(container)).toEqual([]);
  });

  it("ForbiddenState no tiene violaciones", async () => {
    const { container } = render(<ForbiddenState />);
    expect(await findA11yViolations(container)).toEqual([]);
  });

  it("MaskedValue con botón de revelar no tiene violaciones", async () => {
    // MaskedValue usa useTranslations: necesita el provider de next-intl.
    const { container } = renderWithIntl(
      <MaskedValue value="71234567" type="phone" canReveal />,
    );
    expect(await findA11yViolations(container)).toEqual([]);
  });
});
