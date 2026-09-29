import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../helpers/render-with-providers";

vi.setConfig({ testTimeout: 30000 });

const services = vi.hoisted(() => ({
  listSchemaVersions: vi.fn(),
  listSchemaChangeLog: vi.fn(),
  listSchemaNames: vi.fn(),
  listSchemaTables: vi.fn(),
  getSchemaVersion: vi.fn(),
  getSchemaTable: vi.fn(),
  proposeSchemaTable: vi.fn(),
  approveSchemaChange: vi.fn(),
}));
vi.mock("@/features/schema-management/services", () => services);
vi.mock("@/features/admin-forms/admin-forms-table", () => ({
  AdminFormsTable: () => null,
}));
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));
vi.mock("@/shared/auth/role-gate", () => ({
  RoleGate: ({ children }: { children: ReactNode }) => children,
}));

const vacio = {
  items: [],
  meta: { page: 1, limit: 20, total: 0, totalPages: 1 },
};

const { SchemaChangeLogTable } =
  await import("@/features/schema-management/schema-change-log-table");
const { SchemaVersionsPage } =
  await import("@/features/schema-management/schema-versions-page");

beforeEach(() => {
  Object.values(services).forEach((fn) => fn.mockReset());
  services.listSchemaVersions.mockResolvedValue(vacio);
  services.listSchemaChangeLog.mockResolvedValue(vacio);
});

/**
 * El buscador del change log era el ID numérico del solicitante (una letra daba 400) y las
 * versiones no tenían buscador. Ahora los dos mandan `q` al servidor, y vacío no viaja.
 */
describe("Esquema · buscadores", () => {
  it("el change log busca por tabla o tipo de cambio con `q`, no por ID de solicitante", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SchemaChangeLogTable />);
    const buscador = await screen.findByPlaceholderText(
      "Buscar por tabla propuesta o tipo de cambio…",
    );
    const primera = services.listSchemaChangeLog.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(primera).not.toHaveProperty("q");
    expect(primera).not.toHaveProperty("requesterUserId");
    await user.type(buscador, "cuentas");
    await vi.waitFor(() =>
      expect(services.listSchemaChangeLog).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: "cuentas", offset: 0 }),
      ),
    );
    expect(
      await screen.findByText("Ninguna propuesta coincide con la búsqueda."),
    ).toBeInTheDocument();
  });

  it("las versiones tienen buscador y el texto viaja como `q`", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SchemaVersionsPage />);
    await user.type(
      await screen.findByPlaceholderText("Buscar versión por código o notas…"),
      "v1",
    );
    await vi.waitFor(() =>
      expect(services.listSchemaVersions).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: "v1", offset: 0 }),
      ),
    );
  });
});
