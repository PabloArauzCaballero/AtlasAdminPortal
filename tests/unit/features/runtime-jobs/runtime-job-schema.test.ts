import { describe, expect, it } from "vitest";
import { findRuntimeJob } from "@/features/runtime-jobs/runtime-job-catalog";
import {
  buildRuntimeJobBody,
  emptyRuntimeJobForm,
  runtimeJobFormSchema,
  type RuntimeJobForm,
} from "@/features/runtime-jobs/runtime-job-schema";
import type { RuntimeJobDefinition } from "@/features/runtime-jobs/types";

function form(overrides: Partial<RuntimeJobForm> = {}): RuntimeJobForm {
  return { ...emptyRuntimeJobForm, ...overrides };
}

/** El esquema se construye por job: cada uno impone sus propios rangos. */
function schemaFor(code: string) {
  return runtimeJobFormSchema(jobOrThrow(code));
}

function jobOrThrow(code: string): RuntimeJobDefinition {
  const definition = findRuntimeJob(code);
  if (!definition) throw new Error(`Job inexistente en el catálogo: ${code}`);
  return definition;
}

describe("runtimeJobFormSchema", () => {
  it("acepta el formulario vacío: todos los campos son opcionales y el backend aplica sus defaults", () => {
    expect(schemaFor("process-outbox").safeParse(form()).success).toBe(true);
  });

  it("acepta `limit` dentro del rango del backend (1..500)", () => {
    for (const limit of ["1", "50", "500"]) {
      expect(
        schemaFor("process-outbox").safeParse(form({ limit })).success,
      ).toBe(true);
    }
  });

  it("rechaza `limit` por encima del tope del backend", () => {
    expect(
      schemaFor("process-outbox").safeParse(form({ limit: "501" })).success,
    ).toBe(false);
  });

  it("rechaza `limit` en cero: el backend exige positivo", () => {
    expect(
      schemaFor("process-outbox").safeParse(form({ limit: "0" })).success,
    ).toBe(false);
  });

  it("rechaza `limit` no numérico en vez de mandar NaN al backend", () => {
    expect(
      schemaFor("process-outbox").safeParse(form({ limit: "diez" })).success,
    ).toBe(false);
  });

  it("acepta `maxIdleMinutes` hasta 43200 (30 días) y rechaza más", () => {
    expect(
      schemaFor("expire-stale-sessions").safeParse(
        form({ maxIdleMinutes: "43200" }),
      ).success,
    ).toBe(true);
    expect(
      schemaFor("expire-stale-sessions").safeParse(
        form({ maxIdleMinutes: "43201" }),
      ).success,
    ).toBe(false);
  });

  it("rechaza un customerId con ceros a la izquierda (el backend exige /^[1-9][0-9]*$/)", () => {
    expect(
      schemaFor("recalculate-data-quality").safeParse(
        form({ customerId: "0123" }),
      ).success,
    ).toBe(false);
  });

  it("acepta un customerId válido", () => {
    expect(
      schemaFor("recalculate-data-quality").safeParse(
        form({ customerId: "1234" }),
      ).success,
    ).toBe(true);
  });

  it("rechaza un policyCode de más de 120 caracteres", () => {
    expect(
      schemaFor("apply-retention-policies").safeParse(
        form({ policyCode: "x".repeat(121) }),
      ).success,
    ).toBe(false);
  });
});

