import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../helpers/render-with-providers";

vi.setConfig({ testTimeout: 30000 });

const logs = vi.hoisted(() => ({
  listActionLogs: vi.fn(),
  getActionLogFilterCatalog: vi.fn(),
  getActionLogsByRequest: vi.fn(),
  listMongoLogs: vi.fn(),
}));
vi.mock("@/features/systems/log-services", () => logs);

const { AuditSqlSection } = await import("@/features/audit/audit-sql-section");
const { MongoLogsSection } =
  await import("@/features/audit/mongo-logs-section");

const page = {
  items: [],
  meta: { page: 1, limit: 25, total: 0, totalPages: 0 },
};

beforeEach(() => {
  Object.values(logs).forEach((fn) => fn.mockReset());
  logs.listActionLogs.mockResolvedValue(page);
  logs.getActionLogFilterCatalog.mockResolvedValue({
    fields: [
      {
        name: "method",
        label: "Método HTTP",
        source: "SCHEMA",
        control: "select",
        options: [{ value: "GET", label: "GET" }],
      },
      {
        name: "module",
        label: "Módulo",
        source: "DATA",
        control: "combobox",
        options: [{ value: "credit", label: "credit" }],
        help: "Módulos que aparecen en la bitácora de este tenant.",
      },
      {
        name: "statusCode",
        label: "Código de respuesta",
        source: "SCHEMA",
        control: "number",
        options: [],
        help: "Código HTTP exacto (100–599).",
      },
      {
        name: "requestId",
        label: "Request ID",
        source: "SCHEMA",
        control: "text",
        options: [],
      },
    ],
  });
});

describe("Auditoría SQL · filtros desde GET /systems/action-logs/filter-catalog", () => {
  it("pinta los filtros que publica el servidor, no una lista fija", async () => {
    renderWithProviders(<AuditSqlSection />);

    expect(await screen.findByTestId("select-module")).toBeInTheDocument();
    expect(screen.getByTestId("select-method")).toBeInTheDocument();
    expect(screen.getByLabelText("Código de respuesta")).toBeInTheDocument();
    // El Request ID va en el buscador, no se repite como campo suelto.
    expect(screen.queryByLabelText("Request ID")).not.toBeInTheDocument();
    expect(logs.getActionLogFilterCatalog).toHaveBeenCalledTimes(1);
  });

  it("un filtro escrito viaja en la consulta y vuelve a la página 1", async () => {
    renderWithProviders(<AuditSqlSection />);
    const code = await screen.findByLabelText("Código de respuesta");
    await userEvent.type(code, "500");

    await vi.waitFor(() =>
      expect(logs.listActionLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({ statusCode: "500", page: 1, limit: 25 }),
      ),
    );
  });

  it("si el catálogo falla, la bitácora sigue y lo avisa", async () => {
    logs.getActionLogFilterCatalog.mockRejectedValue(new Error("caída"));
    renderWithProviders(<AuditSqlSection />);

    expect(
      await screen.findByText(/solo puedes buscar por código de referencia/),
    ).toBeInTheDocument();
    expect(logs.listActionLogs).toHaveBeenCalled();
    expect(
      screen.getByPlaceholderText("Filtrar por código de referencia…"),
    ).toBeInTheDocument();
  });
});

describe("Auditoría SQL · buscador libre `q` (servidor que lo publica)", () => {
  beforeEach(() => {
    logs.getActionLogFilterCatalog.mockResolvedValue({
      fields: [
        {
          name: "q",
          label: "Buscar",
          source: "SCHEMA",
          control: "text",
          options: [],
        },
        {
          name: "requestId",
          label: "Request ID",
          source: "SCHEMA",
          control: "text",
          options: [],
        },
      ],
    });
  });

  it("el buscador busca por ruta o rol y viaja como `q`; el Request ID pasa a campo exacto", async () => {
    renderWithProviders(<AuditSqlSection />);
    const buscador = await screen.findByPlaceholderText(
      "Buscar por ruta o rol de quien la hizo…",
    );
    expect(screen.getByLabelText("Request ID")).toBeInTheDocument();
    await userEvent.type(buscador, "loans");
    await vi.waitFor(() =>
      expect(logs.listActionLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: "loans", page: 1 }),
      ),
    );
  });
});

describe("Terminal del backend · paginación", () => {
  it("la vista terminal tiene paginación: la página 2 se alcanza sin cambiar a Tabla", async () => {
    logs.listMongoLogs.mockResolvedValue({
      items: [],
      meta: { page: 1, limit: 20, total: 45, totalPages: 3 },
    });
    renderWithProviders(<MongoLogsSection />);
    expect(await screen.findByText(/Página 1 de 3/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    await vi.waitFor(() =>
      expect(logs.listMongoLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
      ),
    );
  });
});
