import { describe, expect, it } from "vitest";
import {
  toStepInput,
  toSuiteForm,
  toSuiteUpdateInput,
} from "@/features/qa-console/suite-adapters";
import {
  emptySuiteForm,
  emptyStepForm,
  stepSchema,
  suiteSchema,
  type StepForm,
  type SuiteForm,
} from "@/features/qa-console/suite-schema";
import { buildReorderPayload } from "@/features/qa-console/reorder-steps";
import type { TestStep, TestSuite } from "@/features/systems/types";

function suiteForm(overrides: Partial<SuiteForm> = {}): SuiteForm {
  return {
    ...emptySuiteForm,
    code: "SMOKE_LOGIN",
    name: "Smoke login",
    module: "internal-auth",
    ...overrides,
  };
}

function stepForm(overrides: Partial<StepForm> = {}): StepForm {
  return {
    ...emptyStepForm(1),
    name: "Login válido",
    pathTemplate: "/api/v1/internal/auth/login",
    ...overrides,
  };
}

function step(overrides: Partial<TestStep> = {}): TestStep {
  return {
    stepId: "1",
    suiteId: "10",
    endpointId: null,
    stepOrder: 1,
    name: "Paso",
    inputMode: "DEFAULT",
    method: "GET",
    pathTemplate: "/api/v1/ping",
    defaultHeaders: {},
    defaultPayload: {},
    configSchema: {},
    extractors: {},
    assertions: {},
    continueOnFailure: false,
    cleanupRequired: false,
    ...overrides,
  };
}

describe("suiteSchema", () => {
  it("acepta una suite válida", () => {
    expect(suiteSchema.safeParse(suiteForm()).success).toBe(true);
  });

  it("rechaza un código en minúsculas: el backend exige /^[A-Z0-9_]+$/", () => {
    expect(suiteSchema.safeParse(suiteForm({ code: "smoke" })).success).toBe(
      false,
    );
  });

  it("rechaza PRODUCTION_READONLY si la suite no está marcada como segura", () => {
    // Es la regla cruzada del backend (PRODUCTION_READONLY_REQUIRES_SAFE_SUITE).
    // Validarla acá es lo que la convierte en un error de campo y no en un 400.
    const result = suiteSchema.safeParse(
      suiteForm({
        environmentScope: ["LOCAL", "PRODUCTION_READONLY"],
        isSafeForProduction: false,
      }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["environmentScope"]);
    }
  });

  it("acepta PRODUCTION_READONLY cuando la suite sí es segura para producción", () => {
    expect(
      suiteSchema.safeParse(
        suiteForm({
          environmentScope: ["PRODUCTION_READONLY"],
          isSafeForProduction: true,
        }),
      ).success,
    ).toBe(true);
  });

  it("exige al menos un ambiente", () => {
    expect(
      suiteSchema.safeParse(suiteForm({ environmentScope: [] })).success,
    ).toBe(false);
  });
});

describe("stepSchema", () => {
  it("acepta un paso válido", () => {
    expect(stepSchema.safeParse(stepForm()).success).toBe(true);
  });

  it("rechaza una ruta que no empieza con barra", () => {
    expect(
      stepSchema.safeParse(stepForm({ pathTemplate: "api/v1/x" })).success,
    ).toBe(false);
  });

  it("rechaza una ruta protocol-relative (//host): el backend la rechaza también", () => {
    expect(
      stepSchema.safeParse(stepForm({ pathTemplate: "//evil.com" })).success,
    ).toBe(false);
  });

  it("rechaza stepOrder fuera del rango 1..500", () => {
    expect(stepSchema.safeParse(stepForm({ stepOrder: 0 })).success).toBe(
      false,
    );
    expect(stepSchema.safeParse(stepForm({ stepOrder: 501 })).success).toBe(
      false,
    );
  });

  it("acepta JSON vacío en los campos opcionales", () => {
    expect(
      stepSchema.safeParse(stepForm({ assertions: "", extractors: "" }))
        .success,
    ).toBe(true);
  });

  it("rechaza JSON mal formado antes de que el backend lo haga", () => {
    expect(
      stepSchema.safeParse(stepForm({ assertions: "{no es json}" })).success,
    ).toBe(false);
  });

  it("rechaza un JSON válido que no sea objeto (array o escalar)", () => {
    expect(
      stepSchema.safeParse(stepForm({ assertions: "[1,2]" })).success,
    ).toBe(false);
    expect(stepSchema.safeParse(stepForm({ assertions: '"x"' })).success).toBe(
      false,
    );
  });

  it("rechaza un endpointId con formato inválido", () => {
    expect(stepSchema.safeParse(stepForm({ endpointId: "abc" })).success).toBe(
      false,
    );
  });
});

