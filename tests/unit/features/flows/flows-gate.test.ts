import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
vi.mock("@/shared/api/client", () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args),
}));

import { getDocumentationGate } from "@/features/flows/gate/services";

beforeEach(() => apiRequest.mockReset());

describe("compuerta de documentación", () => {
  it("la pide al backend, que es quien tiene el estado vivo del catálogo", async () => {
    apiRequest.mockResolvedValueOnce({
      passed: false,
      checks: [],
      evaluatedAt: "",
    });
    await getDocumentationGate();
    expect(apiRequest).toHaveBeenCalledWith(
      "/systems/flows/documentation-gate",
    );
  });
});
