import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { InvestigationSummaryPage } from "@/features/operations-cases/investigation-summary-page";
import type { InvestigationSummary } from "@/features/operations-cases/types";

vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({ hasAnyRole: () => true }),
}));
vi.mock("@/features/operations-cases/services", () => ({
  getInvestigationSummary: vi.fn(),
}));
vi.mock("@/features/credit/customer-credit-section", () => ({
  CustomerCreditSection: () => null,
}));
vi.mock("@/features/loans/customer-portfolio-section", () => ({
  CustomerPortfolioSection: () => null,
}));

const { getInvestigationSummary } =
  await import("@/features/operations-cases/services");

/**
 * Contactos, consentimientos y casos abiertos de la ficha de investigación: cuadros con cabeceras.
 *
 * Eran tarjetas de una línea, sin cabeceras ni forma de comparar filas. Son registros del mismo
 * tipo, y la pregunta de quien investiga es comparativa: cuál contacto está sin verificar, qué se
 * revocó, qué caso lleva más tiempo abierto.
 */
const BASE: InvestigationSummary = {
  customer: {
    customerId: "900",
    customerCode: "CLI-900",
    status: "under_review",
    phoneLast4: "0122",
    emailDomain: "gmail.com",
    createdAt: "2026-08-01T10:00:00.000Z",
  },
  profile: null,
  contacts: [
    {
      contactType: "phone",
      status: "unverified",
      isPrimary: true,
      valueLast4: "0122",
    },
    {
      contactType: "email",
      status: "verified",
      isPrimary: false,
      valueLast4: "mail",
    },
  ],
  consents: [
    {
      purposeCode: "credit_bureau",
      granted: true,
      grantedAt: "2026-08-01T10:00:00.000Z",
      revokedAt: null,
    },
    {
      purposeCode: "marketing",
      granted: false,
      grantedAt: null,
      revokedAt: "2026-08-02T10:00:00.000Z",
    },
  ],
  latestRiskAssessment: null,
  manualReviewCases: [
    {
      caseId: "71",
      caseCode: "MR-71",
      caseType: "identity_review",
      priority: "high",
      status: "open",
      openedAt: "2026-08-03T10:00:00.000Z",
    },
  ],
  fraudCases: [
    {
      caseId: "88",
      caseCode: "FR-88",
      severity: "high",
      caseStatus: "open",
      openedAt: "2026-08-04T10:00:00.000Z",
    },
  ],
  latestIdentityVerification: null,
  addressBook: {
    available: false,
    totalContacts: 0,
    uniqueRatio: 0,
    bolivianRatio: 0,
    referencesFoundInAddressBook: 0,
    riskMatches: 0,
  },
};

function pintar(summary: InvestigationSummary) {
  vi.mocked(getInvestigationSummary).mockResolvedValue(summary);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<InvestigationSummaryPage customerId="900" />, {
    wrapper: Wrapper,
  });
}

function tablaDe(titulo: RegExp): HTMLElement {
  const seccion = screen
    .getByRole("heading", { name: titulo })
    .closest("section");
  return within(seccion as HTMLElement).getByRole("table");
}

describe("investigación · cuadros de la ficha", () => {
  it("los contactos son una tabla con cabeceras y una fila por contacto", async () => {
    pintar(BASE);
    await screen.findByRole("heading", { name: /Contactos \(2\)/ });
    const tabla = tablaDe(/Contactos/);
    const cabeceras = within(tabla)
      .getAllByRole("columnheader")
      .map((c) => c.textContent);
    expect(cabeceras).toEqual(
      expect.arrayContaining([
        "Tipo",
        "Valor (últimos 4)",
        "Estado",
        "Acciones",
      ]),
    );
    expect(within(tabla).getAllByRole("row")).toHaveLength(3);
    // Sólo el contacto sin verificar ofrece reenviar el código.
    expect(
      within(tabla).getAllByRole("button", { name: /Reenviar código/ }),
    ).toHaveLength(1);
  });

  it("los consentimientos son una tabla con otorgado y revocado", async () => {
    pintar(BASE);
    await screen.findByRole("heading", { name: /Consentimientos \(2\)/ });
    const tabla = tablaDe(/Consentimientos/);
    const cabeceras = within(tabla)
      .getAllByRole("columnheader")
      .map((c) => c.textContent);
    expect(cabeceras).toEqual(
      expect.arrayContaining(["Finalidad", "Estado", "Otorgado", "Revocado"]),
    );
    expect(within(tabla).getByText("credit_bureau")).toBeInTheDocument();
    expect(within(tabla).getByText("No otorgado")).toBeInTheDocument();
  });

  it("los casos abiertos son tablas con código, prioridad y fecha", async () => {
    pintar(BASE);
    await screen.findByRole("heading", {
      name: /Casos de revisión manual \(1\)/,
    });
    const revision = tablaDe(/Casos de revisión manual/);
    expect(within(revision).getByText("MR-71")).toBeInTheDocument();
    expect(
      within(revision)
        .getAllByRole("columnheader")
        .map((c) => c.textContent),
    ).toEqual(
      expect.arrayContaining(["Caso", "Prioridad", "Estado", "Abierto"]),
    );
    const fraude = tablaDe(/Casos de fraude/);
    expect(within(fraude).getByText("FR-88")).toBeInTheDocument();
  });

  it("sin registros dice qué falta en vez de dejar el hueco", async () => {
    pintar({
      ...BASE,
      contacts: [],
      consents: [],
      manualReviewCases: [],
      fraudCases: [],
    });
    expect(
      await screen.findByText("Sin contactos registrados."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Sin consentimientos registrados."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Sin casos de revisión manual abiertos."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Sin casos de fraude abiertos."),
    ).toBeInTheDocument();
  });

  it("con muchas filas ofrece buscador y recorta las que no coinciden", async () => {
    const consents = Array.from({ length: 9 }, (_, i) => ({
      purposeCode: `finalidad_${i}`,
      granted: true,
      grantedAt: null,
      revokedAt: null,
    }));
    pintar({ ...BASE, consents });
    await screen.findByRole("heading", { name: /Consentimientos \(9\)/ });
    const buscador = screen.getByRole("textbox", {
      name: "Buscar por finalidad…",
    });
    await userEvent.type(buscador, "finalidad_7");
    // El buscador espera a que se deje de teclear (debounce de FilterBar).
    await waitFor(() => expect(screen.queryByText("finalidad_3")).toBeNull());
    expect(screen.getByText("finalidad_7")).toBeInTheDocument();
  });
});
