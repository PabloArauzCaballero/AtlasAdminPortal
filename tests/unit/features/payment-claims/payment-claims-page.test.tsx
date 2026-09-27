import { HttpResponse, http } from "msw";
import { screen, waitFor, within } from "@testing-library/react";
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

const mockUseAuth = vi.fn();
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

const { PaymentClaimsPage } =
  await import("@/features/payment-claims/payment-claims-page");
const { formatAgeHours } = await import("@/features/payment-claims/labels");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

/**
 * Avisos de pago (B4): la cola que ningún portal interno veía. Lo que se fija es lo que haría
 * inútil la pantalla sin romperla: que lo atrasado no se distinga, que los enlaces no lleven a la
 * ficha, que un filtro no llegue a la API, o que la pantalla se ponga a verificar por el comercio.
 */
const peticiones: Array<{ method: string; url: URL }> = [];

function aviso(over: Record<string, unknown> = {}) {
  return {
    claimId: "11",
    claimCode: "PC-11",
    status: "pending_verification",
    claimedAmount: "150.00",
    currencyCode: "BOB",
    payerReference: "REF-1",
    hasProof: true,
    submittedAt: "2026-09-23T12:00:00.000Z",
    decidedAt: null,
    rejectionReason: null,
    loanId: "7",
    loanCode: "L-7",
    installmentId: "70",
    installmentNumber: 2,
    installmentDueDate: "2026-09-20",
    customerId: "9",
    customerCode: "C-9",
    customerName: "Ana Pérez",
    partnerId: "3",
    partnerName: "Tienda Uno",
    ageHours: 72,
    stale: true,
    ...over,
  };
}

const RESPUESTA = {
  data: {
    items: [
      aviso(),
      aviso({
        claimId: "12",
        claimCode: "PC-12",
        status: "rejected",
        ageHours: 5,
        stale: false,
        decidedAt: "2026-09-23T17:00:00.000Z",
        rejectionReason: "No llegó a la cuenta",
      }),
    ],
    meta: { page: 1, pageSize: 25, total: 2, totalPages: 1 },
    summary: { pending: 4, stalePending: 1, staleAfterHours: 48 },
  },
};

beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });
  server.events.on("request:start", ({ request }) => {
    peticiones.push({ method: request.method, url: new URL(request.url) });
  });
});

beforeEach(() => {
  peticiones.length = 0;
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  mockUseAuth.mockReturnValue({
    permissions: [],
    roles: ["internal_operator"],
    hasAnyRole: () => true,
    hasPermission: () => true,
  });
  server.use(
    http.get(`${API_BASE}/operations/payment-claims`, () =>
      HttpResponse.json(RESPUESTA),
    ),
  );
});

afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});

afterAll(() => server.close());

const ultimaConsulta = () =>
  peticiones.filter((p) => p.url.pathname.endsWith("/payment-claims")).at(-1)!
    .url.searchParams;

describe("PaymentClaimsPage", () => {
  it("resalta el pendiente atrasado y enlaza a la ficha del préstamo y del cliente", async () => {
    renderWithProviders(<PaymentClaimsPage />);
    const fila = (await screen.findByText("PC-11")).closest("tr")!;

    expect(within(fila).getByText("3 d · atrasado")).toBeInTheDocument();
    expect(
      within(fila).getByRole("link", { name: "L-7 · cuota 2" }),
    ).toHaveAttribute("href", "/internal/operations/loans/7");
    expect(
      within(fila).getByRole("link", { name: "Ana Pérez" }),
    ).toHaveAttribute(
      "href",
      "/internal/operations/customers/9/investigation-summary",
    );

    const rechazado = screen.getByText("PC-12").closest("tr")!;
    expect(within(rechazado).queryByText(/atrasado/)).toBeNull();
    expect(
      within(rechazado).getByText("No llegó a la cuenta"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Atrasados (más de 48 h)").parentElement,
    ).toHaveTextContent("1");
    expect(
      screen.getByText("Pendientes en la cola").parentElement,
    ).toHaveTextContent("4");
  });

  it("«Ver sólo los atrasados» pide pendientes de más de 48 h", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PaymentClaimsPage />);
    await screen.findByText("PC-11");

    await user.click(
      screen.getByRole("button", { name: "Ver sólo los atrasados" }),
    );
    await waitFor(() =>
      expect(ultimaConsulta().get("olderThanHours")).toBe("48"),
    );
    expect(ultimaConsulta().get("status")).toBe("pending_verification");
    expect(ultimaConsulta().get("pageSize")).toBe("25");
  });

  it("pulsar el comercio filtra por él, y el filtro se puede quitar", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PaymentClaimsPage />);
    const fila = (await screen.findByText("PC-11")).closest("tr")!;

    await user.click(within(fila).getByRole("button", { name: "Tienda Uno" }));
    await waitFor(() => expect(ultimaConsulta().get("partnerId")).toBe("3"));

    await user.click(
      screen.getByRole("button", {
        name: "Quitar el filtro del comercio #3",
      }),
    );
    await waitFor(() => expect(ultimaConsulta().get("partnerId")).toBeNull());
  });

  it("sólo observa: no hay botones de verificar ni otra petición que GET", async () => {
    renderWithProviders(<PaymentClaimsPage />);
    await screen.findByText("PC-11");
    expect(
      screen.queryByRole("button", { name: /verificar|confirmar|rechazar/i }),
    ).toBeNull();
    expect(peticiones.every((p) => p.method === "GET")).toBe(true);
  });

  it("dice qué falló si la API responde con error", async () => {
    server.use(
      http.get(`${API_BASE}/operations/payment-claims`, () =>
        HttpResponse.json(
          { error: { code: "FORBIDDEN", message: "Rol insuficiente" } },
          { status: 403 },
        ),
      ),
    );
    renderWithProviders(<PaymentClaimsPage />);
    expect(await screen.findByText(/Rol insuficiente/)).toBeInTheDocument();
  });
});

describe("formatAgeHours", () => {
  it("horas sueltas, días exactos y días con horas", () => {
    expect(formatAgeHours(5)).toBe("5 h");
    expect(formatAgeHours(48)).toBe("2 d");
    expect(formatAgeHours(50)).toBe("2 d 2 h");
  });
});
