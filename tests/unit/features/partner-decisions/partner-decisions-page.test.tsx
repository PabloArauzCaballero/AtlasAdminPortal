import { HttpResponse, http } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

/**
 * Expedientes de comercio (P2, 2026-09-29): sin buscador, y «El más antiguo» salía de la página
 * cargada, así que desde la página 2 enseñaba una fecha falsa.
 */
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({
    permissions: [],
    hasAnyRole: () => true,
    hasPermission: () => false,
  }),
}));

const { PartnerDecisionsPage } =
  await import("@/features/partner-decisions/partner-decisions-page");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

const pedidas: URLSearchParams[] = [];

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
beforeEach(() => {
  pedidas.length = 0;
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  server.use(
    http.get(`${API_BASE}/operations/partners/queue`, ({ request }) => {
      pedidas.push(new URL(request.url).searchParams);
      return HttpResponse.json({
        data: {
          items: [],
          meta: { page: 2, limit: 25, total: 30, totalPages: 2 },
          // El más antiguo de TODA la cola, que no está en esta página.
          summary: { total: 30, oldestSubmittedAt: "2026-07-01T12:00:00.000Z" },
        },
      });
    }),
    http.get(`${API_BASE}/operations/partners/qr-codes/pending`, () =>
      HttpResponse.json({ data: { items: [] } }),
    ),
  );
});
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});
afterAll(() => server.close());

describe("PartnerDecisionsPage", () => {
  it("«Esperando» y «El más antiguo» salen del summary de toda la cola", async () => {
    renderWithProviders(<PartnerDecisionsPage />);
    await waitFor(() =>
      expect(
        screen.getByText("Esperando decisión").parentElement,
      ).toHaveTextContent("30"),
    );
    expect(screen.getByText("El más antiguo").parentElement).toHaveTextContent(
      /2026/,
    );
  });

  it("el buscador manda `q` (nombre o NIT) y vuelve a la página 1", async () => {
    renderWithProviders(<PartnerDecisionsPage />);
    await userEvent.type(
      await screen.findByRole("textbox", {
        name: /nombre del comercio o nit/i,
      }),
      "Sur",
    );
    await waitFor(() => expect(pedidas.at(-1)?.get("q")).toBe("Sur"));
    expect(pedidas.at(-1)?.get("page")).toBe("1");
  });
});
