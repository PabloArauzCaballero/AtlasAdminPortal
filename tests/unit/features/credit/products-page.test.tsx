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
import { elegirOpcion } from "../../shared/option-select-helpers";

const mockUseAuth = vi.fn();
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

const { CreditProductsPage } = await import("@/features/credit/products-page");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

const peticiones: Array<{ method: string; path: string; body: unknown }> = [];

const PRODUCTO = {
  id: "21",
  productCode: "consumo_12m",
  productName: "Consumo 12 meses",
  description: null,
  currencyCode: "BOB",
  minAmount: "500.00",
  maxAmount: "5000.00",
  minTermMonths: 3,
  maxTermMonths: 12,
  annualInterestRate: null,
  minMonthlyIncome: null,
  requiresManualReview: false,
  status: "active",
  effectiveFrom: null,
  effectiveUntil: null,
};

beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });
  server.events.on("request:start", async ({ request }) => {
    const body =
      request.method === "GET"
        ? null
        : await request
            .clone()
            .json()
            .catch(() => null);
    peticiones.push({
      method: request.method,
      path: new URL(request.url).pathname.replace("/api/v1", ""),
      body,
    });
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
    http.get(`${API_BASE}/operations/credit/products`, () =>
      HttpResponse.json({ data: { products: [PRODUCTO] } }),
    ),
  );
});

afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});

afterAll(() => server.close());

async function rellenar(label: RegExp, valor: string) {
  const campo = screen.getByLabelText(label);
  await userEvent.clear(campo);
  await userEvent.type(campo, valor);
}

