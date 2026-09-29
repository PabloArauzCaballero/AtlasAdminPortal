import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../helpers/render-with-providers";

vi.setConfig({ testTimeout: 30000 });

const services = vi.hoisted(() => ({
  listReviewQueue: vi.fn(),
  reviewCatalogTarget: vi.fn(),
}));
vi.mock("@/features/systems/services", () => services);
vi.mock("@/shared/auth/permission-gate", () => ({
  PermissionGate: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

const { ReviewQueuePage } =
  await import("@/features/review-queue/review-queue-page");

const empty = { items: [], total: 0 };

beforeEach(() => {
  Object.values(services).forEach((fn) => fn.mockReset());
  services.listReviewQueue.mockResolvedValue({
    endpoints: empty,
    dataEntities: empty,
    dataEntityImpacts: empty,
    fieldImpacts: empty,
    toolRequirements: empty,
    dataColumnImpacts: {
      total: 1,
      items: [
        {
          columnId: "77",
          dataEntityId: "12",
          schemaName: "core",
          tableName: "customers",
          columnName: "document_number",
          businessName: "Número de carnet",
          dataType: "varchar",
          containsPii: true,
          reviewStatus: "NEEDS_REVIEW",
        },
      ],
    },
  });
  services.reviewCatalogTarget.mockResolvedValue({});
});

async function columnRow() {
  const cell = await screen.findByText("core.customers.document_number");
  return cell.closest("tr") as HTMLElement;
}

describe("Cola de revisión · columnas (PATCH /systems/data-entities/columns/:id/review)", () => {
  it("pinta el cubo de columnas que el servidor ya devolvía", async () => {
    renderWithProviders(<ReviewQueuePage />);
    const row = await columnRow();
    expect(within(row).getByText("Número de carnet")).toBeInTheDocument();
    expect(screen.getByText("Columnas de datos (1)")).toBeInTheDocument();
  });

  it("rechazar exige motivo y lo manda como notes", async () => {
    renderWithProviders(<ReviewQueuePage />);
    const row = await columnRow();
    await userEvent.click(
      within(row).getByRole("button", { name: "Rechazar" }),
    );

    const dialog = await screen.findByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Rechazar" }),
    );
    expect(
      await within(dialog).findByText(/escribe el motivo/),
    ).toBeInTheDocument();
    expect(services.reviewCatalogTarget).not.toHaveBeenCalled();

    await userEvent.type(
      within(dialog).getByRole("textbox"),
      "No es dato personal: es un código interno.",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Rechazar" }),
    );

    await vi.waitFor(() =>
      expect(services.reviewCatalogTarget).toHaveBeenCalledWith(
        "column",
        "77",
        {
          reviewStatus: "REJECTED",
          confidenceLevel: "MEDIUM",
          notes: "No es dato personal: es un código interno.",
        },
      ),
    );
  });

  it("aprobar sin motivo no manda notes vacías", async () => {
    renderWithProviders(<ReviewQueuePage />);
    const row = await columnRow();
    await userEvent.click(within(row).getByRole("button", { name: "Aprobar" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Aprobar" }),
    );

    await vi.waitFor(() =>
      expect(services.reviewCatalogTarget).toHaveBeenCalledWith(
        "column",
        "77",
        {
          reviewStatus: "APPROVED",
          confidenceLevel: "HIGH",
        },
      ),
    );
  });
});

describe("Revisión del catálogo · buscar y paginar por familia", () => {
  it("pide cada familia por su cuenta (`type`), no las seis con una página compartida", async () => {
    renderWithProviders(<ReviewQueuePage />);
    await columnRow();
    const tipos = services.listReviewQueue.mock.calls.map(
      ([query]) => (query as { type: string }).type,
    );
    expect(new Set(tipos)).toEqual(
      new Set([
        "endpoints",
        "data_entities",
        "data_column_impacts",
        "data_impacts",
        "field_impacts",
        "tool_requirements",
      ]),
    );
  });

  it("el buscador viaja al servidor como `q` a las seis familias", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReviewQueuePage />);
    await columnRow();
    await user.type(
      screen.getByPlaceholderText(
        "Buscar ruta, tabla, columna, campo o herramienta…",
      ),
      "carnet",
    );
    await vi.waitFor(() => {
      const conTexto = services.listReviewQueue.mock.calls.filter(
        ([query]) => (query as { q?: string }).q === "carnet",
      );
      expect(conTexto).toHaveLength(6);
    });
  });

  it("pagina con el `meta` de la familia: la página 2 se pide sólo para esa familia", async () => {
    const user = userEvent.setup();
    services.listReviewQueue.mockImplementation(
      async (query: { type: string; page: number }) => {
        const bucket = (total: number) => ({ items: [], total });
        const base = {
          endpoints: bucket(0),
          dataEntities: bucket(0),
          dataEntityImpacts: bucket(0),
          fieldImpacts: bucket(0),
          toolRequirements: bucket(0),
          dataColumnImpacts: bucket(0),
        };
        if (query.type !== "endpoints") return base;
        return {
          ...base,
          endpoints: {
            total: 25,
            items: [
              {
                endpointId: String(query.page),
                code: `ruta-pagina-${query.page}`,
                method: "GET",
                fullPath: `/v1/p${query.page}`,
                module: "loans",
                reviewStatus: "NEEDS_REVIEW",
              },
            ],
            meta: { page: query.page, limit: 10, total: 25, totalPages: 3 },
          },
        };
      },
    );
    renderWithProviders(<ReviewQueuePage />);
    expect(await screen.findByText("Rutas (25)")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: /siguiente/i })[0]!);
    await vi.waitFor(() =>
      expect(services.listReviewQueue).toHaveBeenCalledWith(
        expect.objectContaining({ type: "endpoints", page: 2 }),
      ),
    );
    expect(services.listReviewQueue).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "data_entities", page: 2 }),
    );
  });

  it("si una familia falla, lo dice con reintento sin tapar las demás", async () => {
    services.listReviewQueue.mockImplementation(
      async (query: { type: string }) => {
        if (query.type === "tool_requirements")
          throw new Error("caída puntual");
        return {
          endpoints: empty,
          dataEntities: empty,
          dataEntityImpacts: empty,
          fieldImpacts: empty,
          toolRequirements: empty,
          dataColumnImpacts: empty,
        };
      },
    );
    renderWithProviders(<ReviewQueuePage />);
    expect(
      await screen.findByText("No se pudo cargar esta parte de la revisión."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Nada que revisar aquí").length).toBeGreaterThan(
      0,
    );
  });
});
