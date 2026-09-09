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

const { PartnerContractsPage } =
  await import("@/features/partner-contracts/partner-contracts-page");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

const VIGENTE = {
  templateId: "2",
  templateCode: "AFILIACION",
  name: "Contrato de afiliación de comercios",
  version: 3,
  body: "Cláusula primera. ".repeat(6),
  status: "active",
  isDefault: true,
  effectiveFrom: "2026-09-01T00:00:00.000Z",
  createdAt: "2026-09-01T00:00:00.000Z",
};

const ARCHIVADA = {
  ...VIGENTE,
  templateId: "1",
  version: 2,
  status: "archived",
  isDefault: false,
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
});

afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});

afterAll(() => server.close());

function conPlantillas(items: unknown[]) {
  server.use(
    http.get(`${API_BASE}/operations/partner-contract-templates`, () =>
      HttpResponse.json({ data: { items } }),
    ),
  );
}

describe("PartnerContractsPage — el contrato se versiona, no se edita", () => {
  it("enseña la versión vigente y conserva la archivada", async () => {
    conPlantillas([VIGENTE, ARCHIVADA]);

    renderWithProviders(<PartnerContractsPage />);

    await waitFor(() =>
      expect(screen.getByTestId("contrato-2")).toBeInTheDocument(),
    );
    expect(screen.getByText("Contrato vigente").parentElement).toHaveTextContent("v3");
    // La archivada NO se oculta: es la prueba de qué regía cada día.
    expect(screen.getByTestId("contrato-1")).toBeInTheDocument();
  });

  it("no ofrece editar en ninguna versión: sólo publicar una nueva", async () => {
    conPlantillas([VIGENTE, ARCHIVADA]);

    renderWithProviders(<PartnerContractsPage />);

    await waitFor(() =>
      expect(screen.getByTestId("contrato-2")).toBeInTheDocument(),
    );
    expect(screen.queryByRole("button", { name: /editar/i })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Publicar una versión" }),
    ).toBeInTheDocument();
  });

  /* Revivir un texto archivado desharía la retirada de quien tuvo un motivo para retirarlo. */
  it("una versión archivada no se puede marcar como vigente", async () => {
    conPlantillas([VIGENTE, ARCHIVADA]);

    renderWithProviders(<PartnerContractsPage />);

    await waitFor(() =>
      expect(screen.getByTestId("contrato-1")).toBeInTheDocument(),
    );
    expect(
      screen.queryAllByRole("button", { name: "Marcar como vigente" }),
    ).toHaveLength(0);
  });

  it("sin contrato vigente lo dice en rojo: el Motor lo sabrá", async () => {
    conPlantillas([]);

    renderWithProviders(<PartnerContractsPage />);

    await waitFor(() =>
      expect(
        screen.getByText(/No hay contrato de afiliación vigente/),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("Ninguno")).toBeInTheDocument();
  });

  it("una versión activa que no es la vigente sí se puede marcar", async () => {
    conPlantillas([VIGENTE, { ...ARCHIVADA, status: "active" }]);

    renderWithProviders(<PartnerContractsPage />);

    await waitFor(() =>
      expect(screen.getByTestId("contrato-1")).toBeInTheDocument(),
    );
    expect(
      screen.getAllByRole("button", { name: "Marcar como vigente" }),
    ).toHaveLength(1);
  });
});