describe("toStepInput", () => {
  it("parsea los campos JSON a objeto", () => {
    const input = toStepInput(
      stepForm({ assertions: '{"expectedStatusCodes":[200]}' }),
    );
    expect(input.assertions).toEqual({ expectedStatusCodes: [200] });
  });

  it("omite los campos JSON vacíos para que el backend aplique su default", () => {
    const input = toStepInput(stepForm({ extractors: "", configSchema: "" }));
    expect(input.extractors).toBeUndefined();
    expect(input.configSchema).toBeUndefined();
  });

  it("manda endpointId null cuando se vacía, para desasociar el paso del catálogo", () => {
    // `undefined` dejaría el campo intacto en el PATCH; `null` es lo que
    // realmente desasocia, que es lo que pide un campo vaciado a mano.
    expect(toStepInput(stepForm({ endpointId: "" })).endpointId).toBeNull();
  });

  it("conserva el endpointId elegido", () => {
    expect(toStepInput(stepForm({ endpointId: "42" })).endpointId).toBe("42");
  });
});

describe("toSuiteUpdateInput", () => {
  it("omite el código: el PATCH no debe intentar renombrar la suite", () => {
    const values = toSuiteForm({
      suiteId: "1",
      code: "SMOKE_LOGIN",
      name: "Smoke",
      description: null,
      module: "auth",
      suiteType: "SMOKE",
      executionMode: null,
      environmentScope: ["LOCAL"],
      isEnabled: true,
      requiresSeedData: false,
      isSafeForProduction: false,
      requiresDestructivePermission: false,
    } satisfies TestSuite);

    expect(toSuiteUpdateInput(values).code).toBeUndefined();
    expect(toSuiteUpdateInput(values).name).toBe("Smoke");
  });
});

describe("buildReorderPayload", () => {
  const steps = [
    step({ stepId: "a", stepOrder: 1 }),
    step({ stepId: "b", stepOrder: 2 }),
    step({ stepId: "c", stepOrder: 3 }),
  ];

  it("sube un paso intercambiándolo con el anterior", () => {
    expect(buildReorderPayload(steps, steps[1], -1)).toEqual([
      { stepId: "b", stepOrder: 1 },
      { stepId: "a", stepOrder: 2 },
      { stepId: "c", stepOrder: 3 },
    ]);
  });

  it("baja un paso intercambiándolo con el siguiente", () => {
    expect(buildReorderPayload(steps, steps[1], 1)).toEqual([
      { stepId: "a", stepOrder: 1 },
      { stepId: "c", stepOrder: 2 },
      { stepId: "b", stepOrder: 3 },
    ]);
  });

  it("manda siempre la lista completa: el backend rechaza órdenes duplicados", () => {
    expect(buildReorderPayload(steps, steps[0], 1)).toHaveLength(3);
  });

  it("no hace nada al subir el primero ni al bajar el último", () => {
    const unchanged = [
      { stepId: "a", stepOrder: 1 },
      { stepId: "b", stepOrder: 2 },
      { stepId: "c", stepOrder: 3 },
    ];
    expect(buildReorderPayload(steps, steps[0], -1)).toEqual(unchanged);
    expect(buildReorderPayload(steps, steps[2], 1)).toEqual(unchanged);
  });

  it("reindexa 1..n y cierra los huecos de orden preexistentes", () => {
    // Con órdenes 1, 5, 9, intercambiar los valores conservaría el hueco y el
    // siguiente movimiento se volvería impredecible. Se reindexa siempre.
    const sparse = [
      step({ stepId: "a", stepOrder: 1 }),
      step({ stepId: "b", stepOrder: 5 }),
      step({ stepId: "c", stepOrder: 9 }),
    ];

    expect(buildReorderPayload(sparse, sparse[2], -1)).toEqual([
      { stepId: "a", stepOrder: 1 },
      { stepId: "c", stepOrder: 2 },
      { stepId: "b", stepOrder: 3 },
    ]);
  });

  it("ordena por stepOrder aunque el backend devuelva los pasos desordenados", () => {
    const shuffled = [
      step({ stepId: "c", stepOrder: 3 }),
      step({ stepId: "a", stepOrder: 1 }),
      step({ stepId: "b", stepOrder: 2 }),
    ];

    expect(buildReorderPayload(shuffled, shuffled[0], -1)).toEqual([
      { stepId: "a", stepOrder: 1 },
      { stepId: "c", stepOrder: 2 },
      { stepId: "b", stepOrder: 3 },
    ]);
  });

  it("devuelve la lista intacta si el paso no pertenece a la suite", () => {
    const foreign = step({ stepId: "zzz", stepOrder: 99 });
    expect(buildReorderPayload(steps, foreign, -1)).toEqual([
      { stepId: "a", stepOrder: 1 },
      { stepId: "b", stepOrder: 2 },
      { stepId: "c", stepOrder: 3 },
    ]);
  });
});
