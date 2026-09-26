import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient } from "../../../helpers/render-with-providers";
import { runFixture } from "./qa-runs-fixtures";
import {
  formatPassRate,
  isTerminalStatus,
  pollInterval,
  verdictView,
} from "@/features/qa-runs/run-status";

vi.setConfig({ testTimeout: 30000 });

const api = vi.hoisted(() => ({ getQaRun: vi.fn() }));
vi.mock("@/features/qa-runs/run-api", () => api);

const { useQaRun } = await import("@/features/qa-runs/run-hooks");

describe("sondeo de la corrida · UI/contrato con respuestas simuladas del contrato QA", () => {
  it("cada 2 s mientras responde; con errores seguidos 4, 8 y tope de 10 s", () => {
    expect(pollInterval("RUNNING", 0)).toBe(2_000);
    expect(pollInterval("RUNNING", 1)).toBe(4_000);
    expect(pollInterval("RUNNING", 2)).toBe(8_000);
    expect(pollInterval("RUNNING", 3)).toBe(10_000);
    expect(pollInterval("RUNNING", 9)).toBe(10_000);
  });

  it.each([
    "COMPLETED",
    "CANCELLED",
    "BLOCKED",
    "FAILED_INFRASTRUCTURE",
    "TIMED_OUT",
  ] as const)("deja de sondear en %s", (status) => {
    expect(isTerminalStatus(status)).toBe(true);
    expect(pollInterval(status, 0)).toBe(false);
    expect(pollInterval(status, 4)).toBe(false);
  });

  it("CANCELLING sigue sondeando: todavía no es terminal", () => {
    expect(pollInterval("CANCELLING", 0)).toBe(2_000);
  });

  it("veredicto y tasa no se confunden con el estado", () => {
    expect(verdictView(null, "COMPLETED").label).toBe("Sin veredicto");
    expect(verdictView("FAILED", "COMPLETED").label).toBe("Falló");
    expect(formatPassRate(null)).toBe("sin muestras");
    expect(formatPassRate(0.5)).toBe("50 %");
    expect(formatPassRate(1)).toBe("100 %");
  });

  describe("useQaRun", () => {
    beforeEach(() => api.getQaRun.mockReset());

    it("para de pedir la corrida cuando llega a un estado terminal", async () => {
      api.getQaRun
        .mockResolvedValueOnce(runFixture({ status: "RUNNING" }))
        .mockResolvedValue(
          runFixture({ status: "COMPLETED", verdict: "PASSED" }),
        );
      const client = createTestQueryClient();
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      );
      const { result } = renderHook(() => useQaRun("run-1"), { wrapper });

      await waitFor(() => expect(result.current.data?.status).toBe("RUNNING"));
      await waitFor(
        () => expect(result.current.data?.status).toBe("COMPLETED"),
        { timeout: 5_000 },
      );
      const calls = api.getQaRun.mock.calls.length;
      await new Promise((resolve) => setTimeout(resolve, 2_600));

      expect(api.getQaRun.mock.calls.length).toBe(calls);
      expect(calls).toBe(2);
    });
  });
});
