import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
vi.mock("@/shared/api/client", () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args),
}));

import {
  getInstanceProgress,
  getProcess,
  getProcessWiring,
  listProcessInstances,
  listProcesses,
  PROCESSES_PERMISSION,
} from "@/features/processes/services";

beforeEach(() => {
  apiRequest.mockReset();
  apiRequest.mockResolvedValue({});
});

describe("servicios de Procesos", () => {
  it("el permiso de la sección es el mismo que exige el backend", () => {
    expect(PROCESSES_PERMISSION).toBe("workflows.read");
  });

  it("lista, ficha y cableado leen de /internal/processes", async () => {
    await listProcesses();
    await getProcess("account_signup_to_login");
    await getProcessWiring("account_signup_to_login");
    expect(apiRequest.mock.calls.map((call) => call[0])).toEqual([
      "/internal/processes",
      "/internal/processes/account_signup_to_login",
      "/internal/processes/account_signup_to_login/wiring",
    ]);
  });

  it("las instancias no mandan filtros vacíos ni una búsqueda de sólo espacios (el backend respondería 400)", async () => {
    await listProcessInstances("p_uno", {
      status: "",
      search: "   ",
      page: 2,
      pageSize: 25,
    });
    expect(apiRequest).toHaveBeenCalledWith(
      "/internal/processes/p_uno/instances",
      {
        query: { page: 2, pageSize: 25 },
      },
    );
  });

  it("recorta la búsqueda y conserva el estado elegido", async () => {
    await listProcessInstances("p_uno", {
      status: "registered",
      search: " CUS-1 ",
      page: 1,
      pageSize: 25,
    });
    expect(apiRequest.mock.calls[0]?.[1]).toEqual({
      query: { status: "registered", search: "CUS-1", page: 1, pageSize: 25 },
    });
  });

  it("codifica el id del caso al pedir su avance", async () => {
    await getInstanceProgress("p_uno", "a/b");
    expect(apiRequest).toHaveBeenCalledWith(
      "/internal/processes/p_uno/instances/a%2Fb/progress",
    );
  });
});
