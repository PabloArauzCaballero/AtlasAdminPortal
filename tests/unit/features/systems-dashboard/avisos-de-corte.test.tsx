import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({
  useActiveDecisionArtifacts: vi.fn(),
}));
vi.mock("@/features/systems/hooks", () => hooks);
vi.mock("@/shared/auth/permission-gate", () => ({
  PermissionGate: ({ children }: { children: ReactNode }) => children,
}));
import { ActiveArtifactsPage } from "@/features/decision-engine/active-artifacts-page";

const informe = (over: Record<string, unknown>) => ({
  generatedAt: "2026-09-29T00:00:00.000Z",
  status: "OK",
  message: "",
  environmentFilter: null,
  items: [],
  ...over,
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
});
