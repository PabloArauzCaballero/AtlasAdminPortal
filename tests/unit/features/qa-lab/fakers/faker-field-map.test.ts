import { describe, expect, it } from "vitest";
import { fakerPathForField } from "@/features/qa-lab/fakers/faker-field-map";
import { QA_PAYLOAD_PRESETS } from "@/features/qa-lab/payload-presets";
import { resolveFakerTemplate } from "@/features/qa-lab/fakers/faker-template";
import { fakeCase } from "../faker-fixtures";

describe("fakerPathForField · contrato → generador", () => {
  it.each([
    ["email", "caso.persona.email"],
    ["identifier", "caso.persona.email"],
    ["phone", "caso.persona.phone"],
    ["phoneNumber", "caso.persona.phone"],
    ["document_number", "caso.persona.documentNumber"],
    ["firstName", "caso.persona.firstName"],
    ["birthDate", "caso.persona.birthDate"],
    ["lat", "caso.direccion.latitude"],
    ["lng", "caso.direccion.longitude"],
    ["deviceFingerprintHash", "caso.dispositivo.deviceFingerprintHash"],
    ["monthlyIncome", "caso.perfilFinanciero.monthlyIncome"],
    ["amount", "monto.amount"],
  ])("%s → %s", (field, path) => {
    expect(fakerPathForField(field, "string")).toBe(path);
  });

  it("los objetos van al bloque entero", () => {
    expect(fakerPathForField("device", "object")).toBe("caso.dispositivo");
    expect(fakerPathForField("customer", "object")).toBe("caso.persona");
    expect(fakerPathForField("address", "object")).toBe("caso.direccion");
  });

  it("lo que no es de una persona no se mapea (lo pone el generador local)", () => {
    for (const name of [
      "active",
      "status",
      "customerId",
      "page",
      "createdAt",
    ]) {
      expect(fakerPathForField(name, "string")).toBeNull();
    }
  });
});

describe("payload-presets · plantillas sin datos de persona escritos a mano", () => {
  const serialized = JSON.stringify(QA_PAYLOAD_PRESETS);

  it("no hay correos, teléfonos ni contraseñas literales", () => {
    expect(serialized).not.toMatch(/@atlas\.test|\+591\d|Demo#|Atlas_/);
  });

  it("el alta de cliente pide PIN de 4 dígitos, no contraseña", () => {
    const start = QA_PAYLOAD_PRESETS.find((preset) =>
      preset.pathPattern.endsWith("/customer-onboarding/start"),
    );
    const { value, missing } = resolveFakerTemplate(
      start?.payload ?? {},
      fakeCase(0),
      {
        pin: "2749",
        now: "2026-09-26T00:00:00.000Z",
      },
    );
    expect(missing).toEqual([]);
    expect(value.password).toBe("2749");
    expect((value.device as { channel: string }).channel).toBe("mobile_app");
  });

  it("la decisión de revisión manual es POST y con un estado que el backend admite", () => {
    const decision = QA_PAYLOAD_PRESETS.find((preset) =>
      preset.pathPattern.endsWith("/decision"),
    );
    expect(decision?.method).toBe("POST");
    expect([
      "active",
      "observed",
      "under_review",
      "rejected",
      "blocked",
      "suspended",
    ]).toContain(decision?.payload?.nextCustomerStatus);
  });

  it("no queda el refresco con un token literal imposible de resolver", () => {
    expect(serialized).not.toContain("{{refreshToken}}");
  });

  it("los ids de ruta van vacíos: el Lab pide escribirlos en vez de inventar un «1»", () => {
    for (const preset of QA_PAYLOAD_PRESETS) {
      for (const value of Object.values(preset.pathParams ?? {}))
        expect(value).toBe("");
    }
  });
});
