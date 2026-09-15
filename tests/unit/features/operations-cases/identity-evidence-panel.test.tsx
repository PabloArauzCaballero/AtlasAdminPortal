import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IdentityEvidencePanel } from "@/features/operations-cases/identity-evidence-panel";
import { AtlasApiError } from "@/shared/api/errors";

/**
 * El portal decide la identidad VIENDO el carnet, y no pisa al Motor.
 *
 * Hasta el 2026-09-14 el endpoint de decisión de identidad no tenía ninguna pantalla que lo llamara y
 * las imágenes sólo se veían en el portal del Motor. Lo que fijan estas pruebas: (1) las imágenes se
 * cargan por descarga autenticada (nunca `<img src>` a la API); (2) la decisión llega al endpoint
 * correcto; (3) si el Motor tiene el intento en su cola, el 409 se explica y se enlaza en vez de
 * enseñarse como un error genérico.
 */
vi.mock("@/features/operations-cases/services", () => ({
  listEvidenceDocuments: vi.fn(),
  downloadEvidenceDocument: vi.fn(),
  decideIdentityVerification: vi.fn(),
}));

const services = await import("@/features/operations-cases/services");

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("IdentityEvidencePanel", () => {
  beforeEach(() => {
    vi.mocked(services.listEvidenceDocuments).mockResolvedValue({
      customerId: "900",
      documents: [
        {
          documentId: "1",
          documentType: "identity_front",
          mimeType: "image/jpeg",
          sizeBytes: 100,
          sha256: "abcdef1234567890",
          uploadedAt: "2026-09-01T10:00:00.000Z",
        },
        {
          documentId: "2",
          documentType: "selfie",
          mimeType: "image/jpeg",
          sizeBytes: 100,
          sha256: null,
          uploadedAt: null,
        },
      ],
    });
    vi.mocked(services.downloadEvidenceDocument).mockResolvedValue({
      blob: new Blob(["x"], { type: "image/jpeg" }),
      nombre: "a.jpg",
      contentType: "image/jpeg",
    });
    vi.mocked(services.decideIdentityVerification).mockReset();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:local"),
      revokeObjectURL: vi.fn(),
    });
  });

  it("pinta cada documento desde un blob autenticado, nunca apuntando el src a la API", async () => {
    render(<IdentityEvidencePanel customerId="900" />, { wrapper });
    await waitFor(() =>
      expect(screen.getByText("Carnet · frente")).toBeInTheDocument(),
    );
    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(2));
    expect(services.downloadEvidenceDocument).toHaveBeenCalledWith("900", "1");
    for (const img of screen.getAllByRole("img")) {
      expect(img).toHaveAttribute("src", "blob:local");
    }
  });

  it("registra la decisión en el endpoint de identidad del cliente", async () => {
    vi.mocked(services.decideIdentityVerification).mockResolvedValue({
      customerId: "900",
      decision: "approve",
      identityVerificationResult: "verified",
      resolvedEvidenceReviews: 2,
      lifecycleStatus: "active",
      eligible: true,
    });
    render(<IdentityEvidencePanel customerId="900" />, { wrapper });
    await waitFor(() =>
      expect(screen.getByText("Carnet · frente")).toBeInTheDocument(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /registrar decisión de identidad/i }),
    );
    await waitFor(() =>
      expect(services.decideIdentityVerification).toHaveBeenCalledWith("900", {
        decision: "approve",
        reasonCode: "identity_verified",
      }),
    );
    await waitFor(() =>
      expect(screen.getByText(/Identidad aprobada/)).toBeInTheDocument(),
    );
  });

  it("rechazar exige notas: el botón no se ofrece sin ellas", async () => {
    render(<IdentityEvidencePanel customerId="900" />, { wrapper });
    fireEvent.change(screen.getByTestId("identity-decision"), {
      target: { value: "reject" },
    });
    expect(
      screen.getByRole("button", { name: /registrar decisión de identidad/i }),
    ).toBeDisabled();
  });

  it("un 409 IDENTITY_DECISION_DELEGADA_AL_MOTOR se explica y NO se enseña como error genérico", async () => {
    vi.mocked(services.decideIdentityVerification).mockRejectedValue(
      new AtlasApiError({
        status: 409,
        code: "CONFLICT",
        message:
          "IDENTITY_DECISION_DELEGADA_AL_MOTOR: la ejecución 4242 del Motor abrió el caso; se resuelve allí.",
      }),
    );
    render(<IdentityEvidencePanel customerId="900" />, { wrapper });
    fireEvent.click(
      screen.getByRole("button", { name: /registrar decisión de identidad/i }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("identity-delegada")).toBeInTheDocument(),
    );
    expect(
      screen.queryByText("No se pudo registrar la decisión"),
    ).not.toBeInTheDocument();
  });
});
