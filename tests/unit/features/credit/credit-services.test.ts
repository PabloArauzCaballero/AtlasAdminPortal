import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
vi.mock("@/shared/api/client", () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args),
}));

import {
  changeCreditProductStatus,
  createCreditProduct,
  decideBusinessAcceptance,
  decideCreditApplication,
  getCreditApplication,
  getCustomerCreditLine,
  listCreditProducts,
  listCustomerCreditApplications,
  recalculateCreditLine,
} from "@/features/credit/services";

beforeEach(() => {
  apiRequest.mockReset();
  apiRequest.mockResolvedValue({});
});

/**
 * Cada pantalla de crédito llama a una ruta que ya existía en AtlasBackend y nadie usaba. Lo que se
 * fija aquí es el contrato exacto (método, ruta, cuerpo) y que NO se manda llave de idempotencia:
 * estas rutas no la leen, y mandarla haría creer que repetir la petición es seguro.
 */
describe("servicios de crédito · contrato con operations/credit", () => {
  it("lista el catálogo con GET /operations/credit/products", async () => {
    await listCreditProducts();
    expect(apiRequest).toHaveBeenCalledWith("/operations/credit/products");
  });

  it("crea un producto con POST y el cuerpo tal cual", async () => {
    const body = {
      productCode: "consumo_12m",
      productName: "Consumo 12 meses",
      currencyCode: "BOB",
      minAmount: 500,
      maxAmount: 5000,
      minTermMonths: 3,
      maxTermMonths: 12,
      requiresManualReview: false,
    };
    await createCreditProduct(body);
    expect(apiRequest).toHaveBeenCalledWith("/operations/credit/products", {
      method: "POST",
      body,
    });
  });

  it("cambia el estado con PATCH …/products/:id/status y su motivo", async () => {
    await changeCreditProductStatus("21", {
      status: "active",
      reasonCode: "commercial_launch",
    });
    expect(apiRequest).toHaveBeenCalledWith(
      "/operations/credit/products/21/status",
      {
        method: "PATCH",
        body: { status: "active", reasonCode: "commercial_launch" },
      },
    );
  });

  it("lee el detalle de la solicitud por su identificador", async () => {
    await getCreditApplication("77");
    expect(apiRequest).toHaveBeenCalledWith(
      "/operations/credit/applications/77",
    );
  });

  it("decide con POST …/decision, sin cabecera de idempotencia", async () => {
    await decideCreditApplication("77", {
      decision: "reject",
      reasonCode: "insufficient_payment_capacity",
      notes: "Cuota > 40 % del ingreso.",
    });
    const [path, options] = apiRequest.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(path).toBe("/operations/credit/applications/77/decision");
    expect(options).toEqual({
      method: "POST",
      body: {
        decision: "reject",
        reasonCode: "insufficient_payment_capacity",
        notes: "Cuota > 40 % del ingreso.",
      },
    });
    expect(options).not.toHaveProperty("headers");
  });

  it("registra la aceptación del negocio con POST …/business-acceptance", async () => {
    await decideBusinessAcceptance("77", { accepted: true });
    expect(apiRequest).toHaveBeenCalledWith(
      "/operations/credit/applications/77/business-acceptance",
      { method: "POST", body: { accepted: true } },
    );
  });

  it("recalcula la línea con POST …/customers/:id/credit-line/recalculate", async () => {
    await recalculateCreditLine("900");
    expect(apiRequest).toHaveBeenCalledWith(
      "/operations/credit/customers/900/credit-line/recalculate",
      { method: "POST" },
    );
  });

  it("lee la línea y las solicitudes del cliente por las rutas del cliente", async () => {
    await getCustomerCreditLine("900");
    await listCustomerCreditApplications("900");
    expect(apiRequest).toHaveBeenNthCalledWith(1, "/customers/900/credit-line");
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      "/customers/900/credit-applications",
    );
  });

  it("escapa el identificador: una ruta no se construye con texto crudo", async () => {
    await getCreditApplication("7/../9");
    expect(apiRequest).toHaveBeenCalledWith(
      "/operations/credit/applications/7%2F..%2F9",
    );
  });
});
