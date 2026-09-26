import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { GovernancePolicyConfigPage } from "@/features/governance-policies/governance-policy-config-page";

vi.mock("@/features/governance-policies/services", () => ({
  getGovernancePolicy: vi.fn(async () => ({
    policyId: "p1",
    name: "Retención de evidencias",
    status: "active",
    metadata: { retentionDays: 365, appendOnly: true },
  })),
}));

vi.mock("@/shared/auth/permission-gate", () => ({
  PermissionGate: ({ children }: Readonly<{ children: ReactNode }>) => (
    <>{children}</>
  ),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

/**
 * El formulario «Configurar política» guardaba con un PATCH que AtlasBackend retiró (devolvía 200
 * sin escribir nada) y redirigía como si hubiera persistido. La página es de sólo lectura y lo
 * dice; esta prueba fija que no vuelva a aparecer un «Guardar».
 */
describe("GovernancePolicyConfigPage", () => {
  it("muestra la configuración vigente sin formulario ni botón de guardar", async () => {
    const cliente = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={cliente}>
        <GovernancePolicyConfigPage policyId="p1" />
      </QueryClientProvider>,
    );
    expect(
      await screen.findByTestId("policy-config-readonly-note"),
    ).toHaveTextContent(/no se edita desde el portal/i);
    expect(
      screen.queryByRole("button", { name: /guardar/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
