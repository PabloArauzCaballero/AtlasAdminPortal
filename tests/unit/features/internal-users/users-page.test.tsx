import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/shared/api/client";
import { UsersPage } from "@/features/internal-users/users-page";
import {
  filterPermissions,
  filterRoles,
} from "@/features/internal-users/catalog-filter";
import { renderWithProviders } from "../../../helpers/render-with-providers";
import {
  elegirOpcion,
  valoresDeOpciones,
} from "../../shared/option-select-helpers";

vi.mock("@/shared/api/client", () => ({ apiRequest: vi.fn() }));
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({
    permissions: ["internal.users.read"],
    roles: [],
    hasPermission: () => true,
    hasAnyRole: () => true,
  }),
}));

const request = vi.mocked(apiRequest);
const consultas: Array<Record<string, unknown>> = [];
let falla = false;

const usuario = (pagina: number) => ({
  id: String(pagina),
  email: `persona${pagina}@atlas.test`,
  fullName: `Persona ${pagina}`,
  status: "active",
  department: "RISK",
  jobTitle: "Analista",
  roles: ["risk_analyst"],
  permissions: [],
});

beforeEach(() => {
  consultas.length = 0;
  falla = false;
  request.mockReset();
  request.mockImplementation(async (path, options) => {
    const query = (options?.query ?? {}) as Record<string, unknown>;
    if (path === "/internal/roles") {
      return {
        items: [
          {
            id: "1",
            code: "risk_analyst",
            name: "Analista de riesgo",
            description: "Revisa casos de riesgo.",
          },
          {
            id: "2",
            code: "auditor_sin_usuarios",
            name: "Auditoría",
            description: "Sólo lectura.",
          },
        ],
      };
    }
    consultas.push(query);
    if (falla) throw new Error("sin red");
    return {
      items: [usuario(Number(query.page ?? 1))],
      meta: { page: query.page ?? 1, limit: 25, total: 60, totalPages: 3 },
    };
  });
});

describe("Usuarios internos (L2)", () => {
  it("pagina en el servidor con el total real, no con la página de 50", async () => {
    renderWithProviders(<UsersPage />);
    await screen.findByText("Persona 1");
    expect(consultas.at(-1)).toMatchObject({ page: 1, limit: 25 });
    await userEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(await screen.findByText("Persona 2")).toBeInTheDocument();
    expect(consultas.at(-1)).toMatchObject({ page: 2 });
  });

  it("el buscador viaja como q y vuelve a la página 1; el texto dice por qué campos busca", async () => {
    renderWithProviders(<UsersPage />);
    await screen.findByText("Persona 1");
    await userEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    await screen.findByText("Persona 2");
    const buscador = screen.getByRole("textbox", {
      name: /correo, nombre, departamento, cargo o rol/i,
    });
    fireEvent.change(buscador, { target: { value: "quispe" } });
    await waitFor(() =>
      expect(consultas.at(-1)).toMatchObject({ q: "quispe", page: 1 }),
    );
  });

  it("el filtro de rol sale del catálogo completo (incluye un rol que no está en la página) y viaja como role", async () => {
    renderWithProviders(<UsersPage />);
    await screen.findByText("Persona 1");
    const rol = await screen.findByRole("combobox", { name: /^Rol/ });
    expect(await valoresDeOpciones(rol)).toEqual([
      "",
      "risk_analyst",
      "auditor_sin_usuarios",
    ]);
    await elegirOpcion(rol, "auditor_sin_usuarios");
    await waitFor(() =>
      expect(consultas.at(-1)).toMatchObject({
        role: "auditor_sin_usuarios",
        page: 1,
      }),
    );
  });

  it("el filtro de estado ofrece los cinco estados fijos y viaja como status", async () => {
    renderWithProviders(<UsersPage />);
    await screen.findByText("Persona 1");
    const estado = screen.getByRole("combobox", { name: /^Estado/ });
    expect(await valoresDeOpciones(estado)).toEqual([
      "",
      "active",
      "invited",
      "suspended",
      "locked",
      "disabled",
    ]);
    await elegirOpcion(estado, "suspended");
    await waitFor(() =>
      expect(consultas.at(-1)).toMatchObject({ status: "suspended" }),
    );
  });

  it("si la carga falla, dice el error y reintentar vuelve a pedir", async () => {
    falla = true;
    renderWithProviders(<UsersPage />);
    const reintentar = await screen.findByRole("button", {
      name: /reintentar/i,
    });
    falla = false;
    await userEvent.click(reintentar);
    expect(await screen.findByText("Persona 1")).toBeInTheDocument();
  });
});

describe("Roles y permisos: el catálogo completo se busca entero", () => {
  const permisos = [
    {
      key: "risk.cases.read",
      module: "risk",
      action: "read",
      description: null,
    },
    {
      key: "files.share",
      module: "files",
      action: "share",
      description: "Da acceso a un archivo",
    },
  ] as never;

  it("los permisos se filtran por texto (código, módulo, acción, descripción) y por módulo", () => {
    expect(filterPermissions(permisos, "archivo", "")).toHaveLength(1);
    expect(filterPermissions(permisos, "RISK", "")).toHaveLength(1);
    expect(filterPermissions(permisos, "", "files")).toHaveLength(1);
    expect(filterPermissions(permisos, "risk", "files")).toHaveLength(0);
    expect(filterPermissions(permisos, "", "")).toHaveLength(2);
  });

  it("los roles se buscan sin acentos ni mayúsculas", () => {
    const roles = [
      { id: "1", code: "auditor", name: "Auditoría", description: null },
      { id: "2", code: "ops", name: "Operaciones", description: null },
    ] as never;
    expect(filterRoles(roles, "AUDITORIA")).toHaveLength(1);
    expect(filterRoles(roles, "zzz")).toHaveLength(0);
  });
});
