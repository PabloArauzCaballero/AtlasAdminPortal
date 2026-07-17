import { z } from "zod";
import {
  codeField,
  jsonRecordSchema,
  positiveIdField,
} from "./catalog-schema-primitives";

/**
 * Réplica cliente de `definitionsPackageSchema` del backend. A diferencia de
 * los otros esquemas de este módulo, éste NO valida un formulario: valida el
 * paquete JSON que el operador pega en el editor, así que sigue la forma exacta
 * del body (incluidos los `default([])`) y no una versión "aplanada" en strings.
 *
 * Es un import masivo (4 arrays de hasta 300 definiciones, ~20 campos cada
 * una): armar un formulario de 20 campos × 300 filas sería deshonesto sobre lo
 * que hace el endpoint. El editor valida acá y muestra la ruta exacta del
 * campo que falla antes de mandar nada.
 */

const definitionBase = z.object({
  description: z.string().max(2000).optional(),
  dataType: z.string().min(2).max(40).optional(),
  riskDimension: z.string().min(2).max(60).optional(),
  buildPhase: z.string().min(2).max(40).optional(),
  dataClassificationCode: z.string().min(2).max(80).optional(),
  requiresConsent: z.boolean().optional(),
  isSensitive: z.boolean().optional(),
  allowedForCreditDecision: z.boolean().optional(),
  allowedForFraudDecision: z.boolean().optional(),
  legalReviewStatus: z.string().min(2).max(40).optional(),
  fairnessReviewRequired: z.boolean().optional(),
  retentionPolicyId: positiveIdField.optional(),
});

const eventDefinition = definitionBase.extend({
  eventCode: codeField,
  eventName: z.string().min(1).max(180),
  eventFamily: z.string().min(2).max(80).optional(),
  sourcePackage: z.string().min(2).max(120).optional(),
  targetTables: z.array(z.string().min(2).max(120)).optional().default([]),
  expectedPayloadSchema: jsonRecordSchema.optional().default({}),
  isHighVolume: z.boolean().optional(),
});

const observationDefinition = definitionBase.extend({
  observationCode: codeField,
  observationName: z.string().min(1).max(180),
  sourceGroup: z.string().min(2).max(60).optional(),
  expectedAvailabilityStage: z.string().min(2).max(40).optional(),
});

const attributeDefinition = definitionBase.extend({
  attributeCode: codeField,
  attributeName: z.string().min(1).max(180),
  entityScope: z.string().min(2).max(60).optional(),
  sourceType: z.string().min(2).max(60).optional(),
  availabilityStage: z.string().min(2).max(40).optional(),
  isModelCandidate: z.boolean().optional(),
});

const featureDefinition = definitionBase.extend({
  featureCode: codeField,
  featureName: z.string().min(1).max(180),
  featureFamily: z.string().min(2).max(80).optional(),
  availabilityTier: z.string().min(2).max(40).optional(),
  calculationKind: z.string().min(2).max(60).optional(),
  defaultMissingStrategy: z.string().min(2).max(80).optional(),
  isModelInput: z.boolean().optional(),
  isPolicyRuleInput: z.boolean().optional(),
  ownerTeam: z.string().min(2).max(80).optional(),
});

export const definitionsPackageSchema = z.object({
  domain: z.string().min(2).max(80),
  definitions: z.object({
    events: z.array(eventDefinition).max(300).optional().default([]),
    observations: z
      .array(observationDefinition)
      .max(300)
      .optional()
      .default([]),
    attributes: z.array(attributeDefinition).max(300).optional().default([]),
    features: z.array(featureDefinition).max(300).optional().default([]),
  }),
});

export type DefinitionsPackageInput = z.infer<typeof definitionsPackageSchema>;

/** Plantilla mínima válida para arrancar el editor sin adivinar la forma. */
export const definitionsPackageTemplate = JSON.stringify(
  {
    domain: "risk",
    definitions: {
      events: [
        {
          eventCode: "login.attempt",
          eventName: "Intento de login",
          eventFamily: "auth",
          riskDimension: "identity",
          isHighVolume: true,
        },
      ],
      observations: [],
      attributes: [],
      features: [],
    },
  },
  null,
  2,
);