describe("buildRuntimeJobBody", () => {
  it("manda solo los campos que el job declara: un campo ajeno sería un 400", () => {
    const body = buildRuntimeJobBody(
      jobOrThrow("expire-stale-sessions"),
      // `limit` no pertenece a este job aunque el formulario lo tenga cargado.
      form({ maxIdleMinutes: "240", limit: "50", customerId: "9" }),
    );

    expect(body).toEqual({ dryRun: true, maxIdleMinutes: 240 });
  });

  it("descarta los campos vacíos para que el backend aplique su default", () => {
    const body = buildRuntimeJobBody(jobOrThrow("process-outbox"), form());

    expect(body).toEqual({ dryRun: true });
    expect(Object.hasOwn(body, "limit")).toBe(false);
  });

  it("convierte los campos numéricos a number y deja los de texto como string", () => {
    expect(
      buildRuntimeJobBody(jobOrThrow("process-events"), form({ limit: "25" })),
    ).toEqual({ dryRun: true, limit: 25 });

    expect(
      buildRuntimeJobBody(
        jobOrThrow("apply-retention-policies"),
        form({ policyCode: "gps_observations_90d" }),
      ),
    ).toEqual({ dryRun: true, policyCode: "gps_observations_90d" });
  });

  it("propaga dryRun=false cuando el operador pide ejecución real", () => {
    const body = buildRuntimeJobBody(
      jobOrThrow("recalculate-data-quality"),
      form({ dryRun: false, customerId: "77" }),
    );

    expect(body).toEqual({ dryRun: false, customerId: "77" });
  });

  it("recorta el espacio en blanco alrededor de los valores", () => {
    expect(
      buildRuntimeJobBody(
        jobOrThrow("process-outbox"),
        form({ limit: "  7 " }),
      ),
    ).toEqual({ dryRun: true, limit: 7 });
  });
});

describe("catálogo de jobs de runtime", () => {
  it("marca como destructivos exactamente los jobs que borran, anonimizan o expiran", () => {
    // Si un job deja de estar marcado como destructivo, pierde la doble
    // confirmación tecleada. Este test es el que impide que eso pase inadvertido.
    expect(jobOrThrow("expire-stale-sessions").destructive).toBe(true);
    expect(jobOrThrow("apply-retention-policies").destructive).toBe(true);
    expect(jobOrThrow("process-outbox").destructive).toBe(false);
    expect(jobOrThrow("process-events").destructive).toBe(false);
    expect(jobOrThrow("recalculate-data-quality").destructive).toBe(false);
  });

  it("devuelve undefined para un código desconocido", () => {
    expect(findRuntimeJob("no-existe")).toBeUndefined();
  });

  /**
   * El tope no es global: el backend admite 500 mensajes de outbox pero 10 000
   * claves de idempotencia. Con un único esquema, el formulario bloqueaba una
   * ejecución que el backend acepta.
   */
  it("valida cada campo con el rango de SU job", () => {
    expect(
      schemaFor("purge-idempotency-keys").safeParse(form({ limit: "5000" }))
        .success,
    ).toBe(true);
    expect(
      schemaFor("process-outbox").safeParse(form({ limit: "5000" })).success,
    ).toBe(false);
    expect(
      schemaFor("mark-abandoned-onboardings").safeParse(
        form({ olderThanDays: "366" }),
      ).success,
    ).toBe(false);
  });

  /** Su cuerpo se valida en modo estricto: un `dryRun` de más sería un 400. */
  it("no manda dryRun al job que no lo admite", () => {
    expect(
      buildRuntimeJobBody(
        jobOrThrow("mark-abandoned-onboardings"),
        form({ olderThanDays: "45", limit: "100" }),
      ),
    ).toEqual({ olderThanDays: 45, limit: 100 });
  });

  it("los jobs de purga piden doble confirmación", () => {
    expect(jobOrThrow("purge-idempotency-keys").destructive).toBe(true);
    expect(jobOrThrow("purge-processed-outbox").destructive).toBe(true);
    expect(jobOrThrow("retry-stuck-notifications").destructive).toBe(false);
  });

  /** El único job que no cuelga de `/operations/jobs` lo declara en su ruta. */
  it("declara la ruta propia del cierre de onboardings abandonados", () => {
    expect(jobOrThrow("mark-abandoned-onboardings").path).toBe(
      "/customer-onboarding/jobs/mark-abandoned",
    );
  });
});
