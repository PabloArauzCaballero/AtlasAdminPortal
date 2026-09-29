import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AtlasApiError } from "@/shared/api/errors";
import { renderWithProviders } from "../../../helpers/render-with-providers";

vi.setConfig({ testTimeout: 30000 });

const services = vi.hoisted(() => ({
  getAuthBrokerAvailability: vi.fn(),
  getProviderAuthState: vi.fn(),
  getProviderAuthStates: vi.fn(),
}));
vi.mock("@/features/external-providers-admin/services", () => services);

const { ProviderAuthSection } =
  await import("@/features/external-providers-admin/provider-auth-section");

beforeEach(() => {
  Object.values(services).forEach((fn) => fn.mockReset());
  services.getAuthBrokerAvailability.mockResolvedValue({
    configured: true,
    reachable: true,
  });
});

describe("ProviderAuthSection · GET /admin/external-providers/:providerCode/auth-state", () => {
  it("pide el estado de ESE proveedor, no la lista entera", async () => {
    services.getProviderAuthState.mockResolvedValue({
      providerCode: "segip",
      authMethod: "OAUTH2_CLIENT_CREDENTIALS",
      credentialStatus: "ACTIVE",
      tokenStatus: "VALID",
      credentialFingerprint: "sha256:abcd",
      scopes: ["identity.read"],
      credentialAgeDays: 10,
      issuedAt: null,
      rotatedAt: null,
      rotationDueAt: null,
      tokenExpiresAt: null,
      lastRefreshAt: null,
      lastFailureCode: null,
      lastFailureAt: null,
    });
    renderWithProviders(<ProviderAuthSection providerCode="segip" />);

    expect(await screen.findByText("sha256:abcd")).toBeInTheDocument();
    expect(services.getProviderAuthState).toHaveBeenCalledWith("segip");
    expect(services.getProviderAuthStates).not.toHaveBeenCalled();
  });

  it("un 404 se lee como «sin credencial declarada», no como error", async () => {
    services.getProviderAuthState.mockRejectedValue(
      new AtlasApiError({
        status: 404,
        code: "PROVIDER_NOT_FOUND",
        message: "no existe",
      }),
    );
    renderWithProviders(<ProviderAuthSection providerCode="nuevo" />);

    expect(
      await screen.findByText(/no tiene ninguna credencial declarada/),
    ).toBeInTheDocument();
    expect(services.getProviderAuthState).toHaveBeenCalledTimes(1);
  });

  it("broker sin configurar: no pide el estado", async () => {
    services.getAuthBrokerAvailability.mockResolvedValue({
      configured: false,
      reachable: false,
    });
    renderWithProviders(<ProviderAuthSection providerCode="segip" />);

    expect(
      await screen.findByText(/todavía no usa el servicio de credenciales/),
    ).toBeInTheDocument();
    expect(services.getProviderAuthState).not.toHaveBeenCalled();
  });
});
