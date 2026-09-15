import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

vi.mock("@/features/schema-management/services", () => ({
  approveSchemaChange: vi.fn(async () => ({ ok: true })),
  proposeSchemaTable: vi.fn(async () => ({ ok: true })),
  getSchemaTable: vi.fn(),
  getSchemaVersion: vi.fn(),
  listSchemaChangeLog: vi.fn(),
  listSchemaTables: vi.fn(),
  listSchemaVersions: vi.fn(),
}));

import { useApproveSchemaChangeMutation } from "@/features/schema-management/hooks";

let queryClient: QueryClient;

function wrapper({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

/** Siembra una query ya resuelta para poder observar si queda invalidada. */
function seed(queryKey: readonly unknown[]) {
  queryClient.setQueryData(queryKey, { seeded: true });
}

function isStale(queryKey: readonly unknown[]) {
  return queryClient.getQueryState(queryKey)?.isInvalidated === true;
}

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});

describe("R6 · aprobar cambio de schema invalida todo el dominio", () => {
  it("invalida versiones, tablas y change-log, no solo el log", async () => {
    const versions = ["schema", "versions", { page: 1 }] as const;
    const tables = ["schema", "tables", { versionId: "v1" }] as const;
    const table = ["schema", "table", "t1"] as const;
    const changeLog = ["schema", "change-log", { page: 1 }] as const;
    [versions, tables, table, changeLog].forEach(seed);

    const { result } = renderHook(() => useApproveSchemaChangeMutation(), {
      wrapper,
    });
    result.current.mutate({ changeId: "c1", body: { approval: "approve" } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(isStale(changeLog)).toBe(true);
    // Estas tres son las que el bug dejaba stale.
    expect(isStale(versions)).toBe(true);
    expect(isStale(tables)).toBe(true);
    expect(isStale(table)).toBe(true);
  });
});
