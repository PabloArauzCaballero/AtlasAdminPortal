import { describe, expect, it } from "vitest";
import {
  emptyStressProfileForm,
  stressProfileSchema,
  toStressProfileForm,
  toUpsertInput,
  type StressProfileForm,
} from "@/features/qa-stress/stress-profile-schema";
import type { StressProfile } from "@/features/systems/types";

function form(overrides: Partial<StressProfileForm> = {}): StressProfileForm {
  return {
    ...emptyStressProfileForm,
    endpointId: "12",
    name: "Login — pico de mañana",
    ...overrides,
  };
}

function profile(overrides: Partial<StressProfile> = {}): StressProfile {
  return {
    profileId: "5",
    endpointId: "12",
    code: "STRESS_LOGIN",
    name: "Login",
    targetRps: 25,
    durationSeconds: 120,
    concurrency: 8,
    environmentScope: ["LOCAL", "STAGING"],
    maxErrorRate: 0.02,
    maxP95Ms: 800,
    isEnabled: true,
    requiresApproval: true,
    status: "ACTIVE",
    notes: null,
    createdBy: null,
    updatedBy: null,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

describe("stressProfileSchema", () => {
  it("acepta un perfil válido", () => {
    expect(stressProfileSchema.safeParse(form()).success).toBe(true);
  });

  it("exige elegir endpoint: sin él el backend responde 404", () => {
    expect(
      stressProfileSchema.safeParse(form({ endpointId: "" })).success,
    ).toBe(false);
  });

  it("acepta código vacío (el backend deriva STRESS_<endpoint>)", () => {
    expect(stressProfileSchema.safeParse(form({ code: "" })).success).toBe(
      true,
    );
  });

  it("rechaza un código en minúsculas: el backend exige /^[A-Z0-9_]+$/", () => {
    expect(
      stressProfileSchema.safeParse(form({ code: "stress_login" })).success,
    ).toBe(false);
  });

  it("acepta un código válido en mayúsculas", () => {
    expect(
      stressProfileSchema.safeParse(form({ code: "STRESS_LOGIN_PEAK" }))
        .success,
    ).toBe(true);
  });

  it("respeta los topes de RPS del backend (1..10000)", () => {
    expect(
      stressProfileSchema.safeParse(form({ targetRps: 10000 })).success,
    ).toBe(true);
    expect(
      stressProfileSchema.safeParse(form({ targetRps: 10001 })).success,
    ).toBe(false);
    expect(stressProfileSchema.safeParse(form({ targetRps: 0 })).success).toBe(
      false,
    );
  });

  it("exige duración mínima de 5 segundos", () => {
    expect(
      stressProfileSchema.safeParse(form({ durationSeconds: 4 })).success,
    ).toBe(false);
    expect(
      stressProfileSchema.safeParse(form({ durationSeconds: 5 })).success,
    ).toBe(true);
  });

  it("rechaza concurrencia por encima de 5000", () => {
    expect(
      stressProfileSchema.safeParse(form({ concurrency: 5001 })).success,
    ).toBe(false);
  });

  it("exige al menos un ambiente", () => {
    expect(
      stressProfileSchema.safeParse(form({ environmentScope: [] })).success,
    ).toBe(false);
  });

  it("rechaza un porcentaje de error mayor a 100", () => {
    expect(
      stressProfileSchema.safeParse(form({ maxErrorRatePercent: 101 })).success,
    ).toBe(false);
  });
});

describe("toUpsertInput", () => {
  it("convierte el porcentaje a la fracción que espera el backend", () => {
    // El operador razona en "1% de error"; el backend valida maxErrorRate <= 1.
    // Mandar 1 en vez de 0.01 sería un 400 (o peor: un umbral 100x más laxo).
    expect(toUpsertInput(form({ maxErrorRatePercent: 1 })).maxErrorRate).toBe(
      0.01,
    );
    expect(toUpsertInput(form({ maxErrorRatePercent: 100 })).maxErrorRate).toBe(
      1,
    );
    expect(toUpsertInput(form({ maxErrorRatePercent: 0 })).maxErrorRate).toBe(
      0,
    );
  });

  it("manda `code: undefined` cuando queda vacío, para que el backend lo derive", () => {
    expect(toUpsertInput(form({ code: "" })).code).toBeUndefined();
  });

  it("conserva el código cuando el operador lo escribió", () => {
    expect(toUpsertInput(form({ code: "STRESS_X" })).code).toBe("STRESS_X");
  });

  it("omite las notas vacías en vez de mandar una cadena en blanco", () => {
    expect(toUpsertInput(form({ notes: "   " })).notes).toBeUndefined();
  });
});

describe("toStressProfileForm", () => {
  it("convierte la fracción del backend a porcentaje para el formulario", () => {
    expect(
      toStressProfileForm(profile({ maxErrorRate: 0.02 })).maxErrorRatePercent,
    ).toBe(2);
  });

  it("acepta maxErrorRate como string: el backend lo devuelve como decimal serializado", () => {
    expect(
      toStressProfileForm(profile({ maxErrorRate: "0.05" }))
        .maxErrorRatePercent,
    ).toBeCloseTo(5);
  });

  it("cae al 1% por defecto si el backend devuelve maxErrorRate nulo", () => {
    expect(
      toStressProfileForm(profile({ maxErrorRate: null })).maxErrorRatePercent,
    ).toBe(1);
  });

  it("descarta ambientes que no existen en el contrato en vez de romper el select", () => {
    const values = toStressProfileForm(
      profile({ environmentScope: ["LOCAL", "MARTE"] }),
    );
    expect(values.environmentScope).toEqual(["LOCAL"]);
  });

  it("degrada un status desconocido a NEEDS_REVIEW en vez de mostrarlo como válido", () => {
    expect(toStressProfileForm(profile({ status: "ZOMBIE" })).status).toBe(
      "NEEDS_REVIEW",
    );
  });

  it("preserva el código para que el upsert sobrescriba el perfil y no cree otro", () => {
    // El backend hace upsert sobre `code`: si el ida y vuelta lo perdiera,
    // "editar" crearía un perfil nuevo en vez de modificar el existente.
    const values = toStressProfileForm(profile({ code: "STRESS_LOGIN" }));
    expect(toUpsertInput(values).code).toBe("STRESS_LOGIN");
  });

  it("usa 1000 ms cuando el backend devuelve maxP95Ms nulo", () => {
    expect(toStressProfileForm(profile({ maxP95Ms: null })).maxP95Ms).toBe(
      1000,
    );
  });
});
