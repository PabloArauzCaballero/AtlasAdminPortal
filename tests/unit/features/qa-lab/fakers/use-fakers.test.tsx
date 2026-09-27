import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { fakeCases } from "../faker-fixtures";

vi.mock("@/features/qa-lab/fakers/faker-client", () => ({
  fetchFakerCatalog: vi.fn(async () => ({ types: [] })),
  fetchFakerCases: vi.fn(async ({ count }: { count: number }) =>
    fakeCases(count),
  ),
}));

import {
  fetchFakerCases,
  fetchFakerCatalog,
} from "@/features/qa-lab/fakers/faker-client";
import { useQaTestData } from "@/features/qa-lab/fakers/use-fakers";

let queryClient: QueryClient;

function wrapper({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function render() {
  return renderHook(() => useQaTestData(), { wrapper });
}

beforeEach(() => {
  vi.mocked(fetchFakerCases).mockClear();
  vi.mocked(fetchFakerCatalog).mockClear();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
});

describe("useQaTestData · qué datos de prueba se usan", () => {
  it("arranca con la semilla base, sin parámetros, y pide el caso base válido", async () => {
    const { result } = render();
    expect(result.current.seed).toBe("qa-base");
    expect(result.current.params).toEqual({});
    await waitFor(() => expect(result.current.baseCase.isSuccess).toBe(true));
    expect(result.current.baseCase.data).toHaveLength(1);
    expect(fetchFakerCases).toHaveBeenCalledWith({
      seed: "qa-base",
      count: 1,
      variant: "valido",
      params: {},
    });
    await waitFor(() => expect(result.current.catalog.isSuccess).toBe(true));
    expect(fetchFakerCatalog).toHaveBeenCalledTimes(1);
  });

  it("una semilla en blanco vuelve a la base, pero se conserva lo tecleado", async () => {
    const { result } = render();
    act(() => result.current.setSeed("   "));
    expect(result.current.rawSeed).toBe("   ");
    expect(result.current.seed).toBe("qa-base");
    act(() => result.current.setSeed("  qa-regresion "));
    expect(result.current.seed).toBe("qa-regresion");
  });

  it("setParam agrupa por tipo, y vaciar el último parámetro quita el tipo entero", () => {
    const { result } = render();
    act(() => result.current.setParam("caso", "edadMin", 30));
    act(() => result.current.setParam("caso", "departamento", "LP"));
    act(() => result.current.setParam("monto", "maximo", 500));
    expect(result.current.params).toEqual({
      caso: { edadMin: 30, departamento: "LP" },
      monto: { maximo: 500 },
    });

    act(() => result.current.setParam("caso", "edadMin", undefined));
    act(() => result.current.setParam("monto", "maximo", ""));
    expect(result.current.params).toEqual({ caso: { departamento: "LP" } });

    act(() => result.current.resetParams());
    expect(result.current.params).toEqual({});
  });

  it("fetchCases pide el lote con la semilla y los parámetros vigentes, y lo reusa", async () => {
    const { result } = render();
    act(() => result.current.setSeed("qa-frontera"));
    act(() => result.current.setParam("caso", "edadMin", 60));

    let cases: unknown[] = [];
    await act(async () => {
      cases = await result.current.fetchCases("frontera", 3);
    });
    expect(cases).toHaveLength(3);
    expect(fetchFakerCases).toHaveBeenCalledWith({
      seed: "qa-frontera",
      count: 3,
      variant: "frontera",
      params: { caso: { edadMin: 60 } },
    });

    const calls = vi.mocked(fetchFakerCases).mock.calls.length;
    await act(async () => {
      await result.current.fetchCases("frontera", 3);
    });
    expect(vi.mocked(fetchFakerCases).mock.calls.length).toBe(calls);
  });
});
