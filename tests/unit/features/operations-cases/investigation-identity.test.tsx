import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { InvestigationSummaryPage } from "@/features/operations-cases/investigation-summary-page";
import type { InvestigationSummary } from "@/features/operations-cases/types";

/**
 * Identidad y agenda en la investigación de un caso.
 *
 * Es la mitad del expediente que esta pantalla no enseñaba. Quien investiga un fraude documental
 * tenía que abrir otra herramienta para saber si el carnet siquiera se había verificado, con qué
 * parecido y con cuánto riesgo de falsificación — así que la investigación empezaba reuniendo a
 * mano lo que ya estaba registrado, y con prisa se decidía sin ello.
 *
 * Lo que estas pruebas fijan no es que los números se pinten: es la DISTINCIÓN que hace honesta a
 * la pantalla. Una agenda no compartida y una agenda vacía tienen el mismo cero, y significan cosas
 * opuestas — una es menos evidencia y la otra sería evidencia en contra—. Enseñarlas igual invita a
 * leer una decisión legítima (negarse a dar un permiso) como una señal de riesgo.
 */

vi.mock("@/features/operations-cases/services", () => ({
  getInvestigationSummary: vi.fn(),
}));

const { getInvestigationSummary } = await import(
  "@/features/operations-cases/services"
);

const BASE: InvestigationSummary = {
  customer: {
    customerId: "900",
    customerCode: "CLI-900",
    status: "under_review",
    phoneLast4: "0122",
    emailDomain: "gmail.com",
    createdAt: "2026-08-01T10:00:00.000Z",
  },
  profile: {
    firstName: "María",
    lastName: "Rodríguez",
    birthDate: "2003-04-05",
    preferredLanguage: "es",
  },
  contacts: [],
  consents: [],
  latestRiskAssessment: null,
  manualReviewCases: [],
  fraudCases: [],
  latestIdentityVerification: {
    attemptId: "5501",
    channel: "MOBILE_APP",
    result: "IN_REVIEW",
    similarity: 0.883,
    fraudRisk: 0.68,
    requestedAt: "2026-08-26T12:00:00.000Z",
    completedAt: "2026-08-26T12:00:12.000Z",
  },
  addressBook: {
    available: true,
    totalContacts: 180,
    uniqueRatio: 0.94,
    bolivianRatio: 0.86,
    referencesFoundInAddressBook: 2,
    riskMatches: 1,
  },
};

function pintar(summary: InvestigationSummary) {
  vi.mocked(getInvestigationSummary).mockResolvedValue(summary);
  // `retry: false`: sin él, un fallo del doble se reintentaría tres veces con espera y la prueba
  // agotaría su plazo en vez de contar qué salió mal.
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

describe("investigación · verificación de identidad", () => {
  it("enseña el resultado, el parecido y el riesgo de fraude documental", async () => {
    pintar(BASE);

    expect(
      await screen.findByText("Verificación de identidad"),
    ).toBeInTheDocument();
    expect(screen.getByText("IN_REVIEW")).toBeInTheDocument();
    expect(screen.getByText("MOBILE_APP")).toBeInTheDocument();
    /*
     * Los dos números viven al lado y se confunden, así que el rótulo va entero: uno es cuánto se
     * parecen las dos caras y el otro cuánto se sospecha que el documento esté falsificado. Un
     * «Riesgo» a secas junto a un «Parecido» se lee como la misma escala invertida, que es
     * exactamente lo que no son.
     */
    expect(
      screen.getByText("Riesgo de fraude documental"),
    ).toBeInTheDocument();
  });

  it("sin verificaciones lo DICE, en vez de dejar la sección vacía", async () => {
    pintar({ ...BASE, latestIdentityVerification: null });

    expect(
      await screen.findByText("Sin verificaciones de identidad registradas"),
    ).toBeInTheDocument();
  });
});

describe("investigación · agenda del dispositivo", () => {
  it("enseña la forma de la agenda y los cruces conocidos", async () => {
    pintar(BASE);

    expect(await screen.findByText("Agenda del dispositivo")).toBeInTheDocument();
    expect(
      screen.getByText("Referencias dentro de la agenda"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Coincidencias con teléfonos ya marcados"),
    ).toBeInTheDocument();
  });

  it("NUNCA enseña un contacto: sólo cuentas y proporciones", async () => {
    /*
     * La afirmación que sostiene todo el diseño de esta señal. Las personas de la agenda de alguien
     * no consintieron nada, no son clientes y muchas ni saben que existimos. El contrato de la
     * pantalla —y el del endpoint que la alimenta— es que aquí no puede aparecer un nombre ni un
     * teléfono, y la forma de comprobarlo es que el tipo NO tenga por dónde traerlos.
     */
    const claves = Object.keys(BASE.addressBook);
    expect(claves).toEqual([
      "available",
      "totalContacts",
      "uniqueRatio",
      "bolivianRatio",
      "referencesFoundInAddressBook",
      "riskMatches",
    ]);
  });

  it("«no compartida» y «vacía» NO se leen igual", async () => {
    /*
     * Negarse a dar el permiso es un derecho, no una señal de fraude. Enseñarlo como una agenda de
     * cero contactos invitaría a leer una decisión legítima como sospechosa — y el artefacto, que
     * la pondera con veinte puntos de cien, estaría diciendo lo contrario que la pantalla.
     */
    pintar({
      ...BASE,
      addressBook: {
        available: false,
        totalContacts: 0,
        uniqueRatio: 0,
        bolivianRatio: 0,
        referencesFoundInAddressBook: 0,
        riskMatches: 0,
      },
    });

    const aviso = await screen.findByText(
      /No compartida — la persona no dio el permiso/,
    );
    expect(aviso).toBeInTheDocument();

    /*
     * Y NINGUNA cifra de la agenda, que no se midió.
     *
     * Se acota a la sección con `within` y no se busca en la página entera: «Contactos» es también
     * el título de la tarjeta de métodos de contacto del cliente, que sí existe y no tiene nada que
     * ver. Una aserción global aquí se pondría roja por el motivo equivocado.
     */
    const seccion = aviso.closest("section");
    expect(seccion).not.toBeNull();
    expect(
      within(seccion as HTMLElement).queryByText("Contactos"),
    ).not.toBeInTheDocument();
    expect(
      within(seccion as HTMLElement).queryByText("Números bolivianos"),
    ).not.toBeInTheDocument();
  });
});
