import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/qa-lab/direct-runner", () => ({
  executeEndpointDirectly: vi.fn(),
}));
vi.mock("@/features/qa-lab/stress-runner", () => ({
  runStressBurst: vi.fn(),
}));
vi.mock("@/features/qa-lab/services", () => ({
  listLabEndpoints: vi.fn(),
}));

import { executeEndpointDirectly } from "@/features/qa-lab/direct-runner";
import {
  useEndpointRunMutation,
  useEndpointStressMutation,
  useLabEndpoints,
} from "@/features/qa-lab/hooks";
import { listLabEndpoints } from "@/features/qa-lab/services";
import { runStressBurst } from "@/features/qa-lab/stress-runner";
import {
  endpointFixture,
  runInputFixture,
  stressInputFixture,
} from "./qa-fixtures";

const mockedRun = vi.mocked(executeEndpointDirectly);
const mockedStress = vi.mocked(runStressBurst);
const mockedList = vi.mocked(listLabEndpoints);

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, children);
}

beforeEach(() => {
  mockedRun.mockResolvedValue({ url: "u", method: "GET", dryRun: false });
  mockedStress.mockResolvedValue({
    url: "u",
    method: "GET",
  } as unknown as Awaited<ReturnType<typeof runStressBurst>>);
  mockedList.mockResolvedValue({ items: [], total: 0 } as unknown as Awaited<
    ReturnType<typeof listLabEndpoints>
  >);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useEndpointRunMutation", () => {
  it("falla sin ejecutar nada si no hay endpoint seleccionado", async () => {
    const { result } = renderHook(() => useEndpointRunMutation(undefined), {
      wrapper,
    });

    result.current.mutate(runInputFixture());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain("Selecciona un endpoint");
    expect(mockedRun).not.toHaveBeenCalled();
  });

  it("delega en el direct-runner con el endpoint seleccionado", async () => {
    const endpoint = endpointFixture();
    const input = runInputFixture();
    const { result } = renderHook(() => useEndpointRunMutation(endpoint), {
      wrapper,
    });

    result.current.mutate(input);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedRun).toHaveBeenCalledWith(endpoint, input);
  });
});

describe("useEndpointStressMutation", () => {
  it("falla sin lanzar un burst si no hay endpoint seleccionado", async () => {
    const { result } = renderHook(() => useEndpointStressMutation(undefined), {
      wrapper,
    });

    result.current.mutate(stressInputFixture());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockedStress).not.toHaveBeenCalled();
  });

  it("delega en el stress-runner con el endpoint seleccionado", async () => {
    const endpoint = endpointFixture();
    const input = stressInputFixture();
    const { result } = renderHook(() => useEndpointStressMutation(endpoint), {
      wrapper,
    });

    result.current.mutate(input);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedStress).toHaveBeenCalledWith(endpoint, input);
  });
});

describe("useLabEndpoints", () => {
  it("consulta el catálogo con la query recibida", async () => {
    const { result } = renderHook(() => useLabEndpoints({ page: 2 }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedList).toHaveBeenCalledWith({ page: 2 });
  });
});