describe("CreditProductsPage · catálogo, alta y estado", () => {
  it("pinta el catálogo con montos, plazo y las acciones del estado activo", async () => {
    renderWithProviders(<CreditProductsPage />);
    await screen.findByText("Consumo 12 meses");
    expect(screen.getByText("Activo")).toBeInTheDocument();
    expect(screen.getByText("3–12 meses")).toBeInTheDocument();
    expect(screen.getByText("La fija el motor")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Suspender" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retirar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Activar" })).toBeNull();
  });

  it("crea en borrador, conserva lo escrito ante un código repetido y luego ofrece activar", async () => {
    let intentos = 0;
    server.use(
      http.post(`${API_BASE}/operations/credit/products`, () => {
        intentos += 1;
        if (intentos === 1)
          return HttpResponse.json(
            {
              error: {
                code: "CONFLICT",
                message: "CREDIT_PRODUCT_CODE_ALREADY_EXISTS",
              },
              timestamp: "2026-09-26T00:00:00.000Z",
            },
            { status: 409 },
          );
        return HttpResponse.json({
          data: {
            productId: "22",
            productCode: "consumo_24m",
            status: "draft",
          },
        });
      }),
      http.patch(`${API_BASE}/operations/credit/products/22/status`, () =>
        HttpResponse.json({
          data: { productId: "22", previousStatus: "draft", status: "active" },
        }),
      ),
    );
    renderWithProviders(<CreditProductsPage />);
    await screen.findByText("Consumo 12 meses");

    await userEvent.click(
      screen.getByRole("button", { name: "Nuevo producto" }),
    );
    await rellenar(/^Código/, "consumo_12m");
    await rellenar(/^Nombre/, "Consumo 24 meses");
    await rellenar(/^Monto mínimo/, "1000");
    await rellenar(/^Monto máximo/, "10000");
    await rellenar(/^Plazo mínimo/, "6");
    await rellenar(/^Plazo máximo/, "24");
    await userEvent.click(
      screen.getByRole("button", { name: "Crear en borrador" }),
    );

    expect(
      await screen.findByText("Ya existe un producto con este código."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^Nombre/)).toHaveValue("Consumo 24 meses");

    await rellenar(/^Código/, "consumo_24m");
    await userEvent.click(
      screen.getByRole("button", { name: "Crear en borrador" }),
    );

    await screen.findByText(/creado en borrador/);
    expect(peticiones.filter((p) => p.method === "POST").at(-1)?.body).toEqual({
      productCode: "consumo_24m",
      productName: "Consumo 24 meses",
      currencyCode: "BOB",
      minAmount: 1000,
      maxAmount: 10000,
      minTermMonths: 6,
      maxTermMonths: 24,
      requiresManualReview: false,
    });

    await userEvent.click(
      screen.getByRole("button", { name: "Activar ahora" }),
    );
    const dialogo = await screen.findByRole("dialog");
    await elegirOpcion(
      within(dialogo).getByRole("combobox", { name: /^Motivo/ }),
      "commercial_launch",
    );
    await userEvent.click(
      within(dialogo).getByRole("button", { name: "Confirmar: activo" }),
    );

    await waitFor(() =>
      expect(peticiones).toContainEqual({
        method: "PATCH",
        path: "/operations/credit/products/22/status",
        body: { status: "active", reasonCode: "commercial_launch" },
      }),
    );
    await screen.findByText("«consumo_24m» pasó a activo.");
  });

  it("suspender pide motivo antes de enviar nada", async () => {
    renderWithProviders(<CreditProductsPage />);
    await screen.findByText("Consumo 12 meses");
    await userEvent.click(screen.getByRole("button", { name: "Suspender" }));
    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByText(/dejarán de verlo/)).toBeInTheDocument();
    await userEvent.click(
      within(dialogo).getByRole("button", { name: "Confirmar: suspendido" }),
    );
    expect(
      await within(dialogo).findByText("Elige el motivo del cambio."),
    ).toBeInTheDocument();
    expect(peticiones.some((p) => p.method === "PATCH")).toBe(false);
  });

  it("sin el rol del controlador de crédito no pinta el catálogo", () => {
    mockUseAuth.mockReturnValue({
      permissions: [],
      roles: ["compliance_analyst"],
      hasAnyRole: () => false,
      hasPermission: () => false,
    });
    renderWithProviders(<CreditProductsPage />);
    expect(screen.getByText("Acceso restringido")).toBeInTheDocument();
  });

  it("es una tabla con su buscador y su filtro de estado sobre el catálogo entero", async () => {
    server.use(
      http.get(`${API_BASE}/operations/credit/products`, () =>
        HttpResponse.json({
          data: {
            products: [
              PRODUCTO,
              {
                ...PRODUCTO,
                id: "22",
                productCode: "pyme_24m",
                productName: "Pyme 24 meses",
                status: "draft",
              },
            ],
          },
        }),
      ),
    );
    renderWithProviders(<CreditProductsPage />);
    await screen.findByText("Consumo 12 meses");
    expect(
      within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((c) => c.textContent),
    ).toEqual(expect.arrayContaining(["Producto", "Estado", "Monto"]));

    await elegirOpcion(
      screen.getByRole("combobox", { name: /^Estado/ }),
      "draft",
    );
    await waitFor(() =>
      expect(screen.queryByText("Consumo 12 meses")).toBeNull(),
    );
    expect(screen.getByText("Pyme 24 meses")).toBeInTheDocument();

    await elegirOpcion(screen.getByRole("combobox", { name: /^Estado/ }), "");
    await userEvent.type(
      screen.getByRole("textbox", {
        name: "Buscar por nombre, código, moneda o descripción…",
      }),
      "consumo_12m",
    );
    await waitFor(() => expect(screen.queryByText("Pyme 24 meses")).toBeNull());
    expect(screen.getByText("Consumo 12 meses")).toBeInTheDocument();

    await userEvent.clear(
      screen.getByRole("textbox", {
        name: "Buscar por nombre, código, moneda o descripción…",
      }),
    );
    await userEvent.type(
      screen.getByRole("textbox", {
        name: "Buscar por nombre, código, moneda o descripción…",
      }),
      "zzzz",
    );
    expect(
      await screen.findByText("Ningún producto coincide con los filtros."),
    ).toBeInTheDocument();
  });
});
