import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({
  useActiveDecisionArtifacts: vi.fn(),
  useTrafficLatencyReport: vi.fn(),
  useTrafficLatencyTimeseries: vi.fn(),
}));
vi.mock("@/features/systems/hooks", () => hooks);
vi.mock("@/shared/auth/permission-gate", () => ({
  PermissionGate: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/features/systems-dashboard/traffic-latency-charts", () => ({
  TrafficLatencyCharts: () => null,
}));
vi.mock(
  "@/features/systems-dashboard/traffic-latency-timeseries-chart",
  () => ({ TrafficLatencyTimeseriesChart: () => null }),
);

import { ActiveArtifactsPage } from "@/features/decision-engine/active-artifacts-page";
import { TrafficLatencySection } from "@/features/systems-dashboard/traffic-latency-section";

const informe = (over: Record<string, unknown>) => ({
  generatedAt: "2026-09-29T00:00:00.000Z",
  status: "OK",
  message: "",
  environmentFilter: null,
  items: [],
  ...over,
});

const trafico = (over: Record<string, unknown>) => ({
  isLoading: false,
  isFetching: false,
  error: null,
  refetch: vi.fn(),
  data: {
    windowHours: 24,
    summary: {
      totalRequests: 10,
      avgLatencyMs: 5,
      p95LatencyMs: 9,
      errorRate: 0,
    },
    routes: [],
    ...over,
  },
});

beforeEach(() => {
  hooks.useTrafficLatencyTimeseries.mockReturnValue({ data: undefined });
});

/** Cortes que antes eran silenciosos: la lista parecía el total. */
describe("avisos de corte", () => {
  it("Artefactos: si el motor tiene más despliegues que los 100 que se leen, se dice", () => {
    hooks.useActiveDecisionArtifacts.mockReturnValue({
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
      data: informe({ truncated: true, deploymentsTotal: 140 }),
    });
    render(<ActiveArtifactsPage />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "el motor tiene 140 despliegues activos",
    );
  });

  it("Artefactos: sin corte no hay aviso", () => {
    hooks.useActiveDecisionArtifacts.mockReturnValue({
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
      data: informe({ truncated: false }),
    });
    render(<ActiveArtifactsPage />);
    expect(screen.queryByText(/Lista incompleta/)).not.toBeInTheDocument();
  });

  it("Tráfico: con más rutas que las de la tabla, dice cuántas hubo", () => {
    hooks.useTrafficLatencyReport.mockReturnValue(
      trafico({ routesTotal: 73, routesTruncated: true }),
    );
    render(<TrafficLatencySection />);
    expect(screen.getByRole("status")).toHaveTextContent("de 73 que tuvieron");
  });

  it("Tráfico: sin corte no hay aviso", () => {
    hooks.useTrafficLatencyReport.mockReturnValue(trafico({}));
    render(<TrafficLatencySection />);
    expect(
      screen.queryByText(/rutas con más peticiones/),
    ).not.toBeInTheDocument();
  });
});
