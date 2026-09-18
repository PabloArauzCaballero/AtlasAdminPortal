import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CredencialEntregadaDialog } from "@/features/merchant-identity/provisioning-decision-dialog";
import type { MerchantProvisioningResult } from "@/features/merchant-identity/types";

const PASSWORD = "Xk9#pQ2vLm7!wR4tZs";

const resultado: MerchantProvisioningResult = {
  request: {
    id: "req-1",
    externalReference: "ERP-1",
    accountName: "Comercio Uno",
    branchName: null,
    fullName: "Ana Comercio",
    email: "ana@comercio.test",
    roleCode: "OWNER",
    requestedBy: "ejecutivo@atlas.test",
    requestedAt: "2026-09-17T10:00:00Z",
    status: "provisioned",
    merchantUserId: "mu-1",
    decidedAt: "2026-09-17T10:05:00Z",
    rejectionReason: null,
  } as MerchantProvisioningResult["request"],
  merchantUser: {
    id: "mu-1",
    email: "ana@comercio.test",
    fullName: "Ana Comercio",
    status: "invited",
  },
  temporaryPassword: PASSWORD,
};

/**
 * El diálogo recibe la contraseña porque el contrato la trae, pero NO la puede pintar: la
 * persona del comercio la recibe por correo.
 */
describe("CredencialEntregadaDialog", () => {
  it("no muestra la contraseña provisional aunque venga en el resultado", () => {
    render(
      <CredencialEntregadaDialog resultado={resultado} onClose={vi.fn()} />,
    );

    expect(screen.queryByText(PASSWORD)).toBeNull();
    expect(document.body.textContent).not.toContain(PASSWORD);
    expect(screen.queryByRole("button", { name: /copi/i })).toBeNull();
  });

  it("dice a qué correo se envió y anuncia el código de un solo uso", () => {
    render(
      <CredencialEntregadaDialog resultado={resultado} onClose={vi.fn()} />,
    );

    expect(
      screen.getByRole("heading", { name: /acceso concedido/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/ana@comercio\.test/)).toBeInTheDocument();
    expect(screen.getByText(/código de un solo uso/i)).toBeInTheDocument();
  });
});
