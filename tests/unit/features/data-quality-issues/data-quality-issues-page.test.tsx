import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/shared/api/client";
import { DataQualityIssuesPage } from "@/features/data-quality-issues/data-quality-issues-page";
import { renderWithProviders } from "../../../helpers/render-with-providers";
import { elegirOpcion } from "../../shared/option-select-helpers";

vi.mock("@/shared/api/client", () => ({ apiRequest: vi.fn() }));
let permisos = ["dataQuality.issues.read", "dataQuality.issues.resolve"];
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({
    permissions: permisos,
    roles: [],
    hasPermission: (p: string) => permisos.includes(p),
  }),
}));

const request = vi.mocked(apiRequest);
const consultas: Array<Record<string, unknown>> = [];
const envios: Array<{ path: string; body: unknown }> = [];

const issue = (id: string, status: string) => ({
  issueId: id,
  severity: "CRITICAL",
  entityType: "customer.customers",
  entityId: `rec-${id}`,
  issueCode: "DQ_TEL",
  ruleName: "Teléfono con largo del país",
  status,
  detectedAt: "2026-09-20T10:00:00.000Z",
  resolvedAt: null,
  resolutionNotes: null,
});

beforeEach(() => {
  permisos = ["dataQuality.issues.read", "dataQuality.issues.resolve"];
  consultas.length = 0;
  envios.length = 0;
  request.mockReset();
  request.mockImplementation(async (path, options) => {
    if (options?.method === "POST") {
      envios.push({ path, body: options.body });
      return { issueId: "1", status: "acknowledged" };
    }
    consultas.push((options?.query ?? {}) as Record<string, unknown>);
    return {
      items: [issue("1", "open"), issue("2", "acknowledged")],
      meta: { page: 1, limit: 20, total: 57, totalPages: 3 },
      summary: {
        total: 57,
        pending: 30,
        unreviewed: 21,
        acknowledged: 9,
        closed: 27,
        byStatus: {},
      },
    };
  });
});

describe("Incidencias de calidad · bandeja única (absorbe «Alertas»)", () => {
  it("las tarjetas salen del summary: pendientes, sin revisar, reconocidas y cerradas", async () => {
    renderWithProviders(<DataQualityIssuesPage />);
    await screen.findByText("rec-1");
    expect(screen.getByText("Pendientes").parentElement).toHaveTextContent(
      "30",
    );
    expect(screen.getByText("Sin revisar").parentElement).toHaveTextContent(
      "21",
    );
    expect(
      screen.getByText("Reconocidas sin corregir").parentElement,
    ).toHaveTextContent("9");
    expect(screen.getByText("Cerradas").parentElement).toHaveTextContent("27");
  });

  it("el buscador viaja como q (antes mandaba entityType exacto) y los filtros también", async () => {
    renderWithProviders(<DataQualityIssuesPage />);
    await screen.findByText("rec-1");
    fireEvent.change(
      screen.getByRole("textbox", { name: /tabla, código de regla o notas/i }),
      { target: { value: "customer" } },
    );
    await elegirOpcion(
      screen.getByRole("combobox", { name: /Estado/ }),
      "acknowledged",
    );
    await waitFor(() =>
      expect(consultas.at(-1)).toMatchObject({
        q: "customer",
        status: "acknowledged",
        page: 1,
      }),
    );
    expect(consultas.at(-1)).not.toHaveProperty("entityType");
  });

  it("reconocer se hace desde el diálogo, con motivo y notas, y queda pendiente", async () => {
    renderWithProviders(<DataQualityIssuesPage />);
    await screen.findByText("rec-1");
    await userEvent.click(
      screen.getAllByRole("button", { name: "Resolver" })[0]!,
    );
    await elegirOpcion(
      screen.getByRole("combobox", { name: /Resolución/ }),
      "acknowledged",
    );
    await userEvent.type(
      screen.getByRole("textbox", { name: /Notas/ }),
      "Proveedor caído, se corrige mañana.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Reconocer" }));
    await waitFor(() => expect(envios).toHaveLength(1));
    expect(envios[0]).toEqual({
      path: "/operations/data-quality/issues/1/resolve",
      body: {
        resolution: "acknowledged",
        reasonCode: "manual_review",
        notes: "Proveedor caído, se corrige mañana.",
      },
    });
  });

  it("una reconocida se puede cerrar (antes daba 409) y quien sólo lee no ve el botón", async () => {
    const { unmount } = renderWithProviders(<DataQualityIssuesPage />);
    await screen.findByText("rec-2");
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
    unmount();

    permisos = ["dataQuality.issues.read"];
    renderWithProviders(<DataQualityIssuesPage />);
    await screen.findByText("rec-1");
    expect(
      screen.queryByRole("button", { name: "Resolver" }),
    ).not.toBeInTheDocument();
  });

  it("si la carga falla se ve el error con reintentar", async () => {
    request.mockReset();
    request.mockRejectedValueOnce(new Error("caído")).mockResolvedValue({
      items: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    renderWithProviders(<DataQualityIssuesPage />);
    await userEvent.click(
      await screen.findByRole("button", { name: /reintentar/i }),
    );
    expect(
      await screen.findByText("No hay incidencias de calidad registradas."),
    ).toBeInTheDocument();
  });
});
