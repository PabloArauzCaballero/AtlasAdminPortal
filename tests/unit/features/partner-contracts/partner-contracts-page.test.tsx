import { HttpResponse, http } from "msw";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
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
const { elegirOpcion } = await import("../../shared/option-select-helpers");
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
  consultas = [];
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

let consultas: URL[] = [];

/** Lo que el servidor devuelve: la página, su meta y el resumen con la vigente. */
function conPlantillas(
  items: Array<Record<string, unknown>>,
  total = items.length,
) {
  const vigente = items.find(
    (item) => item.isDefault === true && item.status === "active",
  );
  const activas = items.filter((item) => item.status === "active").length;
  server.use(
    http.get(
      `${API_BASE}/operations/partner-contract-templates`,
      ({ request }) => {
        consultas.push(new URL(request.url));
        return HttpResponse.json({
          data: {
            items,
            meta: {
              page: 1,
              limit: 20,
              total,
              totalPages: Math.ceil(total / 20) || 1,
            },
            summary: {
              total,
              active: activas,
              archived: total - activas,
              current: vigente ? { ...vigente, body: undefined } : null,
            },
          },
        });
      },
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
    expect(
      screen.getByText("Contrato vigente").parentElement,
    ).toHaveTextContent("v3");
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

  it("sin governance.policies.manage no ofrece publicar ni marcar: el servidor lo rechazaría", async () => {
    mockUseAuth.mockReturnValue({
      permissions: ["governance.policies.read"],
      roles: ["admin"],
      hasAnyRole: () => true,
      hasPermission: (permiso: string) =>
        permiso === "governance.policies.read",
    });
    conPlantillas([VIGENTE, { ...ARCHIVADA, status: "active" }]);

    renderWithProviders(<PartnerContractsPage />);

    await waitFor(() =>
      expect(screen.getByTestId("contrato-1")).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: "Publicar una versión" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Marcar como vigente" }),
    ).not.toBeInTheDocument();
  });

  it("las versiones son una tabla con cabeceras, y Ver texto abre el texto completo", async () => {
    conPlantillas([VIGENTE, ARCHIVADA]);
    renderWithProviders(<PartnerContractsPage />);

    const tabla = await screen.findByRole("table");
    for (const cabecera of [
      "Contrato",
      "Versión",
      "Estado",
      "En vigor desde",
      "Texto",
      "Acciones",
    ]) {
      expect(
        within(tabla).getByRole("columnheader", { name: cabecera }),
      ).toBeInTheDocument();
    }
    expect(within(tabla).getAllByRole("row")).toHaveLength(3);

    fireEvent.click(
      within(tabla).getAllByRole("button", { name: "Ver texto" })[0],
    );
    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "Cláusula primera.",
    );
  });

  it("el buscador, el estado y la página viajan al servidor; la vigente sale del resumen", async () => {
    conPlantillas([ARCHIVADA, { ...VIGENTE, isDefault: true }], 45);
    renderWithProviders(<PartnerContractsPage />);
    await screen.findByRole("table");
    expect(consultas.at(-1)?.searchParams.get("limit")).toBe("20");
    expect(
      screen.getByText("Contrato vigente").parentElement,
    ).toHaveTextContent("v3");
    expect(
      screen.getByText("Versiones publicadas").parentElement,
    ).toHaveTextContent("45");

    fireEvent.change(
      screen.getByRole("textbox", { name: /código o nombre del contrato/i }),
      { target: { value: "afil" } },
    );
    await waitFor(() =>
      expect(consultas.at(-1)?.searchParams.get("q")).toBe("afil"),
    );
    await elegirOpcion(
      screen.getByRole("combobox", { name: /^Estado/ }),
      "archived",
    );
    await waitFor(() =>
      expect(consultas.at(-1)?.searchParams.get("status")).toBe("archived"),
    );
    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    await waitFor(() =>
      expect(consultas.at(-1)?.searchParams.get("page")).toBe("2"),
    );
  });

  it("sin coincidencias dice que nada coincide, distinto de «no se publicó ninguna»", async () => {
    conPlantillas([VIGENTE], 1);
    renderWithProviders(<PartnerContractsPage />);
    await screen.findByRole("table");
    conPlantillas([], 0);
    fireEvent.change(
      screen.getByRole("textbox", { name: /código o nombre del contrato/i }),
      { target: { value: "zzz" } },
    );
    expect(
      await screen.findByText("Ninguna versión coincide con la búsqueda."),
    ).toBeInTheDocument();
  });
});
