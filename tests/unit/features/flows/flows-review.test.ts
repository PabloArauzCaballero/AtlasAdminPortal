import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
vi.mock("@/shared/api/client", () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args),
}));

import { ESTADO, MOTIVO } from "@/features/flows/review/labels";
import {
  listFlowReviewQueue,
  reviewFlow,
} from "@/features/flows/review/services";

beforeEach(() => apiRequest.mockReset());

describe("revisión de flujos", () => {
  it("pide la cola con el estado elegido y sin filtros vacíos", async () => {
    apiRequest.mockResolvedValueOnce({
      items: [{ id: "flow_abc123def456" }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    const resultado = await listFlowReviewQueue({
      reviewStatus: "NEEDS_REVIEW",
      page: 1,
      limit: 20,
      systemCode: "",
    });
    expect(apiRequest).toHaveBeenCalledWith("/systems/flows/review-queue", {
      query: { reviewStatus: "NEEDS_REVIEW", page: 1, limit: 20 },
    });
    expect(resultado.items).toHaveLength(1);
  });

  it("decide con PATCH sobre el flujo, por su id estable", async () => {
    apiRequest.mockResolvedValueOnce({});
    await reviewFlow("flow_abc123def456", {
      reviewStatus: "APPROVED",
      depsHash: "abc",
    });
    expect(apiRequest).toHaveBeenCalledWith(
      "/systems/flows/flow_abc123def456/review",
      { method: "PATCH", body: { reviewStatus: "APPROVED", depsHash: "abc" } },
    );
  });

  it("cada motivo y estado que manda el backend tiene su texto", () => {
    expect(Object.keys(MOTIVO).sort()).toEqual([
      "ANALISIS_PARCIAL",
      "EVENTO_DINAMICO",
      "HUECOS_SIN_RESOLVER",
      "SIN_ANALISIS",
    ]);
    expect(ESTADO.REJECTED.tone).toBe("critical");
    expect(ESTADO.AUTO_DETECTED.tone).toBe("muted");
  });
});
