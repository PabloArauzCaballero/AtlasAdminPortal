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

vi.mock("@/features/data-quality-rules/services", () => ({
  runDataQualityRule: vi.fn(async () => ({ ok: true })),
  getDataQualityRule: vi.fn(),
  listDataQualityRules: vi.fn(),
}));

import { useApproveSchemaChangeMutation } from "@/features/schema-management/hooks";
import { useRunDataQualityRuleMutation } from "@/features/data-quality-rules/hooks";

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

describe("R6 · ejecutar regla de calidad invalida los issues", () => {
  it("invalida reglas e issues, que cuelgan de raíces distintas", async () => {
    const rules = ["internal", "data-quality", "rules", { page: 1 }] as const;
    const rule = ["internal", "data-quality", "rule", "r1"] as const;
    const issues = [
      "operations",
      "data-quality",
      "issues",
      { page: 1 },
    ] as const;
    [rules, rule, issues].forEach(seed);

    const { result } = renderHook(() => useRunDataQualityRuleMutation("r1"), {
      wrapper,
    });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(isStale(rules)).toBe(true);
    expect(isStale(rule)).toBe(true);
    // La raíz `operations` es la que el bug no tocaba.
    expect(isStale(issues)).toBe(true);
  });

  it("no invalida dominios ajenos", async () => {
    const unrelated = ["systems", "endpoints", { page: 1 }] as const;
    seed(unrelated);

    const { result } = renderHook(() => useRunDataQualityRuleMutation("r1"), {
      wrapper,
    });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(isStale(unrelated)).toBe(false);
  });
});
