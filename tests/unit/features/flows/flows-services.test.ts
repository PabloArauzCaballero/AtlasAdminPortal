import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
vi.mock("@/shared/api/client", () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args),
}));

import {
  compactQuery,
  groupCount,
  listFlows,
  getFlow,
} from "@/features/flows/services";

beforeEach(() => {
  apiRequest.mockReset();
});

describe("compactQuery", () => {
  it("no manda filtros vacíos: el backend los valida con Zod y un valor en blanco es 400, no «sin filtro»", () => {
    expect(
      compactQuery({ page: 1, q: "", risk: "", tested: "false", module: null }),
    ).toEqual({ page: 1, tested: "false" });
  });
});

describe("listFlows", () => {
  it("pide /systems/flows con la query compactada y normaliza items+meta", async () => {
    apiRequest.mockResolvedValueOnce({
      items: [{ id: "flow_abc123def456", path: "/auth/login" }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    const result = await listFlows({ page: 1, limit: 20, q: "", risk: "HIGH" });
    expect(apiRequest).toHaveBeenCalledWith("/systems/flows", {
      query: { page: 1, limit: 20, risk: "HIGH" },
    });
    expect(result.items).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});

describe("getFlow", () => {
  it("lee la ficha por su id estable, nunca ejecuta la ruta que describe", async () => {
    apiRequest.mockResolvedValueOnce({ id: "flow_abc123def456", findings: [] });
    await getFlow("flow_abc123def456");
    expect(apiRequest).toHaveBeenCalledWith("/systems/flows/flow_abc123def456");
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });
});

describe("groupCount", () => {
  it("lee un conteo agrupado de Sequelize por el valor de la columna y devuelve 0 si no está", () => {
    const rows = [
      { risk: "CRITICAL", count: 7 },
      { risk: "LOW", count: 120 },
    ];
    expect(groupCount(rows, "risk", "CRITICAL")).toBe(7);
    expect(groupCount(rows, "risk", "HIGH")).toBe(0);
    expect(groupCount(undefined, "risk", "HIGH")).toBe(0);
  });
});
