import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/shared/api/client";
import { renderWithProviders } from "../../../helpers/render-with-providers";

vi.mock("@/shared/api/client", () => ({ apiRequest: vi.fn() }));
vi.mock("@/shared/auth/role-gate", () => ({
  RoleGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const { ExportsPage } = await import("@/features/data-exports/exports-page");
const { ExportDetailPage } =
  await import("@/features/data-exports/export-detail-page");
const { catalogPath } =
  await import("@/features/data-exports/download-catalog");

const request = vi.mocked(apiRequest);

/** Lo que responde de verdad `GET /internal/exports`: descriptores, sin estado ni fechas. */
const CATALOGO = {
  exportId: "export-data-catalog",
  name: "Catálogo de datos",
  resourceType: "system_data_entity_catalog",
  resourceId: null,
  format: "JSON",
  downloadUrl: "/api/v1/systems/data-entities",
  metadata: { rows: 320, reason: "Gobierno de datos" },
};

describe("Exportaciones — lo que hay es un catálogo descargable, no una cola de trabajos", () => {
  beforeEach(() => request.mockReset());

  it("el listado enseña filas y propósito, y no columnas de estado que siempre salían vacías", async () => {
    request.mockResolvedValue({
      items: [CATALOGO],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    renderWithProviders(<ExportsPage />);

    expect(await screen.findByText("Catálogo de datos")).toBeInTheDocument();
    expect(screen.getByText("Gobierno de datos")).toBeInTheDocument();
    expect(screen.getAllByText("320").length).toBeGreaterThan(0);
    expect(screen.queryByText("Solicitado por")).not.toBeInTheDocument();
    expect(screen.queryByText("Expira")).not.toBeInTheDocument();
    expect(screen.queryByText("Fallidas")).not.toBeInTheDocument();
  });

  it("el detalle ofrece descargar y no dice «Procesando… el trabajo sigue» de algo que no existe", async () => {
    request.mockResolvedValue({
      ...CATALOGO,
      reason: "Gobierno de datos",
      policySnapshot: { masking: "no_raw_pii", audit: true },
    });
    renderWithProviders(<ExportDetailPage exportId="export-data-catalog" />);

    expect(
      await screen.findByRole("button", { name: "Descargar JSON" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Procesando/)).not.toBeInTheDocument();
    expect(
      screen.getByText("No incluye datos personales en claro"),
    ).toBeInTheDocument();
  });

  it("la ruta de descarga se resuelve contra la propia API y nunca sigue otro origen", () => {
    expect(catalogPath("/api/v1/systems/data-entities")).toBe(
      "/systems/data-entities",
    );
    expect(catalogPath("/internal/data-quality/rules")).toBe(
      "/internal/data-quality/rules",
    );
    expect(catalogPath("https://otro.example/datos")).toBeNull();
    expect(catalogPath("//otro.example/datos")).toBeNull();
    expect(catalogPath("")).toBeNull();
  });
});
