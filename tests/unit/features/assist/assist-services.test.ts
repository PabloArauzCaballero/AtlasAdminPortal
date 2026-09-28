import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
vi.mock("@/shared/api/client", () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args),
}));

import {
  ASSIST_TIMEOUT_MS,
  askAssist,
  getAssistConversation,
} from "@/features/assist/services";
import { toAtlasApiError } from "@/shared/api/response";
import { assistScreenFor } from "@/features/assist/screen-label";
import {
  describeAssistFailure,
  isAssistDisabled,
  isAssistInFlight,
} from "@/features/assist/assist-errors";
import { AtlasApiError } from "@/shared/api/errors";

beforeEach(() => {
  apiRequest.mockReset();
  apiRequest.mockResolvedValue({});
});

/**
 * El contrato con Core: la ruta, la superficie, la llave del mensaje y el plazo propio. Sin
 * `x-idempotency-key`: la deduplicación de esta ruta es `clientMessageId`.
 */
describe("servicios del asistente · contrato con internal/assist", () => {
  it("pregunta con POST /internal/assist/chat, la superficie del portal y un plazo largo", async () => {
    await askAssist({
      prompt: "¿Cómo resuelvo un caso?",
      clientMessageId: "3f1c2a4e-9b7d-4c1e-8a2b-1234567890ab",
      screen: "Operaciones › Soporte",
    });
    expect(apiRequest).toHaveBeenCalledWith("/internal/assist/chat", {
      method: "POST",
      body: {
        surface: "admin-portal",
        prompt: "¿Cómo resuelvo un caso?",
        clientMessageId: "3f1c2a4e-9b7d-4c1e-8a2b-1234567890ab",
        screen: "Operaciones › Soporte",
      },
      timeoutMs: ASSIST_TIMEOUT_MS,
    });
    expect(ASSIST_TIMEOUT_MS).toBeGreaterThan(28_000);
  });

  it("lee el hilo con GET /internal/assist/conversation?surface=admin-portal", async () => {
    await getAssistConversation();
    expect(apiRequest).toHaveBeenCalledWith("/internal/assist/conversation", {
      query: { surface: "admin-portal" },
    });
  });
});

describe("assistScreenFor · la sección con su nombre del menú", () => {
  it.each([
    ["/internal", "Inicio"],
    ["/internal/operations/work-queue", "Operaciones › Cola de trabajo"],
    ["/internal/support", "Operaciones › Soporte"],
    ["/internal/support/cases/5001", "Operaciones › Soporte › Casos"],
    ["/internal/support/knowledge", "Operaciones › Base de conocimiento"],
    [
      "/internal/operations/manual-review-cases",
      "Operaciones › Revisión manual",
    ],
    [
      "/internal/operations/credit/applications/from-case",
      "Crédito › Solicitudes › Desde la cola",
    ],
    [
      "/internal/operations/customers/9001/investigation-summary",
      "Operaciones › Clientes › Investigación",
    ],
    ["/internal/qa/lab", "QA › Laboratorio QA"],
    [
      "/internal/procesos/P-06/instancias",
      "Procesos › Catálogo de procesos › Casos en curso",
    ],
    ["/internal/settings/profile", "Administración › Perfil"],
  ])("%s → %s", (ruta, esperado) => {
    expect(assistScreenFor(ruta)).toBe(esperado);
  });

  it("nunca manda ids ni caracteres que el servidor rechaza, y cabe en 80", () => {
    const etiqueta = assistScreenFor("/internal/loquesea/<script>/123");
    expect(etiqueta).toMatch(/^[\p{L}\p{N} ›/·_\-().,]{1,80}$/u);
    expect(etiqueta).not.toContain("123");
    expect(assistScreenFor(null)).toBe("Inicio");
  });
});

describe("errores del asistente", () => {
  const error = (status: number, code: string, message = "x") =>
    new AtlasApiError({ status, code, message });

  it("404 es «apagado» y 409 es «sigue en curso»", () => {
    expect(isAssistDisabled(error(404, "ASSIST_DISABLED"))).toBe(true);
    expect(isAssistInFlight(error(409, "ASSIST_IN_FLIGHT"))).toBe(true);
    expect(isAssistDisabled(error(503, "ASSIST_UNAVAILABLE"))).toBe(false);
  });

  it("el 400 ASSIST_REJECTED enseña el texto del servidor y no ofrece reintento", () => {
    expect(
      describeAssistFailure(
        error(400, "ASSIST_REJECTED", "No compartas datos personales."),
      ),
    ).toEqual({
      mensaje: "No compartas datos personales.",
      reintentable: false,
    });
  });

  it("429, 503 y la red caída se pueden reintentar con textos propios", () => {
    expect(describeAssistFailure(error(429, "ASSIST_BUSY")).reintentable).toBe(
      true,
    );
    expect(
      describeAssistFailure(error(503, "ASSIST_UNAVAILABLE")).mensaje,
    ).toMatch(/no está disponible/);
    expect(describeAssistFailure(error(0, "NETWORK_ERROR")).mensaje).toMatch(
      /no se duplica/,
    );
  });

  it("toAtlasApiError conserva el Retry-After en milisegundos", () => {
    const response = new Response("{}", {
      status: 409,
      headers: { "retry-after": "2" },
    });
    const conCabecera = toAtlasApiError(response, {
      error: { code: "ASSIST_IN_FLIGHT", message: "sigue" },
    });
    expect(conCabecera.retryAfterMs).toBe(2000);
    const sinCabecera = toAtlasApiError(new Response("{}", { status: 409 }), {
      error: { code: "ASSIST_IN_FLIGHT", message: "sigue" },
    });
    expect(sinCabecera.retryAfterMs).toBeUndefined();
  });
});
