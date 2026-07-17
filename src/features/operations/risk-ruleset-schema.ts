import { z } from "zod";
import {
  codeField,
  isoDateTimeField,
  jsonRecordSchema,
} from "./catalog-schema-primitives";

/**
 * Réplica cliente de `createRiskRulesetVersionSchema` y
 * `activateRiskRulesetVersionSchema` del backend.
 *
 * El alta de ruleset valida el paquete JSON del editor (modelo + ruleset +
 * hasta 500 reglas con `expressionJson` arbitrario + hasta 500 señales): una
 * regla lleva una expresión JSON libre, así que no hay formulario honesto que
 * la capture campo por campo.
 *
 * La activación, en cambio, sí es un formulario: dos campos y una consecuencia
 * real (cambia la política de riesgo vigente). El `min(5)` de
 * `activationReason` es del backend y se exige al operador — no se rellena solo.
 */

const riskRule = z.object({
  ruleCode: codeField,
  ruleName: z.string().min(1).max(180),
  riskDimension: z.string().min(2).max(60),
  ruleType: z.string().min(2).max(60),
  severity: z.string().min(2).max(40),
  expressionJson: jsonRecordSchema,
  actionCode: z.string().min(2).max(80),
  reasonCode: z.string().min(2).max(100),
  isHardStop: z.boolean().optional().default(false),
});

const riskSignalSeed = z.object({
  signalCode: codeField,
  signalName: z.string().min(1).max(180),
  signalType: z.string().min(2).max(60),
  sourceEntity: z.string().min(2).max(120),
  targetDefinitionCode: codeField.optional(),
  riskDimension: z.string().min(2).max(60).optional(),
  buildPhase: z.string().min(2).max(40).optional(),
  priority: z.string().min(2).max(40).optional(),
  expectedDirection: z.string().min(2).max(40).optional(),
  exampleValue: jsonRecordSchema.optional().default({}),
  rationale: z.string().max(2000).optional(),
});

export const createRiskRulesetVersionSchema = z.object({
  modelVersion: z.object({
    modelCode: codeField,
    versionCode: z.string().min(2).max(80),
    modelType: z.string().min(2).max(60).optional().default("rules"),
    assessmentType: z.string().min(2).max(80),
    status: z.enum(["draft", "inactive"]).optional().default("draft"),
    artifactUrl: z.string().url().optional(),
    artifactHash: z.string().max(128).optional(),
  }),
  ruleset: z.object({
    rulesetCode: codeField,
    versionCode: z.string().min(2).max(80),
    assessmentType: z.string().min(2).max(80),
    status: z.enum(["draft", "inactive"]).optional().default("draft"),
  }),
  rules: z.array(riskRule).min(1).max(500),
  riskSignalSeeds: z.array(riskSignalSeed).max(500).optional().default([]),
});

export type CreateRiskRulesetVersionInput = z.infer<
  typeof createRiskRulesetVersionSchema
>;

/** Formulario de activación (no es un paquete JSON: son dos campos reales). */
export const activateRulesetFormSchema = z.object({
  activationReason: z
    .string()
    .trim()
    .min(
      5,
      "Obligatorio: mínimo 5 caracteres. Queda como justificación de la activación.",
    )
    .max(3000, "Máximo 3000 caracteres."),
  effectiveFrom: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || isoDateTimeField.safeParse(value).success,
      "Debe ser una fecha y hora ISO 8601 (ej: 2026-07-17T10:30:00Z). Vacío = ahora.",
    ),
});

export type ActivateRulesetForm = z.infer<typeof activateRulesetFormSchema>;

export const emptyActivateRulesetForm: ActivateRulesetForm = {
  activationReason: "",
  effectiveFrom: "",
};

/** Plantilla mínima válida para arrancar el editor sin adivinar la forma. */
export const riskRulesetPackageTemplate = JSON.stringify(
  {
    modelVersion: {
      modelCode: "fraud.rules",
      versionCode: "2026.07",
      modelType: "rules",
      assessmentType: "fraud",
      status: "draft",
    },
    ruleset: {
      rulesetCode: "fraud.default",
      versionCode: "2026.07",
      assessmentType: "fraud",
      status: "draft",
    },
    rules: [
      {
        ruleCode: "velocity.high",
        ruleName: "Velocidad de intentos alta",
        riskDimension: "behavior",
        ruleType: "threshold",
        severity: "high",
        expressionJson: { field: "attempts_1h", op: "gt", value: 10 },
        actionCode: "review",
        reasonCode: "VELOCITY_HIGH",
        isHardStop: false,
      },
    ],
    riskSignalSeeds: [],
  },
  null,
  2,
);
