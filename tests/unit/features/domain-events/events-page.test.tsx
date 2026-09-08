import { HttpResponse, http } from "msw";
import { screen, waitFor } from "@testing-library/react";
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

const { DomainEventsPage } = await import("@/features/domain-events/events-page");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

/** Lo que el backend devuelve DE VERDAD: el listado dentro del sobre, con su paginación. */
const RESPUESTA_LISTADO = {
  requestId: "r-1",
  data: {
    data: [
      {
        id: "11",
        tenantId: "1",
        eventCode: "user.registered",
        eventFamily: "user_security",
        eventVersion: 1,
        aggregateType: "customer",
        aggregateId: "c-1",
        status: "failed",
        priority: 0,
        attempts: 3,
        maxAttempts: 3,
        availableAt: "2026-09-01T00:00:00.000Z",
        processedAt: null,
        failedAt: "2026-09-01T00:01:00.000Z",
        errorCode: "HANDLER_TIMEOUT",
        lastError: "timeout",
        idempotencyKey: null,
        correlationId: "corr-1",
        causationId: null,
        sourceModule: "auth",
        sourceAction: "register",
        payload: {},
        metadata: {},
        createdAt: "2026-09-01T00:00:00.000Z",
      },
    ],
    pagination: { mode: "offset", page: 1, limit: 20, total: 57, totalPages: 3 },
  },
  timestamp: "2026-09-08T00:00:00.000Z",
};

const RESPUESTA_CATALOGO = {
  requestId: "r-2",
  data: {
    data: [
      {
        code: "user.registered",
        family: "user_security",
        version: 1,
        description: "Alta de usuario",
        defaultPriority: 0,
        allowedAggregateTypes: ["customer"],
      },
      {
        code: "loan.disbursed",
        family: "credit",
        version: 1,
        description: "Desembolso",
        defaultPriority: 0,
        allowedAggregateTypes: ["loan"],
      },
    ],
  },
  timestamp: "2026-09-08T00:00:00.000Z",
};

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  mockUseAuth.mockReturnValue({
    permissions: [],
    roles: ["admin"],
    hasAnyRole: () => true,
    hasPermission: () => true,
  });
  server.use(
    http.get(`${API_BASE}/operations/events/catalog`, () =>
      HttpResponse.json(RESPUESTA_CATALOGO),
    ),
    http.get(`${API_BASE}/operations/events`, () =>
      HttpResponse.json(RESPUESTA_LISTADO),
    ),
  );
});

afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});

afterAll(() => server.close());

describe("DomainEventsPage — con la forma real del backend", () => {
  it("pinta la fila y el total real en vez de reventar con { data, pagination }", async () => {
    renderWithProviders(<DomainEventsPage />);

    // La fila de la tabla (la opción del desplegable también dice el código: se pide la celda).
    await waitFor(() =>
      expect(
        screen.getByRole("cell", { name: /user\.registered/ }),
      ).toBeInTheDocument(),
    );
    // El total viene de `pagination.total`, no de contar la página.
    expect(screen.getByText("Total con este filtro").parentElement).toHaveTextContent("57");
    // La definición del catálogo se contó aunque venga como `code`.
    expect(screen.getByText("Definiciones del catálogo").parentElement).toHaveTextContent("2");
  });

  it("ofrece los cinco estados del outbox en minúsculas, como los guarda el backend", async () => {
    renderWithProviders(<DomainEventsPage />);
    await waitFor(() =>
      expect(
        screen.getByRole("cell", { name: /user\.registered/ }),
      ).toBeInTheDocument(),
    );
    const estados = screen.getByLabelText("Estado") as HTMLSelectElement;
    const valores = Array.from(estados.options).map((o) => o.value);
    expect(valores).toEqual(
      expect.arrayContaining([
        "pending",
        "processing",
        "processed",
        "failed",
        "cancelled",
      ]),
    );
  });

  it("el desplegable de código sale del catálogo traducido", async () => {
    renderWithProviders(<DomainEventsPage />);
    await waitFor(() =>
      expect(
        screen.getByRole("cell", { name: /user\.registered/ }),
      ).toBeInTheDocument(),
    );
    const codigos = screen.getByLabelText("Código del catálogo") as HTMLSelectElement;
    const valores = Array.from(codigos.options).map((o) => o.value);
    expect(valores).toEqual(
      expect.arrayContaining(["user.registered", "loan.disbursed"]),
    );
  });
});
