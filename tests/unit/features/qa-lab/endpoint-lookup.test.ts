import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const realEndpoint = { id: "ep-real", name: "Real" };

vi.mock("@/features/systems/hooks", () => ({
  useEndpoint: vi.fn((endpointId: string) => ({
    data: endpointId ? { endpoint: realEndpoint } : undefined,
    isLoading: Boolean(endpointId),
    isPending: Boolean(endpointId),
    error: null,
    refetch: vi.fn(),
  })),
  useEndpointsByIds: vi.fn((ids: string[]) => ({
    byId: new Map(ids.map((id) => [id, { id, name: `Real ${id}` }])),
    isLoading: false,
  })),
}));

import { useEndpoint, useEndpointsByIds } from "@/features/systems/hooks";
import {
  useLabEndpoint,
  useLabEndpointsByIds,
} from "@/features/qa-lab/endpoint-lookup";
import { MOCK_PROVIDER_ENDPOINTS } from "@/features/qa-lab/mock-provider-endpoints";

const mockId = MOCK_PROVIDER_ENDPOINTS[0].endpointId;

beforeEach(() => {
  vi.mocked(useEndpoint).mockClear();
  vi.mocked(useEndpointsByIds).mockClear();
});

describe("useLabEndpoint · el mock se resuelve en local", () => {
  it("un endpoint real va a AtlasBackend tal cual", () => {
    const { result } = renderHook(() => useLabEndpoint("ep-real"));
    expect(useEndpoint).toHaveBeenCalledWith("ep-real");
    expect(result.current.data).toEqual({ endpoint: realEndpoint });
  });

  it("un endpoint del mock no pide nada al backend y sale del catálogo local", async () => {
    const { result } = renderHook(() => useLabEndpoint(mockId));
    expect(useEndpoint).toHaveBeenCalledWith("");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual({
      endpoint: MOCK_PROVIDER_ENDPOINTS[0],
      toolRequirements: [],
      dataEntityImpacts: [],
      fieldImpacts: [],
    });
    await expect(result.current.refetch()).resolves.toBeDefined();
  });

  it("un id del mock que no existe no inventa un endpoint", () => {
    const { result } = renderHook(() => useLabEndpoint("mock:no-existe"));
    expect(result.current.data).toBeUndefined();
  });
});

describe("useLabEndpointsByIds · lote mixto del Journey Runner", () => {
  it("sin ids del mock devuelve lo del backend", () => {
    const { result } = renderHook(() => useLabEndpointsByIds(["a", "b"]));
    expect(useEndpointsByIds).toHaveBeenCalledWith(["a", "b"]);
    expect([...result.current.byId.keys()]).toEqual(["a", "b"]);
  });

  it("mezcla los reales del backend con los del mock, y omite los que no existen", () => {
    const { result } = renderHook(() =>
      useLabEndpointsByIds(["a", mockId, "mock:no-existe"]),
    );
    expect(useEndpointsByIds).toHaveBeenCalledWith(["a"]);
    expect(result.current.byId.get("a")).toEqual({ id: "a", name: "Real a" });
    expect(result.current.byId.get(mockId)).toBe(MOCK_PROVIDER_ENDPOINTS[0]);
    expect(result.current.byId.has("mock:no-existe")).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });
});
